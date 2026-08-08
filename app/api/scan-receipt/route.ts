import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.0-flash";

type ScannedTransaction = {
  amount: number;
  title: string;
  date: string | null;
  category: string | null;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY не налаштовано на сервері" }, { status: 500 });
  }

  const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не знайдено" }, { status: 400 });
    }
    let knownCategories: string[] = [];
    try {
      knownCategories = JSON.parse(String(formData.get("categories") || "[]"));
    } catch {
      knownCategories = [];
    }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  const categoryHint = knownCategories.length
      ? `Обери category СУВОРО з цього списку (пиши точно як у списку) або постав null, якщо жодна не підходить: ${knownCategories.join(", ")}.`
      : `Постав category null, якщо не впевнений.`;
    const prompt = `Ти розпізнаєш фото чека або банківської виписки. Поверни ЛИШЕ валідний JSON без пояснень і без markdown-огорожі, у форматі:
  {"transactions":[{"amount":число (додатнє, загальна сума операції),"title":"назва магазину, закладу або опис товару/послуги — НІКОЛИ не дата і не час","date":"YYYY-MM-DD або null (рік має бути реальним, від 2015 до 2030)","category":"назва категорії або null"}]}
  ВАЖЛИВО: поле title — це те, ЩО купили або ДЕ (назва магазину/закладу), а не коли. Якщо на фото є і назва, і дата/час — дату клади лише в date, а не в title.
  ${categoryHint}
  Якщо на фото один чек — поверни один об'єкт у масиві. Якщо це виписка з кількома операціями — поверни кожну окремим об'єктом. Якщо нічого розпізнати не вдалось — поверни {"transactions":[]}.`;

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: base64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      }
    );
  } catch {
    return NextResponse.json({ error: "Немає з'єднання з сервісом розпізнавання" }, { status: 502 });
  }

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    return NextResponse.json({ error: `Помилка розпізнавання: ${errorText.slice(0, 200)}` }, { status: 502 });
  }

  const data = await geminiResponse.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  let parsed: { transactions?: ScannedTransaction[] };
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Не вдалося розібрати відповідь розпізнавання" }, { status: 502 });
  }

  const looksLikeDateTime = (value: string) => /^\d{1,4}[.\-/]\d{1,2}([.\-/]\d{2,4})?[\s,]*\d{0,2}:?\d{0,2}/.test(value.trim());
    const isSaneYear = (value: string) => {
      const year = Number(value.slice(0, 4));
      return year >= 2015 && year <= 2030;
    };
    const transactions: ScannedTransaction[] = (parsed.transactions || [])
      .filter((t) => t && Number.isFinite(Number(t.amount)) && Number(t.amount) > 0)
      .map((t) => {
        const rawTitle = String(t.title || "").trim();
        const title = rawTitle && !looksLikeDateTime(rawTitle) ? rawTitle : "Операція (перевір назву)";
        const validDate = t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && isSaneYear(t.date) ? t.date : null;
        const category = t.category && knownCategories.includes(String(t.category)) ? String(t.category) : null;
        return { amount: Number(t.amount), title, date: validDate, category };
      });

  return NextResponse.json({ transactions });
}
