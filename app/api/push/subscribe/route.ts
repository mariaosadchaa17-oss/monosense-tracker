import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

export async function POST(request:Request){
  const context=await getFinanceContext();
  if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  const subscription=await request.json();
  if(!subscription?.endpoint||!subscription?.keys?.p256dh||!subscription?.keys?.auth)return NextResponse.json({error:"Invalid subscription"},{status:400});
  const {error}=await context.supabase.from("push_subscriptions").upsert({
    user_id:context.user.id,endpoint:String(subscription.endpoint),p256dh:String(subscription.keys.p256dh),
    auth:String(subscription.keys.auth),user_agent:request.headers.get("user-agent"),
  },{onConflict:"endpoint"});
  if(error)return NextResponse.json({error:error.message},{status:400});
  await context.supabase.from("notification_preferences").update({push_enabled:true}).eq("user_id",context.user.id);
  return NextResponse.json({ok:true});
}
export async function DELETE(request:Request){
  const context=await getFinanceContext();if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {endpoint}=await request.json();await context.supabase.from("push_subscriptions").delete().eq("endpoint",endpoint).eq("user_id",context.user.id);
  return NextResponse.json({ok:true});
}
