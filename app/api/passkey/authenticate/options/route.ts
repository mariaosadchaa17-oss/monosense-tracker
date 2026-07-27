import {NextResponse} from "next/server";
import {generateAuthenticationOptions} from "@simplewebauthn/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getPasskeyConfig} from "@/lib/passkeys/config";

export async function POST(){
  const config=getPasskeyConfig();const options=await generateAuthenticationOptions({rpID:config.rpID,userVerification:"required",allowCredentials:[]});
  const admin=createAdminClient();const {data,error}=await admin.from("webauthn_challenges").insert({challenge:options.challenge,purpose:"authentication"}).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({options,challengeId:data.id});
}
