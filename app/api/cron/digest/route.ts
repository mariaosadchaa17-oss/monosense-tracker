import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const now = new Date();
  const isMonday = now.getDay() === 1;
  const isFirstOfMonth = now.getDate() === 1;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id,digest_enabled,digest_frequency,telegram_chat_id")
    .eq("digest_enabled", true);

  let sent = 0;
  for (const pref of prefs || []) {
    const shouldSend = pref.digest_frequency === "weekly" ? isMonday : isFirstOfMonth;
    if (!shouldSend || !pref.telegram_chat_id) continue;

    const { data: membership } = await supabase.from("household_members").select("household_id").eq("user_id", pref.user_id).limit(1).maybeSingle();
    if (!membership) continue;
    const householdId = membership.household_id;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - (pref.digest_frequency === "weekly" ? 7 : 30));

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount,type,booked_at,categories(name)")
      .eq("household_id", householdId)
      .gte("booked_at", periodStart.toISOString())
      .in("type", ["expense", "income"]);

    const { data: budgets } = await supabase.from("budgets").select("limit_amount,categories(name)").eq("household_id", householdId);
    const { data: goals } = await supabase.from("goals").select("name,current_amount,target_amount").eq("household_id", householdId);

    const expenses = (transactions || []).filter((t) => t.type === "expense");
    const income = (transactions || []).filter((t) => t.type === "income");
    const totalSpent = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);

    const byCategory: Record<string, number> = {};
    expenses.forEach((t) => {
      const name = (t.categories as { name?: string } | null)?.name || "Без категорії";
      byCategory[name] = (byCategory[name] || 0) + Number(t.amount);
    });
    const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const periodLabel = pref.digest_frequency === "weekly" ? "тиждень" : "місяць";
    let text = `📊 Твій ${periodLabel} у rivna\n\n`;
    text += `Витрачено: ₴${Math.round(totalSpent).toLocaleString("uk-UA")}\n`;
    text += `Дохід: ₴${Math.round(totalIncome).toLocaleString("uk-UA")}\n\n`;
    if (topCategories.length) {
      text += `Топ категорій:\n`;
      topCategories.forEach(([name, value]) => { text += `• ${name}: ₴${Math.round(value).toLocaleString("uk-UA")}\n`; });
      text += `\n`;
    }
    if (budgets?.length) {
      text += `Бюджети: ${budgets.length} активних лімітів\n`;
    }
    if (goals?.length) {
      text += `\nНакопичення:\n`;
      goals.forEach((g) => { text += `• ${g.name}: ${Math.round((g.current_amount / g.target_amount) * 100)}%\n`; });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: pref.telegram_chat_id, text }),
      });
      sent++;
    }
  }
  return NextResponse.json({ sent });
}
