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

const NEW_EXPENSE_LABEL = "＋ Витрата";
const SKIP_NAME_DATA = "name:skip";

// Persistent keyboard shown under the message input, so the person can tap
// instead of typing a trigger phrase each time.
const mainKeyboard = {
  reply_markup: {
    keyboard: [[{ text: NEW_EXPENSE_LABEL }]],
    resize_keyboard: true,
    is_persistent: true,
  },
};

async function startDraft(admin: ReturnType<typeof createAdminClient>, chatId: string, userId: string, householdId: string) {
  const { data: accounts } = await admin.from("accounts").select("id,name").eq("household_id", householdId).eq("archived", false).order("created_at");
  if (!accounts || accounts.length === 0) {
    await sendMessage(chatId, "Спочатку додайте хоча б один рахунок у Rivna.");
    return;
  }
  await admin.from("telegram_drafts").upsert({
    telegram_chat_id: chatId, user_id: userId, household_id: householdId,
    account_id: null, category_id: null, amount: null, step: "account", updated_at: new Date().toISOString(),
  });
  await sendMessage(chatId, "Оберіть картку:", inlineKeyboard(
    accounts.map(a => [{ text: a.name, data: `acc:${a.id}` }])
  ));
}

async function ensureMainKeyboard(chatId: string) {
  // Telegram only (re)renders a reply keyboard when it's attached to a
  // message, so nudge it once per /start; harmless if sent again.
  await sendMessage(chatId, `Тисніть «${NEW_EXPENSE_LABEL}» знизу, щоб додати витрату.`, mainKeyboard);
}

async function promptCategory(admin: ReturnType<typeof createAdminClient>, chatId: string, householdId: string) {
  const { data: categories } = await admin.from("categories").select("id,name").eq("household_id", householdId).eq("kind", "expense").order("name");
  if (!categories || categories.length === 0) {
    await admin.from("telegram_drafts").update({ category_id: null, step: "amount", updated_at: new Date().toISOString() }).eq("telegram_chat_id", chatId);
    await sendMessage(chatId, "Введіть суму, наприклад: 300");
    return;
  }
  await sendMessage(chatId, "Оберіть категорію:", inlineKeyboard([
    ...chunk(categories.map(c => ({ text: c.name, data: `cat:${c.id}` })), 2),
    [{ text: "Без категорії", data: "cat:none" }],
  ]));
}

