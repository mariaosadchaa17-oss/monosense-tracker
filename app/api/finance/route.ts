import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

export async function GET() {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, householdId } = context;
  const [accounts, transactions, categories, budgets, goals, debts, recurring, transfers, audit,exchangeRates] = await Promise.all([
    supabase.from("accounts").select("*").eq("household_id", householdId).eq("archived", false).order("created_at"),
    supabase.from("transactions").select("*,categories(name),accounts(name,owner_label),transaction_tags(tags(name))").eq("household_id", householdId).order("booked_at", { ascending: false }).limit(200),
    supabase.from("categories").select("*").eq("household_id", householdId).order("name"),
    supabase.from("budgets").select("*,categories(name,color,icon)").eq("household_id", householdId),
    supabase.from("goals").select("*").eq("household_id", householdId).order("created_at"),
    supabase.from("debts").select("*").eq("household_id", householdId).eq("settled", false),
    supabase.from("recurring_rules").select("*").eq("household_id", householdId).eq("active", true),
    supabase.from("transfers").select("*").eq("household_id", householdId).order("booked_at", { ascending: false }).limit(100),
    supabase.from("audit_logs").select("*").eq("household_id",householdId).order("created_at",{ascending:false}).limit(100),
    supabase.from("exchange_rates").select("*").eq("household_id",householdId).order("rate_date",{ascending:false}).limit(20),
  ]);
  const error = [accounts, transactions, categories, budgets, goals, debts, recurring, transfers, audit,exchangeRates].find(result => result.error)?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    accounts: accounts.data, transactions: transactions.data, categories: categories.data,
    budgets: budgets.data, goals: goals.data, debts: debts.data, recurring: recurring.data, transfers: transfers.data, audit: audit.data,exchangeRates:exchangeRates.data,
  });
}

export async function POST(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.role === "viewer") return NextResponse.json({ error: "Роль глядача дозволяє лише перегляд" }, { status: 403 });
  const { supabase, user, householdId } = context;
  const body = await request.json();
  if(body.action==="createTransaction"&&Number(body.splitTotal)>0&&(Number(body.personalShare)<0||Number(body.personalShare)>Number(body.splitTotal)))return NextResponse.json({error:"Особиста частка має бути від 0 до загальної суми"},{status:400});
  let result;
  switch (body.action) {
    case "createAccount":
      result = await supabase.from("accounts").insert({
        household_id: householdId, created_by: user.id, name: String(body.name).slice(0, 80),
        bank: String(body.bank || "").slice(0, 80), owner_label: String(body.owner || "").slice(0, 80),
        currency: String(body.currency || "UAH").toUpperCase().slice(0, 3), balance: Number(body.balance) || 0,
        credit_limit:Number(body.creditLimit)||0,grace_period_end:body.graceEnd||null,
      }).select().single();
      break;
    case "updateAccount":
      result=await supabase.from("accounts").update({
        name:String(body.name).slice(0,80),bank:String(body.bank||"").slice(0,80),owner_label:String(body.owner||"").slice(0,80),
        currency:String(body.currency||"UAH").toUpperCase().slice(0,3),balance:Number(body.balance)||0,
        credit_limit:Number(body.creditLimit)||0,grace_period_end:body.graceEnd||null,updated_at:new Date().toISOString(),
      }).eq("id",body.id).eq("household_id",householdId).select().single();
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
    case "createCategory":
      result = await supabase.from("categories").insert({
        household_id:householdId,name:String(body.name).slice(0,60),icon:String(body.icon||"CircleDollarSign").slice(0,60),
        color:String(body.color||"#6558E8").slice(0,20),kind:body.kind==="income"?"income":"expense",created_by:user.id,
      }).select().single();
      break;
    case "createCustomRate":
      result=await supabase.from("exchange_rates").upsert({
        household_id:householdId,rate_date:body.date||new Date().toISOString().slice(0,10),base_currency:String(body.baseCurrency||"UAH").toUpperCase().slice(0,3),
        quote_currency:String(body.quoteCurrency||"USD").toUpperCase().slice(0,3),official_rate:Number(body.rate),custom_rate:Number(body.rate),source:"CUSTOM",
      },{onConflict:"rate_date,quote_currency,household_id"}).select().single();
      break;
    case "deleteCategory":
      result = await supabase.from("categories").delete().eq("id",body.id).eq("household_id",householdId);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  if (body.action === "createTransaction" && result.data?.id && Array.isArray(body.tags)) {
    for (const rawTag of body.tags.slice(0, 10)) {
      const name = String(rawTag).replace(/^#/, "").trim().toLowerCase().slice(0, 40);
      if (!name) continue;
      const { data: tag } = await supabase.from("tags").upsert(
        { household_id: householdId, name }, { onConflict: "household_id,name" }
      ).select("id").single();
      if (tag) await supabase.from("transaction_tags").insert({ transaction_id: result.data.id, tag_id: tag.id });
    }
  }
  if(body.action==="createTransaction"&&result.data?.id&&Number(body.splitTotal)>0&&Number(body.personalShare)>=0){
    const total=Number(body.splitTotal),mine=Number(body.personalShare);
    const people=Array.isArray(body.splitParticipants)?body.splitParticipants.map((value:unknown)=>String(value).trim().slice(0,80)).filter(Boolean).slice(0,20):[];
    const otherShare=people.length?(total-mine)/people.length:0;
    const splits=[{transaction_id:result.data.id,participant:"Я",amount:mine,is_mine:true},...people.map((participant:string)=>({transaction_id:result.data.id,participant,amount:Number(otherShare.toFixed(2)),is_mine:false}))];
    const {error:splitError}=await supabase.from("transaction_splits").insert(splits);
    if(splitError)return NextResponse.json({error:splitError.message},{status:400});
  }
  if(body.action==="createTransaction"&&result.data?.id&&body.repeat){
    const frequency=["weekly","monthly","yearly"].includes(body.repeatFrequency)?body.repeatFrequency:"monthly",next=new Date(body.bookedAt||Date.now());
    if(frequency==="weekly")next.setDate(next.getDate()+7);else if(frequency==="yearly")next.setFullYear(next.getFullYear()+1);else{next.setMonth(next.getMonth()+1);const day=Math.min(28,Math.max(1,Number(body.repeatDay)||next.getDate()));next.setDate(day)}
    const {error:repeatError}=await supabase.from("recurring_rules").insert({household_id:householdId,account_id:body.accountId,category_id:body.categoryId||null,name:String(body.note||"Регулярна витрата").slice(0,100),amount:Number(body.amount),currency:String(body.currency),frequency,next_run_at:next.toISOString(),auto_create:false,created_by:user.id});
    if(repeatError)return NextResponse.json({error:repeatError.message},{status:400});
  }
  return NextResponse.json({ data: result.data });
}
