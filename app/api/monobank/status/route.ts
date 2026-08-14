import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
    const context = await getFinanceContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: connection } = await admin.from("monobank_connections").select("accounts_json,last_synced_at").eq("household_id", context.householdId).maybeSingle();
    if (!connection) return NextResponse.json({ connected: false, accounts: [], links: {} });

    const { data: links } = await admin.from("monobank_account_links").select("mono_account_id,app_account_id").eq("household_id", context.householdId);
    const linksMap: Record<string, string> = {};
    (links || []).forEach((link) => { linksMap[link.mono_account_id] = link.app_account_id; });

    return NextResponse.json({ connected: true, accounts: connection.accounts_json || [], links: linksMap, lastSyncedAt: connection.last_synced_at || null });


}