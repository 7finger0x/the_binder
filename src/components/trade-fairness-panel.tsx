import { formatMoney } from "@/lib/portfolio";
import { tradeFairnessHint } from "@/lib/showcase";
import type { Card } from "@/lib/cards";

export function TradeFairnessPanel({
  tradeCards,
  wantCards,
  hideValues,
}: {
  tradeCards: Card[];
  wantCards: Card[];
  hideValues: boolean;
}) {
  if (hideValues) return null;
  const fairness = tradeFairnessHint(tradeCards, wantCards);
  if (!fairness) return null;

  return (
    <section className="mb-4 rounded-xl border border-collx-green/30 bg-collx-green/5 p-4 text-sm">
      <p className="text-xs font-bold tracking-wide text-collx-green uppercase">Trade fairness hint</p>
      <div className="mt-2 flex flex-wrap gap-4 tabular-nums">
        <div>
          <p className="text-xs text-muted">Offering</p>
          <p className="font-bold">{formatMoney(fairness.tradeTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Wanting</p>
          <p className="font-bold">{formatMoney(fairness.wantTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Difference</p>
          <p className={`font-bold ${fairness.delta >= 0 ? "text-collx-green" : "text-orange-600"}`}>
            {fairness.delta >= 0 ? "+" : ""}
            {formatMoney(fairness.delta)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-muted">{fairness.hint}</p>
      <p className="mt-1 text-[11px] text-muted">Based on market estimates with condition adjustments — verify comps yourself.</p>
    </section>
  );
}
