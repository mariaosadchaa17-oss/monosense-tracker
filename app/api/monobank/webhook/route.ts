
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let payload: { type?: string; data?: { account?: string; statementItem?: { id: string; time: number; description?: string; amount: number } } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (payload.type !== "StatementItem" || !payload.data?.statementItem || !payload.data.account) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const item = payload.data.statementItem;
  const monoAccountId = payload.data.account;

  const { data: alreadySynced } = await admin.from("monobank_synced_items").select("statement_item_id").eq("statement_item_id", item.id).maybeSingle();
  if (alreadySynced) return NextResponse.json({ ok: true });

  const { data: link } = await admin
    .from("monobank_account_links")
    .select("app_account_id")
    .eq("mono_account_id", monoAccountId)
    .maybeSingle();
  if (!link) return NextResponse.json({ ok: true });

  const { data: account } = await admin.from("accounts").select("id,currency").eq("id", link.app_account_id).maybeSingle();
  if (!account) return NextResponse.json({ ok: true });

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

  return NextResponse.json({ ok: true });
}
