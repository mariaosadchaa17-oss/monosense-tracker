import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleDollarSign, Mail } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { requestPasswordReset } from "@/app/auth/actions";
import { Button } from "@/app/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  if (!hasSupabaseConfig) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");
  const params = await searchParams;

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
          <form action={requestPasswordReset} className="auth-v2-form">
            <div className="auth-v2-heading">
              <span className="auth-v2-lock"><Mail /></span>
              <div>
                <h2>Відновлення пароля</h2>
                <p>Надішлемо посилання для скидання пароля на email</p>
              </div>
            </div>

            {params.error && <div className="form-message error">{params.error}</div>}
            {params.message && <div className="form-message success">{params.message}</div>}

            <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>

            <Button className="primary" type="submit">Надіслати посилання</Button>
            <Link className="auth-switch" href="/auth">Повернутись до входу</Link>
          </form>
        </div>
      </section>
    </main>
  );
}
