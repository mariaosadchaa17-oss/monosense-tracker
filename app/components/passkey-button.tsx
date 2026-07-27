"use client";

import {useState} from "react";
import {startAuthentication,startRegistration} from "@simplewebauthn/browser";
import {Fingerprint,LoaderCircle} from "lucide-react";

export function PasskeyButton({mode,className="",onMessage}:{mode:"register"|"authenticate";className?:string;onMessage?:(message:string)=>void}){
  const [loading,setLoading]=useState(false);
  async function run(){
    setLoading(true);
    try{
      if(mode==="register"){
        const optionsResponse=await fetch("/api/passkey/register/options",{method:"POST"});const payload=await optionsResponse.json();if(!optionsResponse.ok)throw new Error(payload.error);
        const response=await startRegistration({optionsJSON:payload.options});
        const verify=await fetch("/api/passkey/register/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({response,challengeId:payload.challengeId,deviceName:navigator.userAgent.includes("iPhone")?"iPhone":navigator.userAgent.includes("Android")?"Android":"Цей пристрій"})});
        const result=await verify.json();if(!verify.ok)throw new Error(result.error);onMessage?.("Passkey успішно додано");
      }else{
        const optionsResponse=await fetch("/api/passkey/authenticate/options",{method:"POST"});const payload=await optionsResponse.json();if(!optionsResponse.ok)throw new Error(payload.error);
        const response=await startAuthentication({optionsJSON:payload.options});
        const verify=await fetch("/api/passkey/authenticate/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({response,challengeId:payload.challengeId})});
        const result=await verify.json();if(!verify.ok)throw new Error(result.error);window.location.href="/";
      }
    }catch(error){onMessage?.(error instanceof Error?error.message:"Не вдалося використати passkey");}
    finally{setLoading(false);}
  }
  return <button type="button" className={className||"bio-btn"} onClick={run} disabled={loading}>{loading?<LoaderCircle className="spin"/>:<Fingerprint/>}{mode==="register"?"Додати Face ID / Touch ID":"Увійти з Face ID / Touch ID"}</button>;
}
