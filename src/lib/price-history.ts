import type { Card, ValueSnapshot } from "./cards";
import { parseValue } from "./cards";
import { conditionMultiplier } from "./condition";

export function appendSnapshot(
  snapshots: ValueSnapshot[] | undefined,
  valueRaw: string,
): ValueSnapshot[] {
  const value = parseValue(valueRaw);
  if (!value) return snapshots ?? [];
  const next = [...(snapshots ?? []), { at: Date.now(), value }];
  return next.slice(-90);
}

export function sparklinePoints(snapshots: Card["valueSnapshots"]): string | null {
  if (!snapshots?.length || snapshots.length < 2) return null;
  const values = snapshots.map((s) => s.value).filter((v) => Number.isFinite(v) && v > 0);
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = 100 / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = 32 - ((v - min) / range) * 28;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return points.join(" ");
}

/** Portfolio-wide value trend from per-card snapshots (last 30 days). */
export function portfolioValueTrend(cards: Card[], windowMs = 30 * 24 * 60 * 60 * 1000) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const buckets = new Map<number, number>();

  for (const card of cards) {
    if (card.status !== "owned") continue;
    const qty = Number(card.qty) || 1;
    for (const snap of card.valueSnapshots ?? []) {
      if (snap.at < cutoff) continue;
      const day = new Date(snap.at);
      day.setHours(0, 0, 0, 0);
      const key = day.getTime();
      const mult = card.condition ? conditionMultiplier(card.condition) : 1;
      buckets.set(key, (buckets.get(key) ?? 0) + snap.value * qty * mult);
    }
  }

  const points = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  if (points.length < 2) return null;

  const first = points[0]![1];
  const last = points[points.length - 1]![1];
  const delta = last - first;
  const pct = first > 0 ? (delta / first) * 100 : 0;

  return { delta, pct, sparkline: sparklineFromValues(points.map((p) => p[1])) };
}

function sparklineFromValues(values: number[]) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = 100 / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = 32 - ((v - min) / range) * 28;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
