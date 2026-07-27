import { createClient } from "./server";

export async function getFinanceContext() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;
  const { data: membership } = await supabase.from("household_members")
    .select("household_id,role").eq("user_id", auth.user.id).limit(1).single();
  if (!membership) return null;
  return { supabase, user: auth.user, householdId: membership.household_id as string, role: membership.role as string };
}
