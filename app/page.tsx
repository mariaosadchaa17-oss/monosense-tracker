import { FinoraApp } from "./finora-app";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {OnboardingWizard} from "./onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!hasSupabaseConfig) return <FinoraApp />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth");
  const userId=String(data.claims.sub),{data:profile}=await supabase.from("profiles").select("display_name,onboarding_completed").eq("id",userId).maybeSingle();
  if(profile&&!profile.onboarding_completed)return <OnboardingWizard displayName={profile.display_name||"друже"}/>;
  return <FinoraApp initialLoggedIn />;
}
