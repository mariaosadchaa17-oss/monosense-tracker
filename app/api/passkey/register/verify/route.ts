import {NextResponse} from "next/server";
import {verifyRegistrationResponse} from "@simplewebauthn/server";
import {getFinanceContext} from "@/lib/supabase/context";
import {createAdminClient} from "@/lib/supabase/admin";
import {getPasskeyConfig,toBase64} from "@/lib/passkeys/config";

export async function POST(request:Request){
  const context=await getFinanceContext();if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {response,challengeId,deviceName}=await request.json();const admin=createAdminClient();
  const {data:challenge}=await admin.from("webauthn_challenges").select("*").eq("id",challengeId).eq("user_id",context.user.id).eq("purpose","registration").gt("expires_at",new Date().toISOString()).single();
  if(!challenge)return NextResponse.json({error:"Challenge expired"},{status:400});
  try{
    const config=getPasskeyConfig();const verification=await verifyRegistrationResponse({response,expectedChallenge:challenge.challenge,expectedOrigin:config.origin,expectedRPID:config.rpID,requireUserVerification:true});
    if(!verification.verified||!verification.registrationInfo)return NextResponse.json({error:"Verification failed"},{status:400});
    const info=verification.registrationInfo;
    const {error}=await admin.from("passkey_credentials").insert({user_id:context.user.id,credential_id:info.credential.id,public_key:toBase64(info.credential.publicKey),counter:info.credential.counter,transports:response.response?.transports||[],device_name:String(deviceName||"Цей пристрій").slice(0,80),backed_up:info.credentialBackedUp});
    await admin.from("webauthn_challenges").delete().eq("id",challengeId);
    if(error)return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({verified:true});
  }catch{return NextResponse.json({error:"Не вдалося перевірити passkey"},{status:400});}
}
