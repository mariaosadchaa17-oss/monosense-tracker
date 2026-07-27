import {NextResponse} from "next/server";
import {createHash,randomBytes} from "node:crypto";
import {getFinanceContext} from "@/lib/supabase/context";
import {createAdminClient} from "@/lib/supabase/admin";

export async function POST(request:Request){
  const context=await getFinanceContext();if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["owner","admin"].includes(context.role))return NextResponse.json({error:"Лише адміністратор може запрошувати учасників"},{status:403});
  const {email,identifier,role}=await request.json();const target=String(identifier||email||"").trim().toLowerCase(),isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  const username=isEmail?null:target.replace(/^@/,"");
  if(!isEmail&&!/^[a-z0-9_.-]{3,30}$/.test(username||""))return NextResponse.json({error:"Вкажіть коректний email або username"},{status:400});
  let normalized:string|null=isEmail?target:null;
  const admin=createAdminClient();
  if(username){const {data:profile}=await admin.from("profiles").select("id").ilike("username",username).maybeSingle();if(profile){const {data:user}=await admin.auth.admin.getUserById(profile.id);normalized=user.user?.email?.toLowerCase()||null}}
  const token=randomBytes(32).toString("base64url"),tokenHash=createHash("sha256").update(token).digest("hex");
  const {error}=await admin.from("household_invitations").insert({household_id:context.householdId,email:normalized,username:username||null,role:["admin","member","viewer"].includes(role)?role:"member",token_hash:tokenHash,invited_by:context.user.id});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  return NextResponse.json({url:`${origin}/invite/${token}`});
}
