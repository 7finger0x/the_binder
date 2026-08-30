"use client";

import { ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { FlipThumb } from "@/components/card-photos";
import { formatMoney, cardValue } from "@/lib/portfolio";
import { marketplaceUrls, type Card } from "@/lib/cards";

export function CardDetailSheet({
  card,
  pricing,
  onClose,
  onEdit,
  onDelete,
  onLookupPrice,
  onToggleWishlist,
}: {
  card: Card;
  pricing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLookupPrice: () => void;
  onToggleWishlist: () => void;
}) {
  const value = cardValue(card);
  const links = {
    tcgplayerUrl: card.tcgplayerUrl || marketplaceUrls(card).tcgplayerUrl,
    ebayUrl: card.ebayUrl || marketplaceUrls(card).ebayUrl,
    pricechartingUrl: card.pricechartingUrl || marketplaceUrls(card).pricechartingUrl,
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-auto rounded-t-2xl bg-panel pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-4 py-3">
          <h2 className="truncate font-display text-lg font-bold">{card.name}</h2>
          <button type="button" className="grid size-11 place-items-center" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mx-auto max-w-[220px]">
            <FlipThumb front={card.image} back={card.imageBack} />
          </div>

          <div className="mt-4 rounded-xl bg-collx-navy p-4 text-white">
            <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">Market value</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{formatMoney(value)}</p>
            {card.marketSource ? <p className="mt-1 text-xs text-white/70">{card.marketSource}</p> : null}
            <PriceSparkline seed={value || card.name.length} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Detail label="Set" value={card.setName || "—"} />
            <Detail label="Number" value={card.number ? `#${card.number}` : "—"} />
            <Detail label="Year" value={card.year || "—"} />
            <Detail label="Category" value={card.category} />
            <Detail label="Condition" value={card.condition || "—"} />
            <Detail label="Grade" value={card.grade || "—"} />
            <Detail label="Qty" value={card.qty || "1"} />
            <Detail label="Status" value={card.status === "wishlist" ? "Wishlist" : "Owned"} />
            <Detail label="Stack" value={card.stack || "—"} />
            <Detail label="Location" value={card.location || "—"} />
          </dl>

          {card.notes ? (
            <p className="mt-3 rounded-lg bg-pocket px-3 py-2 text-sm text-muted">{card.notes}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <MarketButton href={links.ebayUrl} label="eBay sold" />
            <MarketButton href={links.tcgplayerUrl} label="TCGplayer" />
            <MarketButton href={links.pricechartingUrl} label="PriceCharting" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pricing}
              onClick={onLookupPrice}
              className="h-11 rounded-xl bg-collx-green text-sm font-bold text-white disabled:opacity-50"
            >
              {pricing ? "Looking up…" : "Get market price"}
            </button>
            <button
              type="button"
              onClick={onToggleWishlist}
              className="h-11 rounded-xl border border-line text-sm font-semibold"
            >
              {card.status === "wishlist" ? "Mark owned" : "Add to wishlist"}
            </button>
            <button type="button" onClick={onEdit} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold">
              <Pencil className="size-4" /> Edit
            </button>
            <button type="button" onClick={onDelete} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-danger">
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-pocket px-3 py-2">
      <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold">{value}</dd>
    </div>
  );
}

function MarketButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-pocket px-3 py-1.5 text-xs font-semibold text-collx-green"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}

function PriceSparkline({ seed }: { seed: number }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const wave = Math.sin((i + seed) * 0.7) * 0.12 + Math.cos((i + seed) * 0.35) * 0.08;
    return 0.55 + wave + (i / 24);
  });
  const d = points
    .map((y, i) => {
      const x = (i / (points.length - 1)) * 100;
      const py = (1 - y) * 28 + 4;
      return `${i === 0 ? "M" : "L"}${x},${py}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 36" className="mt-3 h-9 w-full text-collx-lime" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
