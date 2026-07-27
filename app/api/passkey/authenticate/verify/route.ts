import {NextResponse} from "next/server";
import {verifyAuthenticationResponse} from "@simplewebauthn/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {fromBase64,getPasskeyConfig} from "@/lib/passkeys/config";

export async function POST(request:Request){
  const {response,challengeId}=await request.json();const admin=createAdminClient();
  const [{data:challenge},{data:credential}]=await Promise.all([
    admin.from("webauthn_challenges").select("*").eq("id",challengeId).eq("purpose","authentication").gt("expires_at",new Date().toISOString()).single(),
    admin.from("passkey_credentials").select("*").eq("credential_id",response.id).single(),
  ]);
  if(!challenge||!credential)return NextResponse.json({error:"Passkey не знайдено або запит застарів"},{status:400});
  try{
    const config=getPasskeyConfig();const verification=await verifyAuthenticationResponse({response,expectedChallenge:challenge.challenge,expectedOrigin:config.origin,expectedRPID:config.rpID,credential:{id:credential.credential_id,publicKey:fromBase64(credential.public_key),counter:Number(credential.counter),transports:credential.transports},requireUserVerification:true});
    if(!verification.verified)return NextResponse.json({error:"Verification failed"},{status:401});
    const {data:userResult}=await admin.auth.admin.getUserById(credential.user_id);const email=userResult.user?.email;if(!email)return NextResponse.json({error:"User not found"},{status:404});
    const {data:link,error:linkError}=await admin.auth.admin.generateLink({type:"magiclink",email});if(linkError||!link.properties?.hashed_token)return NextResponse.json({error:"Session creation failed"},{status:500});
    const supabase=await createClient();const {error:otpError}=await supabase.auth.verifyOtp({token_hash:link.properties.hashed_token,type:"email"});if(otpError)return NextResponse.json({error:otpError.message},{status:500});
    await Promise.all([admin.from("passkey_credentials").update({counter:verification.authenticationInfo.newCounter,last_used_at:new Date().toISOString()}).eq("id",credential.id),admin.from("webauthn_challenges").delete().eq("id",challengeId)]);
    return NextResponse.json({verified:true});
  }catch{return NextResponse.json({error:"Не вдалося перевірити passkey"},{status:400});}
}
