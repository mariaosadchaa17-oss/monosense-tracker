import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { signIn, signUp } from "./actions";
import { PasskeySection } from "@/app/components/passkey-section";
import { AuthBackdrop } from "@/app/components/auth-backdrop";
import { AuthThemeToggle } from "@/app/components/auth-theme-toggle";

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
    <main className="auth-v3">
      <AuthBackdrop />
      <div className="auth-v3-card">
        <AuthThemeToggle />
        <p className="auth-v3-signature">Engineered by Maria Osadcha</p>
        <h1>{register ? "Створити акаунт" : "Увійти"}</h1>
        <p>{register ? "Почніть керувати фінансами разом" : "Раді бачити знову"}</p>

        {params.error && <div className="form-message error">{params.error}</div>}
        {params.message && <div className="form-message success">{params.message}</div>}

        <form action={register ? signUp : signIn} className="auth-v3-form">
          <input type="hidden" name="next" value={next} />
          {register && <label>Ім&rsquo;я<input name="displayName" required placeholder="Марія" /></label>}
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
          <label>Пароль<input name="password" type="password" minLength={8} required autoComplete={register ? "new-password" : "current-password"} placeholder="Щонайменше 8 символів" /></label>
          {!register && <a className="auth-v3-forgot" href="/auth/forgot-password">Забули пароль?</a>}

          <button className="auth-v3-primary" type="submit">{register ? "Зареєструватися" : "Увійти"}</button>

          {!register && <PasskeySection redirectTo={next} />}
        </form>

        <p className="auth-v3-switch">
          {register
            ? <>Вже є акаунт? <a href={`/auth?next=${encodeURIComponent(next)}`}>Увійти</a></>
            : <>Немає акаунта? <a href={`/auth?mode=register&next=${encodeURIComponent(next)}`}>Зареєструватися</a></>}
        </p>
      </div>
    </main>
  );
}
