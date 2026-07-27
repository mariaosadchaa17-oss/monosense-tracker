import {NextResponse} from "next/server";
import {generateRegistrationOptions} from "@simplewebauthn/server";
import {getFinanceContext} from "@/lib/supabase/context";
import {createAdminClient} from "@/lib/supabase/admin";
import {getPasskeyConfig} from "@/lib/passkeys/config";

export async function POST(){
  const context=await getFinanceContext();if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  const admin=createAdminClient();const {data:existing}=await admin.from("passkey_credentials").select("credential_id,transports").eq("user_id",context.user.id);
  const config=getPasskeyConfig();
  const options=await generateRegistrationOptions({
    rpName:config.rpName,rpID:config.rpID,userName:context.user.email||context.user.id,
    userDisplayName:context.user.user_metadata?.display_name||context.user.email||"Finora user",
    userID:new TextEncoder().encode(context.user.id),attestationType:"none",
    excludeCredentials:(existing||[]).map(item=>({id:item.credential_id,transports:item.transports})),
    authenticatorSelection:{residentKey:"required",userVerification:"required",authenticatorAttachment:"platform"},
  });
  const {data:challenge,error}=await admin.from("webauthn_challenges").insert({user_id:context.user.id,challenge:options.challenge,purpose:"registration"}).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({options,challengeId:challenge.id});
}
