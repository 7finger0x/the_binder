"use client";

import type { StackGroup } from "@/lib/portfolio";
import type { Card } from "@/lib/cards";
import { CollectionCardTile } from "./collection-card-tile";
import { formatMoney } from "@/lib/portfolio";

export function StacksView({ stacks, onOpenCard }: { stacks: StackGroup[]; onOpenCard: (card: Card) => void }) {
  if (!stacks.length) {
    return <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">Tag cards with a stack name to organize them here.</p>;
  }
  return (
    <div className="space-y-3">
      {stacks.map((stack) => (
        <details key={stack.key} className="rounded-xl border border-line bg-panel" open={stack.label !== "Unsorted"}>
          <summary className="cursor-pointer list-none px-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
            {stack.label} · {stack.count} · {formatMoney(stack.totalValue)}
          </summary>
          <div className="grid grid-cols-3 gap-2 border-t border-line p-3">
            {stack.cards.map((card) => (
              <CollectionCardTile key={card.id} card={card} onClick={() => onOpenCard(card)} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
