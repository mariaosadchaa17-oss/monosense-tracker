import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ step: "getUser", ok: false, error: authError?.message || "no user" });
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("active_household_id,onboarding_completed").eq("id", auth.user.id).maybeSingle();
  const membershipQuery = supabase.from("household_members").select("household_id,role").eq("user_id", auth.user.id);
  const primary = profile?.active_household_id
    ? await membershipQuery.eq("household_id", profile.active_household_id).maybeSingle()
    : await membershipQuery.order("joined_at").limit(1).maybeSingle();
  const fallback = await supabase.from("household_members").select("household_id,role").eq("user_id", auth.user.id).order("joined_at").limit(1).maybeSingle();
  return NextResponse.json({
    userId: auth.user.id,
    profile,
    profileError: profileError?.message || null,
    primaryMembership: primary.data,
    primaryMembershipError: primary.error?.message || null,
    fallbackMembership: fallback.data,
    fallbackMembershipError: fallback.error?.message || null,
  });
}
