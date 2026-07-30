import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "@/app/auth/actions";
import { AuthBackdrop } from "@/app/components/auth-backdrop";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!hasSupabaseConfig) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth?error=" + encodeURIComponent("Посилання недійсне або застаріле. Спробуйте ще раз"); const params = await searchParams;

  return (
    <main className="auth-v3">
      <AuthBackdrop />
      <div className="auth-v3-card">
        <h1>Новий пароль</h1>
        <p>Придумайте новий пароль для входу</p>

        {params.error && <div className="form-message error">{params.error}</div>}

        <form action={updatePassword} className="auth-v3-form">
          <label>Новий пароль<input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Щонайменше 8 символів" /></label>
          <button className="auth-v3-primary" type="submit">Зберегти пароль</button>
        </form>
      </div>
    </main>
  );
}
