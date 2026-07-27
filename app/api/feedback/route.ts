import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function POST(request:Request){
  const supabase=await createClient(),{data:auth}=await supabase.auth.getUser();
  if(!auth.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),rating=Math.max(1,Math.min(5,Number(body.rating)||5)),message=String(body.message||"").trim().slice(0,2000);
  if(message.length<3)return NextResponse.json({error:"Напишіть кілька слів"},{status:400});
  const {error}=await supabase.from("feedback").insert({user_id:auth.user.id,rating,message});
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
}
