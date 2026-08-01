import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TELEGRAM_API = "https://api.telegram.org/bot";

async function tg(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN is not set");
    return null;
  }
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) console.error(`[telegram] ${method} failed`, res.status, body);
    return body;
  } catch (err) {
    console.error(`[telegram] ${method} threw`, err);
    return null;
  }
}

const sendMessage = (chatId: string, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id: chatId, text, ...extra });

const answerCallback = (callbackQueryId: string, text?: string) =>
  tg("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text } : {}) });

function inlineKeyboard(rows: { text: string; data: string }[][]) {
  return { reply_markup: { inline_keyboard: rows.map(row => row.map(b => ({ text: b.text, callback_data: b.data }))) } };
}

async function startDraft(admin: ReturnType<typeof createAdminClient>, chatId: string, userId: string, householdId: string) {
  const { data: accounts } = await admin.from("accounts").select("id,name").eq("household_id", householdId).eq("archived", false).order("created_at");
  if (!accounts || accounts.length === 0) {
    await sendMessage(chatId, "Спочатку додайте хоча б один рахунок у Rivna.");
    return;
  }
  await admin.from("telegram_drafts").upsert({
    telegram_chat_id: chatId, user_id: userId, household_id: householdId,
    account_id: null, category_id: null, step: "account", updated_at: new Date().toISOString(),
  });
  await sendMessage(chatId, "Оберіть картку:", inlineKeyboard(
    accounts.map(a => [{ text: a.name, data: `acc:${a.id}` }])
  ));
}

async function handleCallback(admin: ReturnType<typeof createAdminClient>, update: any) {
  const cq = update.callback_query;
  const chatId = String(cq.message?.chat?.id);
  const data: string = cq.data || "";
  await answerCallback(cq.id);

  const { data: draft } = await admin.from("telegram_drafts").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!draft) {
    await sendMessage(chatId, "Сесія застаріла. Напишіть суму ще раз, наприклад: 300 кава #робота");
    return;
  }

  if (data.startsWith("acc:") && draft.step === "account") {
    const accountId = data.slice(4);
    const { data: categories } = await admin.from("categories").select("id,name").eq("household_id", draft.household_id).eq("kind", "expense").order("name");
    await admin.from("telegram_drafts").update({ account_id: accountId, step: "category", updated_at: new Date().toISOString() }).eq("telegram_chat_id", chatId);
    if (!categories || categories.length === 0) {
      await admin.from("telegram_drafts").update({ step: "amount" }).eq("telegram_chat_id", chatId);
      await sendMessage(chatId, "Введіть суму та нотатку, наприклад: 300 кава");
      return;
    }
    await sendMessage(chatId, "Оберіть категорію:", inlineKeyboard([
      ...chunk(categories.map(c => ({ text: c.name, data: `cat:${c.id}` })), 2),
      [{ text: "Без категорії", data: "cat:none" }],
    ]));
    return;
  }

  if (data.startsWith("cat:") && draft.step === "category") {
    const categoryId = data === "cat:none" ? null : data.slice(4);
    await admin.from("telegram_drafts").update({ category_id: categoryId, step: "amount", updated_at: new Date().toISOString() }).eq("telegram_chat_id", chatId);
    await sendMessage(chatId, "Введіть суму та нотатку, наприклад: 300 кава #робота");
    return;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function finalizeTransaction(admin: ReturnType<typeof createAdminClient>, chatId: string, text: string) {
  const { data: draft } = await admin.from("telegram_drafts").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!draft || draft.step !== "amount" || !draft.account_id) {
    await sendMessage(chatId, "Спершу оберіть картку. Напишіть будь-яке повідомлення, щоб почати.");
    return;
  }

  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) {
    await sendMessage(chatId, "Не зрозуміла формат. Напишіть так: 300 кава");
    return;
  }
  const amount = Number(match[1].replace(",", "."));
  const note = (match[2] || "").trim().slice(0, 500) || "Telegram";

  const { data: account } = await admin.from("accounts").select("id,currency,name").eq("id", draft.account_id).maybeSingle();
  if (!account) {
    await sendMessage(chatId, "Картку не знайдено. Почніть спочатку.");
    await admin.from("telegram_drafts").delete().eq("telegram_chat_id", chatId);
    return;
  }

  const { error } = await admin.rpc("create_finance_transaction_admin", {
    p_user_id: draft.user_id,
    p_account_id: account.id, p_category_id: draft.category_id, p_type: "expense",
    p_amount: amount, p_currency: account.currency, p_note: note,
    p_booked_at: new Date().toISOString(), p_is_impulsive: false,
    p_split_total: null, p_personal_share: null,
  });

  if (error) {
    console.error("[telegram] create_finance_transaction_admin error", error);
    await sendMessage(chatId, `Не вдалося зберегти витрату: ${error.message}`);
    return;
  }

  await admin.from("telegram_drafts").delete().eq("telegram_chat_id", chatId);
  await sendMessage(chatId, `✅ Записано: ${amount} · ${note} (${account.name})`);
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const admin = createAdminClient();

  if (update?.callback_query) {
    await handleCallback(admin, update);
    return NextResponse.json({ ok: true });
  }

  const message = update?.message;
  const chatId = message?.chat?.id ? String(message.chat.id) : null;
  const text = typeof message?.text === "string" ? message.text.trim() : "";
  if (!chatId) return NextResponse.json({ ok: true });

  if (text === "/start") {
    await sendMessage(chatId, `Вітаю! Ваш chat ID: ${chatId}\nВставте це число в Rivna → Налаштування → Telegram chat ID, щоб зв'язати акаунт.`);
    return NextResponse.json({ ok: true });
  }

  const { data: preference } = await admin.from("notification_preferences").select("user_id").eq("telegram_chat_id", chatId).maybeSingle();
  if (!preference) {
    await sendMessage(chatId, "Цей chat ID ще не прив'язаний до акаунта Rivna. Вставте його в Налаштуваннях застосунку.");
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await admin.from("profiles").select("active_household_id").eq("id", preference.user_id).maybeSingle();
  const householdId = profile?.active_household_id;
  if (!householdId) {
    await sendMessage(chatId, "Не вдалося визначити ваш бюджет у Rivna.");
    return NextResponse.json({ ok: true });
  }

  const { data: existingDraft } = await admin.from("telegram_drafts").select("step").eq("telegram_chat_id", chatId).maybeSingle();

  if (existingDraft?.step === "amount") {
    await finalizeTransaction(admin, chatId, text);
    return NextResponse.json({ ok: true });
  }

  // No draft in progress (or stuck on account/category without a text
  // reply expected) -> start a fresh flow with this message ignored as the
  // trigger, and re-prompt with the account keyboard.
  await startDraft(admin, chatId, preference.user_id, householdId);
  return NextResponse.json({ ok: true });
}
