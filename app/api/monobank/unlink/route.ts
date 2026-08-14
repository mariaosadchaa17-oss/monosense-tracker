import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
    const context = await getFinanceContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const monoAccountId = String(body.monoAccountId || "").trim();
    if (!monoAccountId) return NextResponse.json({ error: "Не вказано картку" }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
        .from("monobank_account_links")
        .delete()
        .eq("household_id", context.householdId)
        .eq("mono_account_id", monoAccountId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
}