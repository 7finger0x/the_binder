"use client";

import { ChevronRight, Lock, Printer } from "lucide-react";
import { formatMoney, type SetGroup } from "@/lib/portfolio";
import type { Card } from "@/lib/cards";
import { CollectionCardTile } from "./collection-card-tile";

export function SetsView({
  sets,
  isPro,
  onOpenCard,
  onPrintChecklist,
}: {
  sets: SetGroup[];
  isPro: boolean;
  onOpenCard: (card: Card) => void;
  onPrintChecklist: (set: SetGroup) => void;
}) {
  if (!sets.length) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-panel px-4 py-10 text-center text-sm text-muted">
        Add cards with a set name to track sets here — like CollX set checklists.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sets.map((set) => (
        <details key={set.key} className="group overflow-hidden rounded-xl border border-line bg-panel">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{set.label}</p>
              <p className="truncate text-xs text-muted">
                {[set.year, set.category].filter(Boolean).join(" · ")} · {set.ownedCount} card
                {set.ownedCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-collx-green">{formatMoney(set.totalValue)}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted transition group-open:rotate-90" />
          </summary>
          <div className="border-t border-line p-3">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                {isPro ? (
                  "Print your owned cards as a checklist."
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3" />
                    Pro feature — print your owned cards as a checklist
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => onPrintChecklist(set)}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-collx-green/40 bg-collx-green/10 px-3 text-xs font-semibold text-collx-green"
              >
                <Printer className="size-3.5" />
                Print checklist
              </button>
            </div>
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
