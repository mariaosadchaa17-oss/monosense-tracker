import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const monoAccountId = String(body.monoAccountId || "").trim();
  if (!monoAccountId) return NextResponse.json({ error: "Не вказано рахунок Monobank" }, { status: 400 });

  const admin = createAdminClient();
  let appAccountId = String(body.appAccountId || "").trim();

  if (body.createNew) {
    const { data: newAccount, error: createError } = await admin
        .from("accounts")
        .insert({
          household_id: context.householdId,
          created_by: context.user.id,
          name: String(body.name || "Monobank").slice(0, 80),
          bank: "monobank",
          owner_label: "Мій",
          currency: String(body.currency || "UAH").slice(0, 3),
          balance: Number(body.balance) || 0,
          credit_limit: Number(body.creditLimit) || 0,
          card_color: "#000000",
        })
        .select()
        .single();
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
    appAccountId = newAccount.id;
  }

  if (!appAccountId) return NextResponse.json({ error: "Не вказано рахунок" }, { status: 400 });

  const { error: linkError } = await admin.from("monobank_account_links").upsert(
      { household_id: context.householdId, mono_account_id: monoAccountId, app_account_id: appAccountId },
      { onConflict: "household_id,mono_account_id" }
  );
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 });

  const { data: connection } = await admin.from("monobank_connections").select("token").eq("household_id", context.householdId).maybeSingle();
  const { data: account } = await admin.from("accounts").select("id,currency").eq("id", appAccountId).maybeSingle();

  let imported = 0;
  if (connection?.token && account) {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 31 * 24 * 60 * 60;
    try {
      const statementResponse = await fetch(`https://api.monobank.ua/personal/statement/${monoAccountId}/${from}/${to}`, {
        headers: { "X-Token": connection.token },
      });
      if (statementResponse.ok) {
        const items: { id: string; time: number; description?: string; amount: number }[] = await statementResponse.json();
        for (const item of items) {
          const { data: alreadySynced } = await admin.from("monobank_synced_items").select("statement_item_id").eq("statement_item_id", item.id).maybeSingle();
          if (alreadySynced) continue;
          const amount = item.amount / 100;
          const type = amount < 0 ? "expense" : "income";
          const { data: transaction } = await admin.rpc("create_finance_transaction", {
            p_account_id: account.id,
            p_category_id: null,
            p_type: type,
            p_amount: Math.abs(amount),
            p_currency: account.currency,
            p_note: item.description || "Monobank",
            p_booked_at: new Date(item.time * 1000).toISOString(),
            p_is_impulsive: false,
          });
          await admin.from("monobank_synced_items").insert({ statement_item_id: item.id, transaction_id: transaction?.id || null });
          imported++;
        }
      }
    } catch {
      // мовчки пропускаємо — вебхук все одно підхопить нові операції
    }
  }

  return NextResponse.json({ ok: true, appAccountId, imported });
}