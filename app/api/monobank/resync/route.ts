import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { categorizeMonobankItems } from "@/lib/monobank/categorize";

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const force = Boolean(body.force);
    const context = await getFinanceContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: connection } = await admin
        .from("monobank_connections")
        .select("token,connected_by")
        .eq("household_id", context.householdId)
        .maybeSingle();
    if (!connection?.token) {
        return NextResponse.json(
            { error: "Monobank ще не підключено — спочатку встав токен вище" },
            { status: 400 }
        );
    }

    const { data: links } = await admin
        .from("monobank_account_links")
        .select("mono_account_id,app_account_id")
        .eq("household_id", context.householdId);
    if (!links?.length) {
        return NextResponse.json({ error: "Немає прив'язаних карток" }, { status: 400 });
    }

    const { data: categories } = await admin
        .from("categories")
        .select("id,name,kind")
        .eq("household_id", context.householdId);

    let imported = 0;
    const debug: { monoAccountId: string; status?: number; error?: string; itemsFound?: number }[] = [];
    const to = Math.floor(Date.now() / 1000);
    const from = to - 31 * 24 * 60 * 60;

    for (const link of links) {
        const { data: account } = await admin
            .from("accounts")
            .select("id,currency")
            .eq("id", link.app_account_id)
            .maybeSingle();

        if (!account) {
            debug.push({ monoAccountId: link.mono_account_id, error: "рахунок у застосунку не знайдено" });
            continue;
        }

        let statementResponse: Response;
        try {
            statementResponse = await fetch(
                `https://api.monobank.ua/personal/statement/${link.mono_account_id}/${from}/${to}`,
                { headers: { "X-Token": connection.token } }
            );
        } catch {
            debug.push({ monoAccountId: link.mono_account_id, error: "немає з'єднання з Monobank" });
            continue;
        }

        if (!statementResponse.ok) {
            const text = await statementResponse.text().catch(() => "");
            debug.push({
                monoAccountId: link.mono_account_id,
                status: statementResponse.status,
                error: text.slice(0, 150),
            });
            continue;
        }

        const items: { id: string; time: number; description?: string; amount: number }[] =
            await statementResponse.json();

        debug.push({
            monoAccountId: link.mono_account_id,
            status: statementResponse.status,
            itemsFound: items.length,
        });

        const categoryNameByItemId = await categorizeMonobankItems(
            items.map((item) => ({
                id: item.id,
                description: item.description || "",
                type: item.amount < 0 ? "expense" : "income",
            })),
            categories || []
        );

        for (const item of items) {
            const { data: alreadySynced } = await admin
                .from("monobank_synced_items")
                .select("statement_item_id")
                .eq("statement_item_id", item.id)
                .maybeSingle();

            if (alreadySynced && !force) continue;

            const amount = item.amount / 100;
            const type = amount < 0 ? "expense" : "income";
            const categoryName = categoryNameByItemId[item.id];
            const category = (categories || []).find(
                (c) => c.kind === type && c.name.toLowerCase() === (categoryName || "").toLowerCase()
            );

            const { data: transaction, error: txError } = await admin.rpc("create_finance_transaction_admin", {
                p_user_id: connection.connected_by,
                p_account_id: account.id,
                p_category_id: category?.id || null,
                p_type: type,
                p_amount: Math.abs(amount),
                p_currency: account.currency,
                p_note: item.description || "Monobank",
                p_booked_at: new Date(item.time * 1000).toISOString(),
                p_is_impulsive: false,
                p_split_total: null,
                p_personal_share: null,
            });

            if (txError) {
                debug.push({ monoAccountId: link.mono_account_id, error: `RPC: ${txError.message}` });
                continue;
            }

            await admin.from("monobank_synced_items").insert({
                statement_item_id: item.id,
                transaction_id: transaction?.id || null,
            });

            imported++;
        }
    }

    return NextResponse.json({ imported, debug });
}