async function handleCallback(admin: ReturnType<typeof createAdminClient>, update: any) {
  const cq = update.callback_query;
  const chatId = String(cq.message?.chat?.id);
  const data: string = cq.data || "";
  await answerCallback(cq.id);

  const { data: draft } = await admin.from("telegram_drafts").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!draft) {
    await sendMessage(chatId, "Сесія застаріла. Натисніть «＋ Витрата», щоб почати знову.");
    return;
  }

  if (data.startsWith("acc:") && draft.step === "account") {
    const accountId = data.slice(4);
    await admin.from("telegram_drafts").update({ account_id: accountId, step: "category", updated_at: new Date().toISOString() }).eq("telegram_chat_id", chatId);
    await promptCategory(admin, chatId, draft.household_id);
    return;
  }

  if (data.startsWith("cat:") && draft.step === "category") {
    const categoryId = data === "cat:none" ? null : data.slice(4);
    await admin.from("telegram_drafts").update({ category_id: categoryId, step: "amount", updated_at: new Date().toISOString() }).eq("telegram_chat_id", chatId);
    await sendMessage(chatId, "Введіть суму, наприклад: 300");
    return;
  }

  if (data === SKIP_NAME_DATA && draft.step === "name") {
    await finalizeTransaction(admin, chatId, draft, null);
    return;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function finalizeTransaction(
  admin: ReturnType<typeof createAdminClient>,
  chatId: string,
  draft: { user_id: string; account_id: string | null; category_id: string | null; amount: number | null },
  rawName: string | null,
) {
  if (!draft.account_id || draft.amount === null) {
    await sendMessage(chatId, "Щось пішло не так. Натисніть «＋ Витрата», щоб почати знову.");
    await admin.from("telegram_drafts").delete().eq("telegram_chat_id", chatId);
    return;
  }

  const { data: account } = await admin.from("accounts").select("id,currency,name").eq("id", draft.account_id).maybeSingle();
  if (!account) {
    await sendMessage(chatId, "Картку не знайдено. Почніть спочатку.");
    await admin.from("telegram_drafts").delete().eq("telegram_chat_id", chatId);
    return;
  }

  let categoryName: string | null = null;
  if (draft.category_id) {
    const { data: category } = await admin.from("categories").select("name").eq("id", draft.category_id).maybeSingle();
    categoryName = category?.name ?? null;
  }

  const note = (rawName || "").trim().slice(0, 500) || categoryName || "Витрата";

  const { error } = await admin.rpc("create_finance_transaction_admin", {
    p_user_id: draft.user_id,
    p_account_id: account.id, p_category_id: draft.category_id, p_type: "expense",
    p_amount: draft.amount, p_currency: account.currency, p_note: note,
    p_booked_at: new Date().toISOString(), p_is_impulsive: false,
    p_split_total: null, p_personal_share: null,
  });

  if (error) {
    console.error("[telegram] create_finance_transaction_admin error", error);
    await sendMessage(chatId, `Не вдалося зберегти витрату: ${error.message}`);
    return;
  }

  await admin.from("telegram_drafts").delete().eq("telegram_chat_id", chatId);
  await sendMessage(chatId, `✅ Записано: ${draft.amount} · ${note} (${account.name})`);
}

async function handleTextStep(admin: ReturnType<typeof createAdminClient>, chatId: string, draft: any, text: string) {
  if (draft.step === "amount") {
    const normalized = text.replace(",", ".").trim();
    const amount = Number(normalized);
    if (!normalized || Number.isNaN(amount) || amount <= 0) {
      await sendMessage(chatId, "Введіть суму числом, наприклад: 300");
      return;
    }
    await admin.from("telegram_drafts").update({ amount, step: "name", updated_at: new Date().toISOString() }).eq("telegram_chat_id", chatId);
    await sendMessage(chatId, "Введіть назву витрати (або натисніть «Пропустити»):", inlineKeyboard([
      [{ text: "Пропустити", data: SKIP_NAME_DATA }],
    ]));
    return;
  }

  if (draft.step === "name") {
    await finalizeTransaction(admin, chatId, draft, text);
    return;
  }

  await sendMessage(chatId, "Спершу оберіть варіант на кнопках вище ⬆️");
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

  if (text.startsWith("/start")) {
      const linkToken = text.slice(6).trim();
      if (linkToken) {
        const { data: linkRow } = await admin.from("telegram_link_tokens").select("user_id").eq("token", linkToken).maybeSingle();
        if (linkRow) {
          await admin.from("notification_preferences").upsert({ user_id: linkRow.user_id, telegram_chat_id: chatId }, { onConflict: "user_id" });
          await admin.from("telegram_link_tokens").delete().eq("token", linkToken);
          await sendMessage(chatId, "✅ Акаунт прив'язано! Тепер отримуватимеш дайджести й можеш записувати витрати прямо тут.");
          await ensureMainKeyboard(chatId);
          return NextResponse.json({ ok: true });
        }
        await sendMessage(chatId, "Посилання для прив'язки недійсне або застаріле. Спробуй ще раз у Rivna → Налаштування.");
        return NextResponse.json({ ok: true });
      }
      await sendMessage(chatId, `Вітаю! Ваш chat ID: ${chatId}\nВставте це число в Rivna → Налаштування → Telegram chat ID, щоб зв'язати акаунт.`);
      await ensureMainKeyboard(chatId);
      return NextResponse.json({ ok: true });
    }if (text === "/start") {
    await sendMessage(chatId, `Вітаю! Ваш chat ID: ${chatId}\nВставте це число в Rivna → Налаштування → Telegram chat ID, щоб зв'язати акаунт.`);
    await ensureMainKeyboard(chatId);
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

  if (text === NEW_EXPENSE_LABEL) {
    await startDraft(admin, chatId, preference.user_id, householdId);
    return NextResponse.json({ ok: true });
  }

  const { data: draft } = await admin.from("telegram_drafts").select("*").eq("telegram_chat_id", chatId).maybeSingle();

  if (draft && (draft.step === "amount" || draft.step === "name")) {
    await handleTextStep(admin, chatId, draft, text);
    return NextResponse.json({ ok: true });
  }

  if (draft && (draft.step === "account" || draft.step === "category")) {
    await sendMessage(chatId, "Спершу оберіть варіант на кнопках вище ⬆️");
    return NextResponse.json({ ok: true });
  }

  // No draft at all and not the trigger button: show the keyboard so they
  // know how to start next time.
  await ensureMainKeyboard(chatId);
  return NextResponse.json({ ok: true });
}
