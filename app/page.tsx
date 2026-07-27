import { FinoraApp } from "./finora-app";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!hasSupabaseConfig) return <FinoraApp />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth");
  return <FinoraApp initialLoggedIn />;
}
