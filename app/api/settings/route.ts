import {NextResponse} from "next/server";
import {getFinanceContext} from "@/lib/supabase/context";
import {createAdminClient} from "@/lib/supabase/admin";

export async function GET(){
  const context=await getFinanceContext();
  if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  const admin=createAdminClient();
  const [{data:profile},{data:preferences},{data:household},{data:members},{data:invites}]=await Promise.all([
    admin.from("profiles").select("display_name,base_currency,planning_period").eq("id",context.user.id).single(),
    admin.from("notification_preferences").select("telegram_chat_id,recurring_reminders,budget_80,budget_100").eq("user_id",context.user.id).maybeSingle(),
    admin.from("households").select("name,base_currency").eq("id",context.householdId).single(),
    admin.from("household_members").select("user_id,role,joined_at").eq("household_id",context.householdId).order("joined_at"),
    admin.from("household_invitations").select("id,email,role,expires_at,accepted_at").eq("household_id",context.householdId).is("accepted_at",null).gt("expires_at",new Date().toISOString()),
  ]);
  const ids=(members||[]).map(item=>item.user_id);
  const {data:profiles}=ids.length?await admin.from("profiles").select("id,display_name").in("id",ids):{data:[]};
  const names=new Map((profiles||[]).map(item=>[item.id,item.display_name]));
  return NextResponse.json({
    profile:{name:profile?.display_name||context.user.email?.split("@")[0]||"Користувач",email:context.user.email,baseCurrency:household?.base_currency||profile?.base_currency||"UAH",planningPeriod:profile?.planning_period==="week"?"week":"month",householdName:household?.name||"Мої фінанси",telegramChatId:preferences?.telegram_chat_id||"",recurringReminders:preferences?.recurring_reminders??true,budget80:preferences?.budget_80??true,budget100:preferences?.budget_100??true,role:context.role},
    members:(members||[]).map(item=>({userId:item.user_id,name:names.get(item.user_id)||"Учасник",role:item.role,joinedAt:item.joined_at,isMe:item.user_id===context.user.id})),
    invitations:invites||[],
  });
}

export async function POST(request:Request){
  const context=await getFinanceContext();
  if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),admin=createAdminClient();
  if(body.action==="saveProfile"){
    const name=String(body.name||"").trim().slice(0,80),currency=String(body.baseCurrency||"UAH").toUpperCase().slice(0,3);
    if(!name)return NextResponse.json({error:"Вкажіть ім’я"},{status:400});
    const {error:profileError}=await admin.from("profiles").update({display_name:name,base_currency:currency,planning_period:body.planningPeriod==="week"?"week":"month",updated_at:new Date().toISOString()}).eq("id",context.user.id);
    const {error:preferenceError}=await admin.from("notification_preferences").upsert({user_id:context.user.id,telegram_chat_id:String(body.telegramChatId||"").trim()||null,recurring_reminders:Boolean(body.recurringReminders),budget_80:Boolean(body.budget80),budget_100:Boolean(body.budget100)},{onConflict:"user_id"});
    if(["owner","admin"].includes(context.role))await admin.from("households").update({base_currency:currency}).eq("id",context.householdId);
    const error=profileError||preferenceError;
    return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
  }
  if(!["owner","admin"].includes(context.role))return NextResponse.json({error:"Недостатньо прав"},{status:403});
  if(body.action==="changeRole"){
    if(!["admin","member","viewer"].includes(body.role))return NextResponse.json({error:"Некоректна роль"},{status:400});
    const {error}=await admin.from("household_members").update({role:body.role}).eq("household_id",context.householdId).eq("user_id",body.userId).neq("role","owner");
    return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
  }
  if(body.action==="removeMember"){
    const {error}=await admin.from("household_members").delete().eq("household_id",context.householdId).eq("user_id",body.userId).neq("role","owner");
    return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
  }
  if(body.action==="cancelInvite"){
    const {error}=await admin.from("household_invitations").delete().eq("household_id",context.householdId).eq("id",body.id);
    return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
  }
  return NextResponse.json({error:"Unknown action"},{status:400});
}
