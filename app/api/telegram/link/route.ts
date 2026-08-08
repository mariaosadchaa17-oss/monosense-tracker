import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";

const BOT_USERNAME = "rivnamary_bot";

export async function POST() {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

  await admin.from("telegram_link_tokens").delete().eq("user_id", context.user.id);
  const { error } = await admin.from("telegram_link_tokens").insert({ token, user_id: context.user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ url: `https://t.me/${BOT_USERNAME}?start=${token}` });
}
