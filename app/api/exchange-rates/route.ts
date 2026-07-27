import { NextResponse } from "next/server";

type NbuRate = { r030: number; txt: string; rate: number; cc: string; exchangedate: string; special?: string };
const supported = new Set(["USD", "EUR", "PLN", "GBP", "CHF", "CAD"]);

export async function GET() {
  try {
    const response = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json", {
      next: { revalidate: 60 * 60 * 6 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`NBU responded ${response.status}`);
    const data = await response.json() as NbuRate[];
    const rates = data.filter(item => supported.has(item.cc)).map(item => ({
      currency: item.cc, name: item.txt, rate: item.rate, date: item.exchangedate, special: item.special || null,
    }));
    return NextResponse.json({ base: "UAH", source: "NBU", rates }, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Не вдалося отримати курси НБУ" }, { status: 502 });
  }
}
