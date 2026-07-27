import {createHash} from "node:crypto";
import Link from "next/link";
import {redirect} from "next/navigation";
import {CircleDollarSign,Users} from "lucide-react";
import {hasSupabaseConfig} from "@/lib/supabase/config";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const dynamic="force-dynamic";
export default async function InvitePage({params}:{params:Promise<{token:string}>}){
  if(!hasSupabaseConfig)redirect("/");
  const {token}=await params;const supabase=await createClient();const {data:auth}=await supabase.auth.getUser();
  const hash=createHash("sha256").update(token).digest("hex");const admin=createAdminClient();
  const {data:invite}=await admin.from("household_invitations").select("*,households(name)").eq("token_hash",hash).is("accepted_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(!invite)return <InviteStatus title="Запрошення недійсне" text="Посилання застаріло, вже використане або не існує."/>;
  if(!auth.user)return <InviteStatus title={`Вас запрошують до «${invite.households?.name||"Спільні фінанси"}»`} text="Увійдіть або зареєструйтеся з email, на який надіслано запрошення." login/>;
  if(auth.user.email?.toLowerCase()!==invite.email.toLowerCase())return <InviteStatus title="Інший email" text={`Запрошення призначено для ${invite.email}. Увійдіть з цим email.`}/>;
  await admin.from("household_members").upsert({household_id:invite.household_id,user_id:auth.user.id,role:invite.role},{onConflict:"household_id,user_id"});
  await admin.from("household_invitations").update({accepted_at:new Date().toISOString()}).eq("id",invite.id);
  redirect("/");
}
function InviteStatus({title,text,login=false}:{title:string;text:string;login?:boolean}){return <main className="invite-page"><div className="invite-card"><span className="brand-mark"><CircleDollarSign/></span><span className="goal-icon"><Users/></span><h1>{title}</h1><p>{text}</p>{login&&<Link className="primary" href="/auth">Увійти до Finora</Link>}<Link className="auth-switch" href="/">На головну</Link></div></main>}
