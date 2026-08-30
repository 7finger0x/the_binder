import type { Card } from "./cards";
import { cardValue } from "./portfolio";

export const FREE_SHOWCASE_LIMIT = 1;
export const PRO_SHOWCASE_LIMIT = 5;

export type ShowcaseFilterMode = "all" | "stacks" | "pick";

export type BinderGroup = {
  key: string;
  label: string;
  cards: Card[];
};

/** Group owned singles by physical location or stack for public binder views. */
export function groupPublicBinders(cards: Card[]): BinderGroup[] {
  const map = new Map<string, BinderGroup>();

  for (const card of cards) {
    if (card.status !== "owned" || card.kind !== "single") continue;
    const location = card.location.trim();
    const stack = card.stack.trim();
    const label = location || stack || "Main collection";
    const key = label.toLowerCase();
    const existing = map.get(key);
    if (existing) existing.cards.push(card);
    else map.set(key, { key, label, cards: [card] });
  }

  return Array.from(map.values()).sort((a, b) => b.cards.length - a.cards.length);
}

export type TradeFairness = {
  tradeTotal: number;
  wantTotal: number;
  delta: number;
  hint: string;
};

/** Simple value comparison for trade fairness (TCGplayer-style market values + condition). */
export function tradeFairnessHint(tradeCards: Card[], wantCards: Card[]): TradeFairness | null {
  if (!tradeCards.length || !wantCards.length) return null;
  const tradeTotal = tradeCards.reduce((sum, c) => sum + cardValue(c), 0);
  const wantTotal = wantCards.reduce((sum, c) => sum + cardValue(c), 0);
  const delta = tradeTotal - wantTotal;
  const pct = wantTotal > 0 ? Math.abs(delta / wantTotal) * 100 : 0;

  let hint = "Values are roughly even — still verify condition and comps.";
  if (delta > 0 && pct > 15) hint = "Your side runs higher by market value — consider asking for adds or cash.";
  else if (delta < 0 && pct > 15) hint = "Their side runs higher — you may be getting a favorable deal on paper.";
  else if (pct <= 15) hint = "Within ~15% by market estimate — fair starting point for negotiation.";

  return { tradeTotal, wantTotal, delta, hint };
}

export function showcaseInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function normalizeCustomSlug(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
