"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/auth?error=${encodeURIComponent("Невірний email або пароль")}`);
  redirect("/");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "");
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: displayName }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect(`/auth?error=${encodeURIComponent(error.message)}`);
  redirect(`/auth?message=${encodeURIComponent("Перевірте пошту для підтвердження реєстрації")}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
