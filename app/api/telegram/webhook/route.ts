import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN is not set, cannot send message");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[telegram] sendMessage failed", res.status, body);
    } else {
      console.log("[telegram] sendMessage ok", body);
    }
  } catch (err) {
    console.error("[telegram] sendMessage threw", err);
  }
}

export async function POST(request: Request) {
  // Telegram allows setting a secret token on setWebhook, delivered back on
  // this header. If configured, reject anything that doesn't match so random
  // requests to this URL can't fabricate transactions.
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    console.error("[telegram] webhook secret mismatch");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await request.json().catch((err) => {
    console.error("[telegram] failed to parse update json", err);
    return null;
  });
  console.log("[telegram] received update", JSON.stringify(update));

  const message = update?.message;
  const chatId = message?.chat?.id ? String(message.chat.id) : null;
  const text = typeof message?.text === "string" ? message.text.trim() : "";
  if (!chatId) {
    console.log("[telegram] no chatId on update, ignoring");
    return NextResponse.json({ ok: true }); // Not a message we care about (edited_message, etc.)
  }

  const admin = createAdminClient();

  if (text === "/start") {
    console.log("[telegram] handling /start for chatId", chatId);
    await sendTelegramMessage(chatId, `Вітаю! Ваш chat ID: ${chatId}\nВставте це число в Rivna → Налаштування → Telegram chat ID, щоб зв'язати акаунт.`);
    return NextResponse.json({ ok: true });
  }

  const { data: preference, error: prefError } = await admin.from("notification_preferences").select("user_id").eq("telegram_chat_id", chatId).maybeSingle();
  if (prefError) console.error("[telegram] preference lookup error", prefError);
  if (!preference) {
    console.log("[telegram] no linked preference for chatId", chatId);
    await sendTelegramMessage(chatId, "Цей chat ID ще не прив'язаний до акаунта Rivna. Вставте його в Налаштуваннях застосунку.");
    return NextResponse.json({ ok: true });
  }

  // "300 кава #робота" -> amount=300, note="кава", tags=["робота"]
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) {
    await sendTelegramMessage(chatId, "Не зрозуміла формат. Напишіть так: 300 кава #робота");
    return NextResponse.json({ ok: true });
  }
  const amount = Number(match[1].replace(",", "."));
  const rest = match[2] || "";
  const tags = [...rest.matchAll(/#(\S+)/g)].map(m => m[1]);
  const note = rest.replace(/#\S+/g, "").trim().slice(0, 500) || "Telegram";

  const { data: profile } = await admin.from("profiles").select("active_household_id").eq("id", preference.user_id).maybeSingle();
  const householdId = profile?.active_household_id;
  if (!householdId) {
    await sendTelegramMessage(chatId, "Не вдалося визначити ваш бюджет у Rivna.");
    return NextResponse.json({ ok: true });
  }

  const { data: account } = await admin.from("accounts").select("id,currency,name").eq("household_id", householdId).eq("archived", false).order("created_at").limit(1).maybeSingle();
  if (!account) {
    await sendTelegramMessage(chatId, "Спочатку додайте хоча б один рахунок у Rivna.");
    return NextResponse.json({ ok: true });
  }

  let categoryId: string | null = null;
  if (tags.length || note) {
    const { data: categories } = await admin.from("categories").select("id,name").eq("household_id", householdId).eq("kind", "expense");
    const lowerNote = note.toLowerCase();
    const found = (categories || []).find(category => lowerNote.includes(category.name.toLowerCase()));
    categoryId = found?.id || null;
  }

  const { error } = await admin.rpc("create_finance_transaction_admin", {
    p_user_id: preference.user_id,
    p_account_id: account.id, p_category_id: categoryId, p_type: "expense",
    p_amount: amount, p_currency: account.currency, p_note: note,
    p_booked_at: new Date().toISOString(), p_is_impulsive: false,
    p_split_total: null, p_personal_share: null,
  });

  if (error) {
    console.error("[telegram] create_finance_transaction error", error);
    await sendTelegramMessage(chatId, `Не вдалося зберегти витрату: ${error.message}`);
    return NextResponse.json({ ok: true });
  }

  if (tags.length) {
    const { data: transaction } = await admin.from("transactions").select("id").eq("household_id", householdId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (transaction) {
      for (const rawTag of tags.slice(0, 10)) {
        const name = rawTag.trim().toLowerCase().slice(0, 40);
        if (!name) continue;
        const { data: tag } = await admin.from("tags").upsert({ household_id: householdId, name }, { onConflict: "household_id,name" }).select("id").single();
        if (tag) await admin.from("transaction_tags").insert({ transaction_id: transaction.id, tag_id: tag.id });
      }
    }
  }

  await sendTelegramMessage(chatId, `✅ Записано: ${amount} · ${note}${tags.length ? " · " + tags.map(t => "#" + t).join(" ") : ""} (${account.name})`);
  return NextResponse.json({ ok: true });
}
