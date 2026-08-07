import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

export async function GET() {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, householdId } = context;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data, error } = await supabase
    .from("transaction_splits")
    .select("participant,amount,is_mine,transactions!inner(household_id,booked_at,currency,note)")
    .eq("transactions.household_id", householdId)
    .gte("transactions.booked_at", monthStart);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const byParticipant: Record<string, number> = {};
  (data || []).forEach((row: Record<string, unknown>) => {
    if (row.is_mine) return;
    const name = String(row.participant);
    byParticipant[name] = (byParticipant[name] || 0) + Number(row.amount);
  });
  return NextResponse.json({ balances: Object.entries(byParticipant).map(([person, amount]) => ({ person, amount })) });
}
