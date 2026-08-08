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

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  const prompt = `Ти розпізнаєш фото чека або банківської виписки. Поверни ЛИШЕ валідний JSON без пояснень і без markdown-огорожі, у форматі:
{"transactions":[{"amount":число (додатнє, загальна сума операції),"title":"назва магазину або опис операції","date":"YYYY-MM-DD або null","category":"коротка назва категорії українською або null"}]}
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

  const transactions: ScannedTransaction[] = (parsed.transactions || [])
    .filter((t) => t && Number.isFinite(Number(t.amount)) && Number(t.amount) > 0)
    .map((t) => ({
      amount: Number(t.amount),
      title: String(t.title || "Операція"),
      date: t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : null,
      category: t.category ? String(t.category) : null,
    }));

  return NextResponse.json({ transactions });
}
