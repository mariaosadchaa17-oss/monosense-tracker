import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

export async function GET() {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, householdId } = context;
  const [accounts, transactions, categories, budgets, goals, debts, recurring, transfers, audit,exchangeRates,profile,household,creditLimitChanges] = await Promise.all([    supabase.from("accounts").select("*").eq("household_id", householdId).eq("archived", false).order("created_at"),
    supabase.from("transactions").select("*,categories(name,icon),accounts(name,owner_label),transaction_tags(tags(name))").eq("household_id", householdId).order("booked_at", { ascending: false }).limit(200),
    supabase.from("categories").select("*").eq("household_id", householdId).order("name"),
    supabase.from("budgets").select("*,categories(name,color,icon)").eq("household_id", householdId),
    supabase.from("goals").select("*").eq("household_id", householdId).order("created_at"),
    supabase.from("debts").select("*").eq("household_id", householdId).eq("settled", false),
    supabase.from("recurring_rules").select("*").eq("household_id", householdId).eq("active", true),
    supabase.from("transfers").select("*").eq("household_id", householdId).order("booked_at", { ascending: false }).limit(500),
    supabase.from("audit_logs").select("*").eq("household_id",householdId).order("created_at",{ascending:false}).limit(100),
    supabase.from("exchange_rates").select("*").eq("household_id",householdId).order("rate_date",{ascending:false}).limit(20),
    supabase.from("profiles").select("planning_period,base_currency").eq("id",context.user.id).single(),
    supabase.from("households").select("base_currency").eq("id",householdId).single(),
  ]);
