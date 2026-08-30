"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Lock, Printer } from "lucide-react";
import { formatMoney, type SetGroup } from "@/lib/portfolio";
import type { Card } from "@/lib/cards";
import { CollectionCardTile } from "./collection-card-tile";
import { computeSetProgress, fetchPokemonSetManifest, type SetProgress } from "@/lib/set-catalog";
import { printSetChecklist } from "@/lib/set-checklist";

export function SetsView({ sets, cards, isPro, onOpenCard }: {
  sets: SetGroup[];
  cards: Card[];
  isPro: boolean;
  onOpenCard: (card: Card) => void;
}) {
  const [master, setMaster] = useState<SetProgress | null>(null);

  useEffect(() => {
    void fetchPokemonSetManifest("sv1").then((manifest) => {
      if (manifest) setMaster(computeSetProgress(manifest, cards));
    });
  }, [cards]);

  return (
    <div className="space-y-3">
      {master ? (
        <section className="rounded-xl border border-collx-green/30 bg-collx-green/5 p-4">
          <p className="text-xs font-bold tracking-wide text-collx-green uppercase">Master set</p>
          <h3 className="font-display text-lg font-bold">{master.manifest.name}</h3>
          <p className="mt-1 text-sm text-muted">
            {master.ownedCount}/{master.manifest.cards.length} cards · {master.completionPct}% complete
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel">
            <div className="h-full bg-collx-green" style={{ width: `${master.completionPct}%` }} />
          </div>
          <p className="mt-2 text-sm font-semibold text-collx-green">
            Cost to complete: {formatMoney(master.costToComplete)}
          </p>
          {master.missing.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-muted">
                {master.missing.length} missing cards
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
                {master.missing.slice(0, 40).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2 rounded-lg bg-panel px-2 py-1.5">
                    <span className="truncate">
                      #{c.number} {c.name}
                    </span>
                    <span className="shrink-0 font-semibold text-collx-green">{formatMoney(c.market)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      {!sets.length ? (
        <p className="rounded-xl border border-dashed border-line bg-panel px-4 py-10 text-center text-sm text-muted">
          Add cards with a set name to track sets here.
        </p>
      ) : sets.map((set) => (
        <details key={set.key} className="overflow-hidden rounded-xl border border-line bg-panel">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{set.label}</p>
              <p className="truncate text-xs text-muted">{set.ownedCount} cards · {formatMoney(set.totalValue)}</p>
            </div>
            <ChevronRight className="size-4 text-muted transition group-open:rotate-90" />
          </summary>
          <div className="border-t border-line p-3">
            <button
              type="button"
              onClick={() => (isPro ? printSetChecklist(set) : onOpenCard(set.cards[0]!))}
              className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-collx-green/40 bg-collx-green/10 px-3 text-xs font-semibold text-collx-green"
            >
              {isPro ? <Printer className="size-3.5" /> : <Lock className="size-3.5" />}
              {isPro ? "Print checklist" : "Pro · print checklist"}
            </button>
            <div className="grid grid-cols-3 gap-2">
              {set.cards.map((card) => (
                <CollectionCardTile key={card.id} card={card} onClick={() => onOpenCard(card)} />
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
