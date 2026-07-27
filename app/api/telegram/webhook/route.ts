import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseQuickExpense } from "@/lib/finance/quick-command";

type TelegramUpdate = { message?: { chat: { id: number }; text?: string; from?: { first_name?: string } } };

async function reply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const update = await request.json() as TelegramUpdate;
  const chatId = update.message?.chat.id;
  const text = update.message?.text;
  if (!chatId || !text) return NextResponse.json({ ok: true });
  if (text === "/start") {
    await reply(chatId, `Ваш Telegram chat ID: ${chatId}\nДодайте його у налаштуваннях Rivna, а потім надсилайте витрати: 300 кава #робота`);
    return NextResponse.json({ ok: true });
  }
  const expense = parseQuickExpense(text);
  if (!expense) {
    await reply(chatId, "Не вдалося розпізнати витрату. Приклад: 300 кава #робота");
    return NextResponse.json({ ok: true });
  }
  const supabase = createAdminClient();
  const { data: preference } = await supabase.from("notification_preferences").select("user_id").eq("telegram_chat_id", String(chatId)).maybeSingle();
  if (!preference) {
    await reply(chatId, `Спочатку додайте chat ID ${chatId} у налаштуваннях Rivna.`);
    return NextResponse.json({ ok: true });
  }
  const {data:profile}=await supabase.from("profiles").select("active_household_id").eq("id",preference.user_id).maybeSingle();
  const membershipQuery=supabase.from("household_members").select("household_id,role").eq("user_id",preference.user_id);
  const {data:membership}=profile?.active_household_id
    ?await membershipQuery.eq("household_id",profile.active_household_id).maybeSingle()
    :await membershipQuery.order("joined_at").limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Household not found" }, { status: 422 });
  if(membership.role==="viewer"){await reply(chatId,"У цьому бюджеті у вас доступ лише для перегляду.");return NextResponse.json({ok:true})}
  const [{ data: account }, { data: category }] = await Promise.all([
    supabase.from("accounts").select("id,currency").eq("household_id", membership.household_id).eq("archived", false).limit(1).single(),
    supabase.from("categories").select("id").eq("household_id", membership.household_id).eq("kind", "expense").ilike("name", `%${expense.note}%`).limit(1).maybeSingle(),
  ]);
  if (!account) {
    await reply(chatId, "У Rivna ще немає рахунку. Створіть його перед додаванням витрат.");
    return NextResponse.json({ ok: true });
  }
  const {data:transaction,error}=await supabase.rpc("create_service_finance_transaction",{
    p_user_id:preference.user_id,p_account_id:account.id,p_category_id:category?.id||null,
    p_amount:expense.amount,p_note:expense.note,p_booked_at:new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  for (const tagName of expense.tags) {
    const { data: tag } = await supabase.from("tags").upsert({ household_id: membership.household_id, name: tagName }, { onConflict: "household_id,name" }).select("id").single();
    if (tag&&transaction) await supabase.from("transaction_tags").insert({ transaction_id: transaction.id, tag_id: tag.id });
  }
  await reply(chatId, `✅ Додано: ${expense.amount.toFixed(2)} ${account.currency} · ${expense.note}`);
  return NextResponse.json({ ok: true });
}
