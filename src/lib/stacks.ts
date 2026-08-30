import type { Card } from "./cards";

/** Unique stack names from owned cards (case-insensitive dedupe, most recent casing wins). */
export function listStackNames(cards: Card[]): string[] {
  const byKey = new Map<string, { name: string; updatedAt: number }>();

  for (const card of cards) {
    if (card.status !== "owned") continue;
    const name = card.stack.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const prev = byKey.get(key);
    const updatedAt = card.updatedAt || card.createdAt || 0;
    if (!prev || updatedAt >= prev.updatedAt) {
      byKey.set(key, { name, updatedAt });
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((e) => e.name);
}

/** Stack name → card count (owned cards with a non-empty stack). */
export function stackNameCounts(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const card of cards) {
    if (card.status !== "owned") continue;
    const name = card.stack.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

/** Top stack names by card count for quick-add chips. */
export function topStackNames(cards: Card[], limit = 5): string[] {
  const counts = stackNameCounts(cards);
  const names = listStackNames(cards);
  return names
    .slice()
    .sort((a, b) => (counts.get(b.toLowerCase()) ?? 0) - (counts.get(a.toLowerCase()) ?? 0))
    .slice(0, limit);
}
