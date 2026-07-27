import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function parseCsvLine(line: string) {
  const result: string[] = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const text = await request.text();
  if (text.length > 5_000_000) return NextResponse.json({ error: "Файл завеликий" }, { status: 413 });
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return NextResponse.json({ error: "CSV не містить даних" }, { status: 400 });
  const { data: membership } = await supabase.from("household_members").select("household_id").eq("user_id", auth.user.id).limit(1).single();
  if (!membership) return NextResponse.json({ error: "Простір не знайдено" }, { status: 422 });
  const { data: account } = await supabase.from("accounts").select("id,currency").eq("household_id", membership.household_id).limit(1).single();
  if (!account) return NextResponse.json({ error: "Спочатку створіть рахунок" }, { status: 422 });
  const rows = lines.slice(1, 2001).map(parseCsvLine).filter(row => row.length >= 4).map(row => ({
    household_id: membership.household_id, account_id: account.id, created_by: auth.user!.id,
    type: Number(row[3]) >= 0 ? "income" : "expense", amount: Math.abs(Number(String(row[3]).replace(",", "."))),
    currency: account.currency, note: row[0], booked_at: Number.isNaN(Date.parse(row[2])) ? new Date().toISOString() : new Date(row[2]).toISOString(),
  })).filter(row => Number.isFinite(row.amount) && row.amount > 0);
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: rows.length });
}
