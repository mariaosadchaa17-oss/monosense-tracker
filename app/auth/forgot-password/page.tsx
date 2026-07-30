import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthBackdrop } from "@/app/components/auth-backdrop";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  if (!hasSupabaseConfig) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");
  const params = await searchParams;

  return (
    <main className="auth-v3">
      <AuthBackdrop />
      <div className="auth-v3-card">
        <h1>Відновлення пароля</h1>
        <p>Надішлемо посилання для скидання пароля на email</p>

        {params.error && <div className="form-message error">{params.error}</div>}
        {params.message && <div className="form-message success">{params.message}</div>}

        <form action={requestPasswordReset} className="auth-v3-form">
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
          <button className="auth-v3-primary" type="submit">Надіслати посилання</button>
        </form>

        <p className="auth-v3-switch"><a href="/auth">Повернутись до входу</a></p>
      </div>
    </main>
  );
}
