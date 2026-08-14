import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";

const CURRENCY_MAP: Record<number, string> = { 980: "UAH", 840: "USD", 978: "EUR", 826: "GBP", 985: "PLN" };

export async function POST(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const token = String(body.token || "").trim();
  if (!token) return NextResponse.json({ error: "Токен не вказано" }, { status: 400 });

  let infoResponse: Response;
  try {
    infoResponse = await fetch("https://api.monobank.ua/personal/client-info", { headers: { "X-Token": token } });
  } catch {
    return NextResponse.json({ error: "Не вдалося з'єднатись з Monobank" }, { status: 502 });
  }
  if (!infoResponse.ok) {
    const text = await infoResponse.text();
    return NextResponse.json({ error: `Monobank: ${text.slice(0, 200)}` }, { status: 400 });
  }
  const info = await infoResponse.json();

  const accounts = (info.accounts || []).map((account: { id: string; type: string; currencyCode: number; balance: number; creditLimit: number; maskedPan?: string[] }) => ({
    id: account.id,
    type: account.type,
    currency: CURRENCY_MAP[account.currencyCode] || String(account.currencyCode),
    balance: account.balance / 100,
    creditLimit: account.creditLimit / 100,
    maskedPan: account.maskedPan?.[0] || "",
  }));

  const admin = createAdminClient();
  await admin.from("monobank_connections").upsert(
      { household_id: context.householdId, token, connected_by: context.user.id, accounts_json: accounts },
      { onConflict: "household_id" }
  );

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  await fetch("https://api.monobank.ua/personal/webhook", {
    method: "POST",
    headers: { "X-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ webHookUrl: `${origin}/api/monobank/webhook` }),
  }).catch(() => {});

  return NextResponse.json({ accounts });
}
