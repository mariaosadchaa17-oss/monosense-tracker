export type QuickExpense = { amount: number; note: string; tags: string[] };

export function parseQuickExpense(input: string): QuickExpense | null {
  const normalized = input.trim().replace(",", ".");
  const match = normalized.match(/^(\d+(?:\.\d{1,2})?)\s+(.+)$/u);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) return null;
  const words = match[2].trim().split(/\s+/u);
  const tags = words.filter(word => word.startsWith("#")).map(word => word.slice(1).toLowerCase()).filter(Boolean);
  const note = words.filter(word => !word.startsWith("#")).join(" ").trim();
  return note ? { amount, note, tags } : null;
}
