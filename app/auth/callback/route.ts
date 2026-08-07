import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested=url.searchParams.get("next")||"/",next=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent("Посилання вже використане або застаріле. Запросіть нове")}`, url.origin));
    }
  }
  return NextResponse.redirect(new URL(next,url.origin));
}