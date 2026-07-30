import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleDollarSign, LockKeyhole } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { signIn, signUp } from "./actions";
import { PasskeySection } from "@/app/components/passkey-section";
import { Button } from "@/app/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string; message?: string; next?: string }> }) {
  if (!hasSupabaseConfig) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");
  const params = await searchParams;
  const register = params.mode === "register";
  const requested = params.next || "/", next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  return (
    <main className="auth-v2">
      <section className="auth-v2-side">
        <div className="auth-v2-mark"><CircleDollarSign /> rivna</div>
        <div className="auth-v2-quote">
          <span className="auth-v2-num">01</span>
          <h1>Фінансова ясність<br />починається тут.</h1>
          <p>Захищений простір для особистих і спільних фінансів — рахунки, бюджети, аналітика в одному місці.</p>
        </div>
        <small>Дані захищені Supabase Auth та Row Level Security</small>
      </section>

      <section className="auth-v2-main">
        <div className="auth-v2-card">
          <div className="auth-v2-tabs">
            <a className={register ? "" : "active"} href={`/auth?next=${encodeURIComponent(next)}`}>Вхід</a>
            <a className={register ? "active" : ""} href={`/auth?mode=register&next=${encodeURIComponent(next)}`}>Реєстрація</a>
          </div>

          <form action={register ? signUp : signIn} className="auth-v2-form">
            <div className="auth-v2-heading">
              <span className="auth-v2-lock"><LockKeyhole /></span>
              <div>
                <h2>{register ? "Створити акаунт" : "З поверненням"}</h2>
                <p>{register ? "Почніть керувати фінансами разом" : "Увійдіть у свій захищений простір"}</p>
              </div>
            </div>

            {params.error && <div className="form-message error">{params.error}</div>}
            {params.message && <div className="form-message success">{params.message}</div>}

            <input type="hidden" name="next" value={next} />
            {register && <label>Ім&rsquo;я<input name="displayName" required placeholder="Марія" /></label>}
            <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
            <label>Пароль<input name="password" type="password" minLength={8} required autoComplete={register ? "new-password" : "current-password"} placeholder="Щонайменше 8 символів" /></label>
            {!register && <Link className="auth-v2-forgot" href="/auth/forgot-password">Забули пароль?</Link>}

            <Button className="primary" type="submit">{register ? "Зареєструватися" : "Увійти"}</Button>

            {!register && (
              <>
                <div className="auth-v2-divider"><span>або</span></div>
                <PasskeySection redirectTo={next} />
              </>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
