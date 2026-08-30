"use client";

import { formatMoney, cardValue } from "@/lib/portfolio";
import type { Card } from "@/lib/cards";
import { FlipThumb } from "@/components/card-photos";

export function CollectionCardTile({ card, onClick }: { card: Card; onClick: () => void }) {
  const value = cardValue(card);
  return (
    <button type="button" onClick={onClick} className="overflow-hidden rounded-lg border border-line bg-panel text-left">
      <FlipThumb front={card.image} back={card.imageBack} />
      <div className="p-2">
        <p className="truncate text-xs font-bold">{card.name}</p>
        <p className="truncate text-[10px] text-muted">{card.setName || card.year}</p>
        {value ? <p className="mt-1 text-xs font-bold text-binder-blue">{formatMoney(value)}</p> : null}
      </div>
    </button>
  );
}
