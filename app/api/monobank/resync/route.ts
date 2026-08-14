import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { categorizeMonobankItems } from "@/lib/monobank/categorize";

type MonoItem = { id: string; time: number; description?: string; amount: number };
type FlatItem = { monoAccountId: string; appAccountId: string; currency: string; item: MonoItem };

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

    const { data: accountRows } = await admin
        .from("accounts")
        .select("id,currency")
        .in("id", links.map((l) => l.app_account_id));
    const accountById = new Map((accountRows || []).map((a) => [a.id, a]));

    const debug: { monoAccountId: string; status?: number; error?: string; itemsFound?: number }[] = [];
    const to = Math.floor(Date.now() / 1000);
    const from = to - 31 * 24 * 60 * 60;

    const flatItems: FlatItem[] = [];

    for (const link of links) {
        const account = accountById.get(link.app_account_id);
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

        const items: MonoItem[] = await statementResponse.json();
        debug.push({
            monoAccountId: link.mono_account_id,
            status: statementResponse.status,
            itemsFound: items.length,
        });

        for (const item of items) {
            const { data: alreadySynced } = await admin
                .from("monobank_synced_items")
                .select("statement_item_id")
                .eq("statement_item_id", item.id)
                .maybeSingle();
            if (alreadySynced && !force) continue;

            flatItems.push({ monoAccountId: link.mono_account_id, appAccountId: link.app_account_id, currency: account.currency, item });
        }
    }

    const used = new Set<string>();
    let imported = 0;

    // 1. Шукаємо пари "переказ між своїми картками"
    for (const outgoing of flatItems) {
        if (used.has(outgoing.item.id)) continue;
        if (outgoing.item.amount >= 0) continue;

        const match = flatItems.find(
            (candidate) =>
                !used.has(candidate.item.id) &&
                candidate.item.id !== outgoing.item.id &&
                candidate.appAccountId !== outgoing.appAccountId &&
                candidate.currency === outgoing.currency &&
                candidate.item.amount === Math.abs(outgoing.item.amount) &&
                Math.abs(candidate.item.time - outgoing.item.time) <= 300
        );
        if (!match) continue;

        used.add(outgoing.item.id);
        used.add(match.item.id);

        const amount = Math.abs(outgoing.item.amount) / 100;
        const bookedAt = new Date(outgoing.item.time * 1000).toISOString();

        const { data: fromTx, error: fromError } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: connection.connected_by,
            p_account_id: outgoing.appAccountId,
            p_category_id: null,
            p_type: "transfer",
            p_amount: amount,
            p_currency: outgoing.currency,
            p_note: "Переказ",
            p_booked_at: bookedAt,
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (fromError) {
            debug.push({ monoAccountId: outgoing.monoAccountId, error: `RPC (переказ, звідки): ${fromError.message}` });
            continue;
        }

        const { data: toTx, error: toError } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: connection.connected_by,
            p_account_id: match.appAccountId,
            p_category_id: null,
            p_type: "income",
            p_amount: amount,
            p_currency: match.currency,
            p_note: "Поповнення переказом",
            p_booked_at: bookedAt,
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (toError) {
            debug.push({ monoAccountId: match.monoAccountId, error: `RPC (переказ, куди): ${toError.message}` });
            continue;
        }

        await admin.from("transactions").update({ type: "transfer" }).eq("id", toTx.id);
        await admin.from("transfers").insert({
            household_id: context.householdId,
            from_transaction_id: fromTx.id,
            to_transaction_id: toTx.id,
            fee_amount: 0,
            fee_currency: null,
            booked_at: bookedAt,
        });
        await admin.from("monobank_synced_items").insert([
            { statement_item_id: outgoing.item.id, transaction_id: fromTx.id },
            { statement_item_id: match.item.id, transaction_id: toTx.id },
        ]);

        imported += 2;
    }

    // 2. Решта — звичайні операції з підбором категорії
    const remaining = flatItems.filter((f) => !used.has(f.item.id));
    const byAccount = new Map<string, FlatItem[]>();
    for (const f of remaining) {
        if (!byAccount.has(f.appAccountId)) byAccount.set(f.appAccountId, []);
        byAccount.get(f.appAccountId)!.push(f);
    }

    for (const [appAccountId, items] of byAccount) {
        const account = accountById.get(appAccountId)!;
        const categoryNameByItemId = await categorizeMonobankItems(
            items.map((f) => ({
                id: f.item.id,
                description: f.item.description || "",
                type: f.item.amount < 0 ? "expense" : "income",
            })),
            categories || []
        );

        for (const f of items) {
            const amount = f.item.amount / 100;
            const type = amount < 0 ? "expense" : "income";
            const categoryName = categoryNameByItemId[f.item.id];
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
                p_note: f.item.description || "Monobank",
                p_booked_at: new Date(f.item.time * 1000).toISOString(),
                p_is_impulsive: false,
                p_split_total: null,
                p_personal_share: null,
            });

            if (txError) {
                debug.push({ monoAccountId: f.monoAccountId, error: `RPC: ${txError.message}` });
                continue;
            }

            await admin.from("monobank_synced_items").insert({
                statement_item_id: f.item.id,
                transaction_id: transaction?.id || null,
            });

            imported++;
        }
    }

    if (imported > 0) {
        await admin
            .from("monobank_connections")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("household_id", context.householdId);
    }

    return NextResponse.json({ imported, debug });
}