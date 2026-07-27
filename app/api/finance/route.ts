import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

export async function GET() {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, householdId } = context;
  const [accounts, transactions, categories, budgets, goals, debts, recurring, transfers] = await Promise.all([
    supabase.from("accounts").select("*").eq("household_id", householdId).eq("archived", false).order("created_at"),
    supabase.from("transactions").select("*,categories(name)").eq("household_id", householdId).order("booked_at", { ascending: false }).limit(200),
    supabase.from("categories").select("*").eq("household_id", householdId).order("name"),
    supabase.from("budgets").select("*,categories(name,color,icon)").eq("household_id", householdId),
    supabase.from("goals").select("*").eq("household_id", householdId).order("created_at"),
    supabase.from("debts").select("*").eq("household_id", householdId).eq("settled", false),
    supabase.from("recurring_rules").select("*").eq("household_id", householdId).eq("active", true),
    supabase.from("transfers").select("*").eq("household_id", householdId).order("booked_at", { ascending: false }).limit(100),
  ]);
  const error = [accounts, transactions, categories, budgets, goals, debts, recurring, transfers].find(result => result.error)?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    accounts: accounts.data, transactions: transactions.data, categories: categories.data,
    budgets: budgets.data, goals: goals.data, debts: debts.data, recurring: recurring.data, transfers: transfers.data,
  });
}

export async function POST(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, user, householdId } = context;
  const body = await request.json();
  let result;
  switch (body.action) {
    case "createAccount":
      result = await supabase.from("accounts").insert({
        household_id: householdId, created_by: user.id, name: String(body.name).slice(0, 80),
        bank: String(body.bank || "").slice(0, 80), owner_label: String(body.owner || "").slice(0, 80),
        currency: String(body.currency || "UAH").toUpperCase().slice(0, 3), balance: Number(body.balance) || 0,
      }).select().single();
      break;
    case "deleteAccount":
      result = await supabase.from("accounts").update({ archived: true }).eq("id", body.id).eq("household_id", householdId);
      break;
    case "createTransaction":
      result = await supabase.rpc("create_finance_transaction", {
        p_account_id: body.accountId, p_category_id: body.categoryId || null, p_type: body.type === "income" ? "income" : "expense",
        p_amount: Number(body.amount), p_currency: body.currency, p_note: String(body.note || "").slice(0, 500),
        p_booked_at: body.bookedAt || new Date().toISOString(), p_is_impulsive: Boolean(body.isImpulsive),
        p_split_total: body.splitTotal ? Number(body.splitTotal) : null, p_personal_share: body.personalShare ? Number(body.personalShare) : null,
      });
      break;
    case "deleteTransaction":
      result = await supabase.rpc("delete_finance_transaction", { p_transaction_id: body.id });
      break;
    case "createTransfer":
      result = await supabase.rpc("create_account_transfer", {
        p_from_account_id: body.fromAccountId, p_to_account_id: body.toAccountId,
        p_sent_amount: Number(body.sentAmount), p_received_amount: Number(body.receivedAmount),
        p_exchange_rate: Number(body.exchangeRate) || 1, p_fee_amount: Number(body.feeAmount) || 0,
        p_fee_currency: body.feeCurrency || null, p_note: String(body.note || "").slice(0, 500),
      });
      break;
    case "createBudget":
      result = await supabase.from("budgets").upsert({
        household_id: householdId, category_id: body.categoryId, month: body.month,
        limit_amount: Number(body.limitAmount), currency: String(body.currency || "UAH"), created_by: user.id,
      }, { onConflict: "household_id,category_id,month" }).select().single();
      break;
    case "createGoal":
      result = await supabase.from("goals").insert({
        household_id: householdId, name: String(body.name).slice(0,100), target_amount:Number(body.targetAmount),
        current_amount:Number(body.currentAmount)||0, currency:String(body.currency||"UAH"), target_date:body.targetDate||null,
        color:body.color||"#6558E8", created_by:user.id,
      }).select().single();
      break;
    case "contributeGoal":
      result = await supabase.rpc("contribute_to_goal",{p_goal_id:body.id,p_amount:Number(body.amount)});
      break;
    case "createDebt":
      result = await supabase.from("debts").insert({
        household_id:householdId,person:String(body.person).slice(0,100),direction:body.direction==="i_owe"?"i_owe":"owed_to_me",
        amount:Number(body.amount),currency:String(body.currency||"UAH"),due_date:body.dueDate||null,
        note:String(body.note||"").slice(0,500),created_by:user.id,
      }).select().single();
      break;
    case "settleDebt":
      result = await supabase.from("debts").update({settled:true}).eq("id",body.id).eq("household_id",householdId);
      break;
    case "createRecurring":
      result = await supabase.from("recurring_rules").insert({
        household_id:householdId,account_id:body.accountId,category_id:body.categoryId||null,
        name:String(body.name).slice(0,100),amount:Number(body.amount),currency:String(body.currency),
        frequency:body.frequency||"monthly",next_run_at:body.nextRunAt,auto_create:Boolean(body.autoCreate),created_by:user.id,
      }).select().single();
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ data: result.data });
}
