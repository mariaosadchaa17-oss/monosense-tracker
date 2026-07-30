import { createClient } from "./server";

export async function getFinanceContext() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) { console.error("[getFinanceContext] getUser failed:", authError?.message); return null; }
  const {data:profile,error:profileError}=await supabase.from("profiles").select("active_household_id").eq("id",auth.user.id).maybeSingle();
  if (profileError) console.error("[getFinanceContext] profile query error:", profileError.message);
  const membershipQuery=supabase.from("household_members").select("household_id,role").eq("user_id",auth.user.id);
  let {data:membership,error:membershipError}=profile?.active_household_id
    ?await membershipQuery.eq("household_id",profile.active_household_id).maybeSingle()
    :await membershipQuery.order("joined_at").limit(1).maybeSingle();
  if (membershipError) console.error("[getFinanceContext] membership query error:", membershipError.message);
  if(!membership){
    const fallback=await supabase.from("household_members").select("household_id,role").eq("user_id",auth.user.id).order("joined_at").limit(1).maybeSingle();
    if (fallback.error) console.error("[getFinanceContext] fallback membership error:", fallback.error.message);
    membership=fallback.data;
  }
  if (!membership) { console.error("[getFinanceContext] no membership found for user", auth.user.id, "profile:", JSON.stringify(profile)); return null; }
  return { supabase, user: auth.user, householdId: membership.household_id as string, role: membership.role as string };
}
