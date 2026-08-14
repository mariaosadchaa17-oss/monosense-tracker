import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildDigestPdf } from "@/lib/digest/buildPdf";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const validHeader = authorization === `Bearer ${process.env.CRON_SECRET}`;
  const validQuery = querySecret && querySecret === process.env.CRON_SECRET;
  if (!process.env.CRON_SECRET || (!validHeader && !validQuery)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const now = new Date();
  const isMonday = now.getDay() === 1;
  const isFirstOfMonth = now.getDate() === 1;
  const force = url.searchParams.get("force") === "1";

  const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id,digest_enabled,digest_frequency,telegram_chat_id,digest_email_enabled")
      .eq("digest_enabled", true);

  let sent = 0;
  let lastDebug: Record<string, unknown> | null = null;

  for (const pref of prefs || []) {
    const shouldSend = force || (pref.digest_frequency === "weekly" ? isMonday : isFirstOfMonth);
    if (!shouldSend) continue;
    if (!pref.telegram_chat_id && !pref.digest_email_enabled) continue;

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

    const lines: string[] = [];
    lines.push(`Витрачено: ₴${Math.round(totalSpent).toLocaleString("uk-UA")}`);
    lines.push(`Дохід: ₴${Math.round(totalIncome).toLocaleString("uk-UA")}`);
    lines.push("");
    if (topCategories.length) {
      lines.push("Топ категорій:");
      topCategories.forEach(([name, value]) => lines.push(`• ${name}: ₴${Math.round(value).toLocaleString("uk-UA")}`));
      lines.push("");
    }
    if (budgets?.length) {
      lines.push("Виконання бюджету:");
      budgets.forEach((b) => {
        const name = (b.categories as { name?: string } | null)?.name || "Категорія";
        const spent = byCategory[name] || 0;
        const limit = Number(b.limit_amount) || 1;
        const percent = Math.round((spent / limit) * 100);
        lines.push(`• ${name}: ${percent}% (₴${Math.round(spent).toLocaleString("uk-UA")} з ₴${Math.round(limit).toLocaleString("uk-UA")})`);
      });
      lines.push("");
    }
    if (goals?.length) {
      lines.push("Накопичення:");
      goals.forEach((g) => lines.push(`• ${g.name}: ${Math.round((g.current_amount / g.target_amount) * 100)}%`));
    }

    let text = `📊 Твій ${periodLabel} у rivna\n\n`;
    text += lines.join("\n");

    const debugInfo: Record<string, unknown> = { telegramChatId: pref.telegram_chat_id || null, digestEmailEnabled: pref.digest_email_enabled };

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && pref.telegram_chat_id) {
      const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: pref.telegram_chat_id, text }),
      });
      const tgResult = await tgResponse.json();
      debugInfo.telegram = { ok: tgResponse.ok, result: tgResult };
      if (tgResponse.ok) sent++;
    } else {
      debugInfo.telegram = "skipped: no botToken or chat_id";
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && pref.digest_email_enabled) {
      const { data: authUser } = await supabase.auth.admin.getUserById(pref.user_id);
      const toEmail = authUser?.user?.email;
      if (toEmail) {
        const html = `<pre style="font-family:inherit;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</pre>`;

        let attachments: { filename: string; content: string }[] | undefined;
        try {
          const pdfBytes = await buildDigestPdf(`Твій ${periodLabel} у rivna`, lines);
          attachments = [{ filename: `rivna-digest.pdf`, content: Buffer.from(pdfBytes).toString("base64") }];
        } catch {
          attachments = undefined;
        }

        const mailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "Rivna <onboarding@resend.dev>",
            to: toEmail,
            subject: `📊 Твій ${periodLabel} у rivna`,
            html,
            attachments,
          }),
        });
        const mailResult = await mailResponse.json();
        debugInfo.email = { ok: mailResponse.ok, to: toEmail, result: mailResult };
        if (mailResponse.ok) sent++;
      } else {
        debugInfo.email = "skipped: no user email found";
      }
    } else {
      debugInfo.email = "skipped: no resendKey or digest_email_enabled false";
    }

    lastDebug = debugInfo;
  }

  if (force) {
    return NextResponse.json({ sent, debug: lastDebug });
  }
  return NextResponse.json({ sent });
}