const error = [accounts, transactions, categories, budgets, goals, debts, recurring, transfers, audit,exchangeRates,profile,household,creditLimitChanges].find(result => result.error)?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    accounts: accounts.data, transactions: transactions.data, categories: categories.data,
    budgets: budgets.data, goals: goals.data, debts: debts.data, recurring: recurring.data, transfers: transfers.data, audit: audit.data,exchangeRates:exchangeRates.data,
    planningPeriod:profile.data?.planning_period==="week"?"week":"month",
    baseCurrency:String(household.data?.base_currency||profile.data?.base_currency||"UAH"),
        creditLimitChanges: creditLimitChanges.data,
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
            household_id: householdId, created_by: user.id, name: String(body.name).slice(0, 80),card_image_url:body.cardImageUrl||null,
            bank: String(body.bank || "").slice(0, 80), owner_label: String(body.owner || "").slice(0, 80),
            currency: String(body.currency || "UAH").toUpperCase().slice(0, 3), balance: Number(body.balance) || 0,
            credit_limit:Number(body.creditLimit)||0,grace_period_end:body.graceEnd||null,card_color:String(body.cardColor||"").slice(0,20)||null,
          }).select().single();
          break;
    case "updateAccount":
      result=await supabase.from("accounts").update({
        name:String(body.name).slice(0,80),bank:String(body.bank||"").slice(0,80),owner_label:String(body.owner||"").slice(0,80),card_image_url:body.cardImageUrl||null,
        currency:String(body.currency||"UAH").toUpperCase().slice(0,3),balance:Number(body.balance)||0,
        credit_limit:Number(body.creditLimit)||0,grace_period_end:body.graceEnd||null,card_color:String(body.cardColor||"").slice(0,20)||null,updated_at:new Date().toISOString(),
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
      if(!result.error&&body.debtId){
        const {data:debtRow}=await supabase.from("debts").select("amount").eq("id",body.debtId).eq("household_id",householdId).single();
        if(debtRow){
          const remaining=Math.max(0,Number(debtRow.amount)-Number(body.amount));
          await supabase.from("debts").update({amount:remaining,settled:remaining<=0}).eq("id",body.debtId).eq("household_id",householdId);
        }
      }
      if(!result.error&&result.data?.id){
        const { data: rules } = await supabase.from("transaction_rules").select("*").eq("household_id",householdId).eq("active",true);
        for(const rule of rules||[]){
          let matches=false;
          if(rule.condition_type==="amount_gt")matches=Number(body.amount)>Number(rule.condition_value);
          else if(rule.condition_type==="amount_lt")matches=Number(body.amount)<Number(rule.condition_value);
          else if(rule.condition_type==="no_category")matches=!body.categoryId;
          else if(rule.condition_type==="currency_is")matches=body.currency===rule.condition_value;
          if(!matches)continue;
          if(rule.action_type==="set_category"&&rule.action_category_id){
            await supabase.from("transactions").update({category_id:rule.action_category_id}).eq("id",result.data.id).eq("household_id",householdId);
          } else if(rule.action_type==="contribute_goal_percent"&&rule.action_goal_id&&body.type==="income"){
            const contribution=Number(body.amount)*(Number(rule.action_value)||0)/100;
            if(contribution>0){
              const { data: goalRow } = await supabase.from("goals").select("current_amount").eq("id",rule.action_goal_id).eq("household_id",householdId).single();
              if(goalRow)await supabase.from("goals").update({current_amount:Number(goalRow.current_amount)+contribution}).eq("id",rule.action_goal_id).eq("household_id",householdId);
            }
          }
        }
      }
      break;
    case "deleteTransaction": {
      const [fromMatch, toMatch, txRow] = await Promise.all([
        supabase.from("transfers").select("id").eq("from_transaction_id", body.id).maybeSingle(),
        supabase.from("transfers").select("id").eq("to_transaction_id", body.id).maybeSingle(),
        supabase.from("transactions").select("amount,debt_id").eq("id", body.id).eq("household_id", householdId).maybeSingle(),
      ]);
      const linkedTransfer = fromMatch.data || toMatch.data;
      result = linkedTransfer
        ? await supabase.rpc("delete_account_transfer", { p_transfer_id: linkedTransfer.id })
        : await supabase.rpc("delete_finance_transaction", { p_transaction_id: body.id });
      if(!result.error&&!linkedTransfer&&txRow.data?.debt_id){
        const { data: debtRow } = await supabase.from("debts").select("amount").eq("id",txRow.data.debt_id).eq("household_id",householdId).single();
        if(debtRow){
          await supabase.from("debts").update({amount:Number(debtRow.amount)+Number(txRow.data.amount),settled:false}).eq("id",txRow.data.debt_id).eq("household_id",householdId);
        }
      }
      break;
    }
    case "deleteTransfer":
      result = await supabase.rpc("delete_account_transfer", { p_transfer_id: body.id });
      break;
   case "createTransfer":
      result = await supabase.rpc("create_account_transfer", {
        p_from_account_id: body.fromAccountId, p_to_account_id: body.toAccountId,
        p_sent_amount: Number(body.sentAmount), p_received_amount: Number(body.receivedAmount),
        p_exchange_rate: Number(body.exchangeRate) || 1, p_fee_amount: Number(body.feeAmount) || 0,
        p_fee_currency: body.feeCurrency || null, p_note: String(body.note || "").slice(0, 500),
        p_booked_at: body.bookedAt || new Date().toISOString(),
        p_credit_limit_delta: Number(body.creditLimitDelta) || 0,
      });
      break;
    case "createBudget":
      result = await supabase.from("budgets").upsert({
        household_id: householdId, category_id: body.categoryId, month: body.month,
        period_type:body.periodType==="week"?"week":"month",limit_amount:Number(body.limitAmount),
        currency:String(body.currency||"UAH"),alert_80_sent:false,alert_100_sent:false,created_by:user.id,
        icon:String(body.icon||"CircleDollarSign").slice(0,60),color:String(body.color||"#6558E8").slice(0,20),
      }, { onConflict: "household_id,category_id,month,period_type" }).select().single();
      break;
    case "createGoal":
      result = await supabase.from("goals").insert({
        household_id: householdId, name: String(body.name).slice(0,100), target_amount:Number(body.targetAmount),
        current_amount:Number(body.currentAmount)||0, currency:String(body.currency||"UAH"), target_date:body.targetDate||null,
        color:body.color||"#6558E8", created_by:user.id,
        asset_type:["savings","deposit","bond","security"].includes(body.assetType)?body.assetType:"savings",
        annual_rate:body.annualRate?Number(body.annualRate):null, compound_interest:Boolean(body.compoundInterest),
        round_balance_to:body.roundBalanceTo?Number(body.roundBalanceTo):null,
        round_expense_to:body.roundExpenseTo?Number(body.roundExpenseTo):null,
        expense_percent:body.expensePercent?Number(body.expensePercent):null,
        source_account_id:body.sourceAccountId||null,
      }).select().single();
      break;
    case "updateGoal":
      result = await supabase.from("goals").update({
        name: String(body.name).slice(0,100), target_amount:Number(body.targetAmount), target_date:body.targetDate||null,
        color:body.color||"#6558E8", asset_type:["savings","deposit","bond","security"].includes(body.assetType)?body.assetType:"savings",
        annual_rate:body.annualRate?Number(body.annualRate):null, compound_interest:Boolean(body.compoundInterest),
        round_balance_to:body.roundBalanceTo?Number(body.roundBalanceTo):null,
        round_expense_to:body.roundExpenseTo?Number(body.roundExpenseTo):null,
        expense_percent:body.expensePercent?Number(body.expensePercent):null,
        source_account_id:body.sourceAccountId||null,
      }).eq("id",body.id).eq("household_id",householdId).select().single();
      break;
    case "withdrawGoal": {
      const amount=Number(body.amount);
      const { data: goalRow } = await supabase.from("goals").select("current_amount").eq("id",body.id).eq("household_id",householdId).single();
      if(!goalRow){result={error:{message:"Ціль не знайдена"}};break;}
      const remaining=Math.max(0,Number(goalRow.current_amount)-amount);
      result = await supabase.from("goals").update({current_amount:remaining}).eq("id",body.id).eq("household_id",householdId).select().single();
      if(!result.error){
        await supabase.from("goal_transactions").insert({goal_id:body.id,household_id:householdId,amount:-amount,kind:"withdrawal",note:body.note||"Зняття коштів"});
        if(body.targetAccountId){
          const { data: acc } = await supabase.from("accounts").select("balance").eq("id",body.targetAccountId).eq("household_id",householdId).single();
          if(acc)await supabase.from("accounts").update({balance:Number(acc.balance)+amount}).eq("id",body.targetAccountId).eq("household_id",householdId);
        }
      }
      break;
    }
    case "breakGoal": {
          const { data: goalRow } = await supabase.from("goals").select("current_amount,currency,name").eq("id",body.id).eq("household_id",householdId).single();
          if(!goalRow){result={error:{message:"Ціль не знайдена"}};break;}
          const total=Number(goalRow.current_amount);
          if(body.targetAccountId&&total>0){
            const { error: rpcError } = await supabase.rpc("create_finance_transaction",{p_account_id:String(body.targetAccountId),p_category_id:null,p_type:"income",p_amount:total,p_currency:goalRow.currency,p_note:`Розбито банку: ${goalRow.name}`,p_booked_at:new Date().toISOString(),p_is_impulsive:false});
            if(rpcError){result={error:rpcError};break;}
          }
          if(total>0)await supabase.from("goal_transactions").insert({goal_id:body.id,household_id:householdId,amount:-total,kind:"withdrawal",note:"Розбито банку"});
          result = await supabase.from("goals").delete().eq("id",body.id).eq("household_id",householdId);
          break;
        }
    case "contributeGoal":
      result = await supabase.rpc("contribute_to_goal",{p_goal_id:body.id,p_amount:Number(body.amount)});
      break;
    case "deleteGoal":
      result = await supabase.from("goals").delete().eq("id",body.id).eq("household_id",householdId);
      break;
    case "createDebt":
      result = await supabase.from("debts").insert({
        household_id:householdId,person:String(body.person).slice(0,100),direction:body.direction==="i_owe"?"i_owe":"owed_to_me",
        amount:Number(body.amount),currency:String(body.currency||"UAH"),due_date:body.dueDate||null,
        note:String(body.note||"").slice(0,500),created_by:user.id,
        is_installment:Boolean(body.isInstallment),installment_months:body.installmentMonths?Number(body.installmentMonths):null,
      }).select().single();
      break;
     case "payInstallment": {
           const { data: debtRow } = await supabase.from("debts").select("amount,currency,person,is_installment,installment_months").eq("id",body.id).eq("household_id",householdId).single();
           if(!debtRow){result={error:{message:"Борг не знайдено"}};break;}
           const payAmount=Number(body.amount);
           const rpcResult = await supabase.rpc("create_finance_transaction",{p_account_id:String(body.accountId),p_category_id:null,p_type:"expense",p_amount:payAmount,p_currency:debtRow.currency,p_note:`Погашення розстрочки: ${debtRow.person}`,p_booked_at:new Date().toISOString(),p_is_impulsive:false});
           if(rpcResult.error){result={error:rpcResult.error};break;}
           await supabase.from("transactions").update({debt_id:body.id}).eq("id",rpcResult.data.id).eq("household_id",householdId);
           const remaining=Math.max(0,Number(debtRow.amount)-payAmount);
           result = await supabase.from("debts").update({amount:remaining,settled:remaining<=0}).eq("id",body.id).eq("household_id",householdId).select().single();
           break;
         }
    case "settleDebt": {
          if(body.accountId){
            const { data: debtRow } = await supabase.from("debts").select("amount,currency,person").eq("id",body.id).eq("household_id",householdId).single();
            if(!debtRow){result={error:{message:"Борг не знайдено"}};break;}
            const { error: rpcError } = await supabase.rpc("create_finance_transaction",{p_account_id:String(body.accountId),p_category_id:null,p_type:"income",p_amount:Number(debtRow.amount),p_currency:debtRow.currency,p_note:`Повернення боргу: ${debtRow.person}`,p_booked_at:new Date().toISOString(),p_is_impulsive:false});
            if(rpcError){result={error:rpcError};break;}
          }
          result = await supabase.from("debts").update({settled:true}).eq("id",body.id).eq("household_id",householdId);
          break;
        }
    case "createRecurring":
      result = await supabase.from("recurring_rules").insert({
        household_id:householdId,account_id:body.accountId,category_id:body.categoryId||null,
        name:String(body.name).slice(0,100),amount:Number(body.amount),currency:String(body.currency),
        frequency:body.frequency||"monthly",next_run_at:body.nextRunAt,auto_create:Boolean(body.autoCreate),
        kind:body.kind==="income"?"income":"expense",debt_id:body.debtId||null,created_by:user.id,
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
    case "deleteCategory": {
          const { data: catRow } = await supabase.from("categories").select("name,is_default").eq("id",body.id).eq("household_id",householdId).single();
          if(catRow?.name==="Відсотки / Комісія"){result={error:{message:"Цю системну категорію не можна видалити"}};break;}
          result = await supabase.from("categories").delete().eq("id",body.id).eq("household_id",householdId);
          break;
        }
    case "createRule":
          result = await supabase.from("transaction_rules").insert({
            household_id:householdId,name:String(body.name).slice(0,100),condition_type:body.conditionType,condition_value:body.conditionValue||null,
            action_type:body.actionType,action_category_id:body.actionCategoryId||null,action_goal_id:body.actionGoalId||null,action_value:body.actionValue||null,created_by:user.id,
          }).select().single();
          break;
        case "deleteRule":
          result = await supabase.from("transaction_rules").delete().eq("id",body.id).eq("household_id",householdId);
          break;
    case "deleteBudget":
      result = await supabase.from("budgets").delete().eq("id",body.id).eq("household_id",householdId);
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
    const isIncomeRule=body.type==="income";
    const {error:repeatError}=await supabase.from("recurring_rules").insert({household_id:householdId,account_id:body.accountId,category_id:body.categoryId||null,name:String(body.note||(isIncomeRule?"Плановий дохід":"Регулярна витрата")).slice(0,100),amount:Number(body.amount),currency:String(body.currency),frequency,next_run_at:next.toISOString(),auto_create:false,kind:isIncomeRule?"income":"expense",created_by:user.id});
    if(repeatError)return NextResponse.json({error:repeatError.message},{status:400});
  }
  return NextResponse.json({ data: result.data });
}