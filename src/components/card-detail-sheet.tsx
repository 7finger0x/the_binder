"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { FlipThumb } from "@/components/card-photos";
import { conditionMultiplier } from "@/lib/condition";
import { lookupComps, type SoldComp } from "@/lib/comps";
import { formatMoney, cardValue, cardRawValue } from "@/lib/portfolio";
import { sparklinePoints } from "@/lib/price-history";
import { marketplaceUrls, type Card } from "@/lib/cards";

export function CardDetailSheet({
  card,
  pricing,
  onClose,
  onEdit,
  onDelete,
  onLookupPrice,
  onToggleWishlist,
  onToggleTrade,
  onToggleWant,
}: {
  card: Card;
  pricing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLookupPrice: () => void;
  onToggleWishlist: () => void;
  onToggleTrade?: () => void;
  onToggleWant?: () => void;
}) {
  const adjusted = cardValue(card);
  const raw = cardRawValue(card);
  const links = {
    tcgplayerUrl: card.tcgplayerUrl || marketplaceUrls(card).tcgplayerUrl,
    ebayUrl: card.ebayUrl || marketplaceUrls(card).ebayUrl,
    pricechartingUrl: card.pricechartingUrl || marketplaceUrls(card).pricechartingUrl,
    point130Url: card.point130Url || marketplaceUrls(card).point130Url,
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
          <div className="mt-4 rounded-xl bg-gradient-to-r from-brand-blue to-brand-orange p-4 text-white">
            <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">Your value</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{formatMoney(adjusted)}</p>
            {card.condition && raw !== adjusted ? (
              <p className="mt-1 text-xs text-white/80">
                Market {formatMoney(raw)} · {Math.round(conditionMultiplier(card.condition) * 100)}% for {card.condition}
              </p>
            ) : null}
            {card.marketSource ? <p className="mt-1 text-xs text-white/70">{card.marketSource}</p> : null}
            <PriceHistorySparkline snapshots={card.valueSnapshots} />
          </div>
          <CompsPanel card={card} />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Detail label="Set" value={card.setName || "—"} />
            <Detail label="Number" value={card.number ? `#${card.number}` : "—"} />
            <Detail label="Condition" value={card.condition || "—"} />
            <Detail label="Status" value={card.status === "wishlist" ? "Wishlist" : card.tradeStatus === "for_trade" ? "For trade" : card.tradeStatus === "want" ? "Want list" : "Owned"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <MarketButton href={links.ebayUrl} label="eBay sold" />
            <MarketButton href={links.point130Url} label="130point" />
            <MarketButton href={links.tcgplayerUrl} label="TCGplayer" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" disabled={pricing} onClick={onLookupPrice} className="h-11 rounded-xl bg-collx-green text-sm font-bold text-white disabled:opacity-50">
              {pricing ? "Looking up…" : "Get market price"}
            </button>
            <button type="button" onClick={onToggleWishlist} className="h-11 rounded-xl border border-line text-sm font-semibold">
              {card.status === "wishlist" ? "Mark owned" : "Add to wishlist"}
            </button>
            {onToggleTrade ? (
              <button type="button" onClick={onToggleTrade} className="col-span-2 h-11 rounded-xl border border-collx-green/40 bg-collx-green/10 text-sm font-semibold text-collx-green">
                {card.tradeStatus === "for_trade" ? "Remove from trade list" : "Add to trade list"}
              </button>
            ) : null}
            {onToggleWant ? (
              <button type="button" onClick={onToggleWant} className="col-span-2 h-11 rounded-xl border border-line text-sm font-semibold">
                {card.tradeStatus === "want" ? "Remove from want list" : "Add to want list"}
              </button>
            ) : null}
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

function CompsPanel({ card }: { card: Card }) {
  const [loading, setLoading] = useState(true);
  const [comps, setComps] = useState<SoldComp[]>([]);
  const [soldMedian, setSoldMedian] = useState<number | null>(null);
  const [marketEstimate, setMarketEstimate] = useState<number | null>(null);
  const [marketSource, setMarketSource] = useState("");
  const [ebayUrl, setEbayUrl] = useState("");
  const [point130Url, setPoint130Url] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void lookupComps(card).then((result) => {
      if (cancelled) return;
      setComps(result.comps);
      setSoldMedian(result.soldMedian);
      setMarketEstimate(result.marketEstimate > 0 ? result.marketEstimate : null);
      setMarketSource(result.marketSource);
      setEbayUrl(result.ebaySearchUrl);
      setPoint130Url(result.point130Url);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [card.id, card.name, card.setName, card.number, card.condition]);

  return (
    <section className="mt-4 rounded-xl border border-line bg-pocket p-3">
      <p className="text-xs font-bold tracking-wide text-muted uppercase">Pricing</p>
      {soldMedian ? (
        <p className="mt-1 text-lg font-bold tabular-nums text-collx-green">
          Recent sold median {formatMoney(soldMedian)}{" "}
          <span className="text-xs font-normal text-muted">({comps.length} eBay sales)</span>
        </p>
      ) : marketEstimate ? (
        <p className="mt-1 text-lg font-bold tabular-nums">
          Market estimate {formatMoney(marketEstimate)}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">{loading ? "Loading comps…" : "No sold comps — verify on eBay or 130point"}</p>
      )}
      {soldMedian && marketEstimate && Math.abs(marketEstimate - soldMedian) > 0.01 ? (
        <p className="mt-1 text-xs text-muted">
          Market estimate {formatMoney(marketEstimate)}
          {marketEstimate > soldMedian ? " · may run high vs solds" : " · close to sold median"}
        </p>
      ) : null}
      {marketSource ? <p className="mt-1 text-[11px] text-muted">{marketSource}</p> : null}
      {comps.length > 0 ? (
        <ul className="mt-3 max-h-48 space-y-2 overflow-auto">
          {comps.map((comp, i) => (
            <li key={`${comp.url}-${i}`} className="rounded-lg bg-panel px-3 py-2 text-xs">
              <div className="flex justify-between gap-2">
                <p className="line-clamp-2 font-medium">{comp.title}</p>
                <p className="shrink-0 font-bold text-collx-green">{formatMoney(comp.soldPrice)}</p>
              </div>
              {comp.url ? (
                <a href={comp.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-0.5 text-collx-green">
                  View <ExternalLink className="size-3" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <MarketButton href={ebayUrl} label="Search eBay sold" />
          <MarketButton href={point130Url} label="130point" />
        </div>
      ) : null}
    </section>
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
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-collx-green">
      {label} <ExternalLink className="size-3" />
    </a>
  );
}

function PriceHistorySparkline({ snapshots }: { snapshots: Card["valueSnapshots"] }) {
  const path = sparklinePoints(snapshots);
  if (!path) return <p className="mt-3 text-[11px] text-white/60">Price history builds as you refresh prices.</p>;
  return (
    <svg viewBox="0 0 100 36" className="mt-3 h-9 w-full text-collx-lime" aria-label="Price history">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
