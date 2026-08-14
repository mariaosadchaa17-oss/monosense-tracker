import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const monoAccountId = String(body.monoAccountId || "").trim();
  const appAccountId = String(body.appAccountId || "").trim();
  if (!monoAccountId || !appAccountId) return NextResponse.json({ error: "Не вказано рахунок" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("monobank_account_links").upsert(
    { household_id: context.householdId, mono_account_id: monoAccountId, app_account_id: appAccountId },
    { onConflict: "household_id,mono_account_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
