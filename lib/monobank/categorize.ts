type CategorizeItem = { id: string; description: string; type: "income" | "expense" };
type CategoryRow = { id: string; name: string; kind: string };

export async function categorizeMonobankItems(
    items: CategorizeItem[],
    categories: CategoryRow[]
): Promise<Record<string, string | null>> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !items.length) return {};

    const expenseNames = categories.filter((c) => c.kind === "expense").map((c) => c.name);
    const incomeNames = categories.filter((c) => c.kind === "income").map((c) => c.name);

    const lines = items
        .map((item) => `${item.id} | ${item.type === "income" ? "дохід" : "витрата"} | ${item.description || "без опису"}`)
        .join("\n");

    const prompt = `Ти класифікуєш банківські операції за категоріями.
Категорії витрат: ${expenseNames.join(", ") || "немає"}.
Категорії доходів: ${incomeNames.join(", ") || "немає"}.
Для кожної операції нижче (формат: ID | тип | опис) визнач найбільш підходящу категорію СУВОРО зі списку відповідного типу, або null, якщо жодна не підходить.
Операції:
${lines}
Поверни ЛИШЕ JSON без пояснень у форматі {"ID1":"назва категорії або null","ID2":"..."}.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0, responseMimeType: "application/json" },
                }),
            }
        );
        if (!response.ok) return {};
        const data = await response.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const result: Record<string, string | null> = {};
        for (const item of items) {
            const value = parsed[item.id];
            result[item.id] = typeof value === "string" && value.toLowerCase() !== "null" ? value : null;
        }
        return result;
    } catch {
        return {};
    }
}
