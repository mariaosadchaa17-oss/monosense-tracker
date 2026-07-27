import {NextResponse} from "next/server";
import webpush from "web-push";
import {createAdminClient} from "@/lib/supabase/admin";

export async function GET(request:Request){
  if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
  if(!publicKey||!privateKey||!subject)return NextResponse.json({error:"VAPID is not configured"},{status:503});
  webpush.setVapidDetails(subject,publicKey,privateKey);
  const supabase=createAdminClient();
  const {data:alerts,error}=await supabase.from("active_budget_alerts").select("*");
  if(error)return NextResponse.json({error:error.message},{status:500});
  let sent=0;
  for(const alert of alerts||[]){
    const percent=Number(alert.limit_amount)?Number(alert.spent)/Number(alert.limit_amount)*100:0;
    const threshold=percent>=100&&!alert.alert_100_sent?100:percent>=80&&!alert.alert_80_sent?80:0;
    if(!threshold)continue;
    const {data:members}=await supabase.from("household_members").select("user_id").eq("household_id",alert.household_id);
    const userIds=(members||[]).map(m=>m.user_id);if(!userIds.length)continue;
    const {data:preferences}=await supabase.from("notification_preferences").select("user_id,budget_80,budget_100,push_enabled").in("user_id",userIds);
    const enabledIds=(preferences||[]).filter(item=>item.push_enabled&&(threshold===100?item.budget_100:item.budget_80)).map(item=>item.user_id);
    const {data:subscriptions}=enabledIds.length?await supabase.from("push_subscriptions").select("*").in("user_id",enabledIds):{data:[]};
    const payload=JSON.stringify({title:threshold===100?"Ліміт вичерпано":"Бюджет майже вичерпано",body:`${alert.category_name}: ${Math.round(percent)}% ${alert.period_type==="week"?"тижневого":"місячного"} ліміту`,url:"/?section=budget",tag:`budget-${alert.id}-${threshold}`});
    for(const sub of subscriptions||[]){
      try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload);sent++;}
      catch(err){if((err as {statusCode?:number}).statusCode===404||(err as {statusCode?:number}).statusCode===410)await supabase.from("push_subscriptions").delete().eq("id",sub.id);}
    }
    await supabase.from("budgets").update(threshold===100?{alert_100_sent:true,alert_80_sent:true}:{alert_80_sent:true}).eq("id",alert.id);
  }
  return NextResponse.json({sent});
}
