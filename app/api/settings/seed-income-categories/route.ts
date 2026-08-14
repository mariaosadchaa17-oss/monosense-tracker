import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

const DEFAULT_INCOME_CATEGORIES = [
    { name: "Зарплата", icon: "WalletCards", color: "#159b70" },
    { name: "Фріланс", icon: "Laptop", color: "#6558e8" },
    { name: "Подарунки", icon: "Gift", color: "#e0527d" },
    { name: "Інший дохід", icon: "CircleDollarSign", color: "#f4b740" },
];

export async function POST() {
    const context = await getFinanceContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = DEFAULT_INCOME_CATEGORIES.map((item) => ({
        household_id: context.householdId,
        name: item.name,
        icon: item.icon,
        color: item.color,
        kind: "income",
        created_by: context.user.id,
    }));

    const { error } = await context.supabase
        .from("categories")
        .upsert(rows, { onConflict: "household_id,name,kind" });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, created: rows.length });
}