export function getPasskeyConfig(){
  const appUrl=new URL(process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000");
  return {rpID:appUrl.hostname,rpName:"Rivna",origin:appUrl.origin};
}
export const toBase64=(value:Uint8Array)=>Buffer.from(value).toString("base64url");
export const fromBase64=(value:string)=>new Uint8Array(Buffer.from(value,"base64url"));
