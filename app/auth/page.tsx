import { redirect } from "next/navigation";
import { CircleDollarSign, LockKeyhole, Sparkles } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { signIn, signUp } from "./actions";
import { PasskeyButton } from "@/app/components/passkey-button";
import {Button} from "@/app/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string; message?: string;next?:string }> }) {
  if (!hasSupabaseConfig) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");
  const params = await searchParams;
  const register = params.mode === "register";
  const requested=params.next||"/",next=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/";

  return <main className="real-auth">
    <section className="real-auth-brand">
      <div className="brand"><span className="brand-mark"><CircleDollarSign/></span> rivna</div>
      <div><span className="eyebrow"><Sparkles/> Ваші гроші. Ваші правила.</span><h1>Фінансова ясність<br/>починається тут.</h1><p>Захищений простір для особистих і спільних фінансів.</p></div>
      <small>Дані захищені Supabase Auth та Row Level Security</small>
    </section>
    <section className="real-auth-form">
      <form action={register ? signUp : signIn} className="auth-card">
        <span className="auth-lock"><LockKeyhole/></span>
        <div><h2>{register ? "Створити акаунт" : "З поверненням"}</h2><p>{register ? "Почніть керувати фінансами разом" : "Увійдіть у свій захищений простір"}</p></div>
        {params.error && <div className="form-message error">{params.error}</div>}
        {params.message && <div className="form-message success">{params.message}</div>}
        <input type="hidden" name="next" value={next}/>
        {register && <label>Ім’я<input name="displayName" required placeholder="Марія"/></label>}
        <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com"/></label>
        <label>Пароль<input name="password" type="password" minLength={8} required autoComplete={register ? "new-password" : "current-password"} placeholder="Щонайменше 8 символів"/></label>
        <Button className="primary" type="submit">{register ? "Зареєструватися" : "Увійти"}</Button>
        {!register && <PasskeyButton mode="authenticate" redirectTo={next}/>}
        <a className="auth-switch" href={register?`/auth?next=${encodeURIComponent(next)}`:`/auth?mode=register&next=${encodeURIComponent(next)}`}>{register ? "Вже є акаунт? Увійти" : "Немає акаунта? Створити"}</a>
      </form>
    </section>
  </main>;
}
