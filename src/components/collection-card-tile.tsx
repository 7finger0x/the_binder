"use client";

import { LogoMark } from "@/components/logo";
import { formatMoney, cardValue } from "@/lib/portfolio";
import type { Card } from "@/lib/cards";
import { cn } from "@/lib/utils";

export function CollectionCardTile({
  card,
  onClick,
  showStack = true,
}: {
  card: Card;
  onClick: () => void;
  showStack?: boolean;
}) {
  const value = cardValue(card);
  const hasValue = value > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 overflow-hidden rounded-xl bg-panel text-left shadow-sm ring-1 ring-line"
    >
      <div className="relative">
        {card.image ? (
          <img src={card.image} alt="" className="aspect-[5/7] w-full object-cover" />
        ) : (
          <div className="aspect-[5/7] grid place-items-center bg-gradient-to-br from-collx-navy to-collx-green p-3">
            <LogoMark className="size-10 text-white" title={card.name} />
          </div>
        )}
        {hasValue ? (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-collx-ink/85 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
            {formatMoney(value)}
          </span>
        ) : null}
        {card.status === "wishlist" ? (
          <span className="absolute top-1.5 right-1.5 rounded-md bg-collx-orange px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
            Want
          </span>
        ) : null}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-bold leading-tight">{card.name}</p>
        <p className={cn("truncate text-[10px] text-muted", !card.setName && !card.stack && "invisible")}>
          {showStack && card.stack.trim()
            ? card.stack.trim()
            : [card.year, card.setName, card.number ? `#${card.number}` : ""].filter(Boolean).join(" · ")}
        </p>
      </div>
    </button>
  );
}
