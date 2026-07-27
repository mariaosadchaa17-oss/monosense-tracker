import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

async function sendTelegram(chatId:string,text:string){
  const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)return false;
  const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text})});
  return response.ok;
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("run_due_recurring");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const now=new Date(),until=new Date(now.getTime()+24*60*60*1000);
  const {data:overdue}=await supabase.from("recurring_rules").select("id,frequency,next_run_at").eq("active",true).eq("auto_create",false).lt("next_run_at",now.toISOString());
  for(const rule of overdue||[]){const next=new Date(rule.next_run_at);while(next<=now){if(rule.frequency==="daily")next.setUTCDate(next.getUTCDate()+1);else if(rule.frequency==="weekly")next.setUTCDate(next.getUTCDate()+7);else if(rule.frequency==="yearly")next.setUTCFullYear(next.getUTCFullYear()+1);else next.setUTCMonth(next.getUTCMonth()+1)}await supabase.from("recurring_rules").update({next_run_at:next.toISOString(),last_reminded_at:null}).eq("id",rule.id)}
  const {data:rules,error:reminderError}=await supabase.from("recurring_rules").select("id,household_id,name,amount,currency,next_run_at,last_reminded_at").eq("active",true).eq("auto_create",false).gte("next_run_at",now.toISOString()).lte("next_run_at",until.toISOString());
  if(reminderError)return NextResponse.json({error:reminderError.message},{status:500});
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
  if(publicKey&&privateKey&&subject)webpush.setVapidDetails(subject,publicKey,privateKey);
  let reminders=0;
  for(const rule of rules||[]){
    if(rule.last_reminded_at&&new Date(rule.last_reminded_at)>=new Date(rule.next_run_at))continue;
    const {data:members}=await supabase.from("household_members").select("user_id").eq("household_id",rule.household_id);
    const ids=(members||[]).map(member=>member.user_id);if(!ids.length)continue;
    const {data:preferences}=await supabase.from("notification_preferences").select("user_id,telegram_chat_id,recurring_reminders").in("user_id",ids).eq("recurring_reminders",true);
    const enabledIds=(preferences||[]).map(item=>item.user_id);
    const {data:subscriptions}=enabledIds.length?await supabase.from("push_subscriptions").select("*").in("user_id",enabledIds):{data:[]};
    const title="Нагадування про платіж",body=`${rule.name}: ${rule.currency} ${Number(rule.amount).toLocaleString("uk-UA")} — ${new Date(rule.next_run_at).toLocaleString("uk-UA")}`;
    for(const subscription of subscriptions||[]){if(!publicKey||!privateKey||!subject)break;try{await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title,body,url:"/?section=goals",tag:`recurring-${rule.id}`}));reminders++;}catch(err){if([404,410].includes((err as {statusCode?:number}).statusCode||0))await supabase.from("push_subscriptions").delete().eq("id",subscription.id)}}
    for(const preference of preferences||[])if(preference.telegram_chat_id&&await sendTelegram(preference.telegram_chat_id,`${title}\n${body}`))reminders++;
    await supabase.from("recurring_rules").update({last_reminded_at:rule.next_run_at}).eq("id",rule.id);
  }
  return NextResponse.json({ processed: data, reminders });
}
