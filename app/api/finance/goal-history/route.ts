import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

export async function GET(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, householdId } = context;
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");
  if (!goalId) return NextResponse.json({ error: "goalId required" }, { status: 400 });
  const { data, error } = await supabase.from("goal_transactions").select("*").eq("goal_id", goalId).eq("household_id", householdId).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ transactions: data });
}
