import {NextResponse} from "next/server";
import {createHash,randomBytes} from "node:crypto";
import {getFinanceContext} from "@/lib/supabase/context";
import {createAdminClient} from "@/lib/supabase/admin";

export async function POST(request:Request){
  const context=await getFinanceContext();if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["owner","admin"].includes(context.role))return NextResponse.json({error:"Лише адміністратор може запрошувати учасників"},{status:403});
  const {email,role}=await request.json();const normalized=String(email||"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))return NextResponse.json({error:"Некоректний email"},{status:400});
  const token=randomBytes(32).toString("base64url"),tokenHash=createHash("sha256").update(token).digest("hex");
  const admin=createAdminClient();const {error}=await admin.from("household_invitations").insert({household_id:context.householdId,email:normalized,role:["admin","member","viewer"].includes(role)?role:"member",token_hash:tokenHash,invited_by:context.user.id});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  return NextResponse.json({url:`${origin}/invite/${token}`});
}
