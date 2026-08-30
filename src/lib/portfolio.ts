import { parseValue, type Card } from "./cards";
import { conditionMultiplier } from "./condition";

export function cardQty(card: Pick<Card, "qty">) {
  const n = Number(String(card.qty || "1").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function cardRawValue(card: Pick<Card, "value" | "qty">) {
  return parseValue(card.value) * cardQty(card);
}

export function cardValue(card: Pick<Card, "value" | "qty" | "condition">) {
  const raw = cardRawValue(card);
  const mult = card.condition ? conditionMultiplier(card.condition) : 1;
  return raw * mult;
}

export function formatMoney(amount: number) {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

export type PortfolioStats = {
  totalValue: number;
  ownedValue: number;
  wishlistValue: number;
  ownedCount: number;
  wishlistCount: number;
  pricedCount: number;
};

export function portfolioStats(cards: Card[]): PortfolioStats {
  let totalValue = 0;
  let ownedValue = 0;
  let wishlistValue = 0;
  let ownedCount = 0;
  let wishlistCount = 0;
  let pricedCount = 0;

  for (const card of cards) {
    const v = cardValue(card);
    const qty = cardQty(card);
    if (card.status === "wishlist") {
      wishlistCount += qty;
      wishlistValue += v;
    } else {
      ownedCount += qty;
      ownedValue += v;
    }
    totalValue += v;
    if (parseValue(card.value) > 0) pricedCount += qty;
  }

  return { totalValue, ownedValue, wishlistValue, ownedCount, wishlistCount, pricedCount };
}

export type SetGroup = {
  key: string;
  label: string;
  category: string;
  year: string;
  cards: Card[];
  ownedCount: number;
  totalValue: number;
};

export function groupBySet(cards: Card[]): SetGroup[] {
  const map = new Map<string, SetGroup>();

  for (const card of cards) {
    if (card.status !== "owned" || !card.setName.trim()) continue;
    const key = [card.category, card.year, card.brand, card.setName]
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .join(" · ");
    const existing = map.get(key);
    if (existing) {
      existing.cards.push(card);
      existing.ownedCount += cardQty(card);
      existing.totalValue += cardValue(card);
    } else {
      map.set(key, {
        key,
        label: card.setName.trim(),
        category: card.category,
        year: card.year,
        cards: [card],
        ownedCount: cardQty(card),
        totalValue: cardValue(card),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue || b.ownedCount - a.ownedCount);
}

export type StackGroup = {
  key: string;
  label: string;
  cards: Card[];
  count: number;
  totalValue: number;
};

export function groupByStack(cards: Card[]): StackGroup[] {
  const map = new Map<string, StackGroup>();

  for (const card of cards) {
    if (card.status !== "owned") continue;
    const label = card.stack.trim() || "Unsorted";
    const key = label.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.cards.push(card);
      existing.count += cardQty(card);
      existing.totalValue += cardValue(card);
    } else {
      map.set(key, {
        key,
        label,
        cards: [card],
        count: cardQty(card),
        totalValue: cardValue(card),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.label === "Unsorted") return 1;
    if (b.label === "Unsorted") return -1;
    return b.totalValue - a.totalValue || b.count - a.count;
  });
}

export { annualSavingsVsCollxPro, COLLX_PRO_MONTHLY_USD } from "./subscription";
