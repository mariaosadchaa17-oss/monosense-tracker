import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
    const authorization = request.headers.get("authorization");
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    const validHeader = authorization === `Bearer ${process.env.CRON_SECRET}`;
    const validQuery = querySecret && querySecret === process.env.CRON_SECRET;
    if (!process.env.CRON_SECRET || (!validHeader && !validQuery)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: connections } = await admin.from("monobank_connections").select("household_id,token");

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    let reregistered = 0;
    const debug: { householdId: string; ok: boolean; error?: string }[] = [];

    for (const connection of connections || []) {
        try {
            const response = await fetch("https://api.monobank.ua/personal/webhook", {
                method: "POST",
                headers: { "X-Token": connection.token, "Content-Type": "application/json" },
                body: JSON.stringify({ webHookUrl: `${origin}/api/monobank/webhook` }),
            });
            if (response.ok) {
                reregistered++;
                debug.push({ householdId: connection.household_id, ok: true });
            } else {
                const text = await response.text().catch(() => "");
                debug.push({ householdId: connection.household_id, ok: false, error: text.slice(0, 150) });
            }
        } catch (error) {
            debug.push({
                householdId: connection.household_id,
                ok: false,
                error: error instanceof Error ? error.message : "Помилка мережі",
            });
        }
    }

    return NextResponse.json({ reregistered, total: connections?.length || 0, debug });
}