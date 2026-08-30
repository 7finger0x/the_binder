"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { FREE_CARD_LIMIT, PRO_TRIAL_DAYS, formatProPrice, proStatusLabel } from "@/lib/subscription";
import { annualSavingsVsCollxPro, formatMoney, type PortfolioStats } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

export function PortfolioHero({
  stats,
  refreshing,
  isPro,
  onRefreshPrices,
  onScan,
  onUpgrade,
}: {
  stats: PortfolioStats;
  refreshing: boolean;
  isPro: boolean;
  onRefreshPrices: () => void;
  onScan: () => void;
  onUpgrade: () => void;
}) {
  return (
    <section className="collx-hero -mx-4 mb-4 px-4 pb-5 pt-1 text-white">
      <div className="flex flex-wrap items-center gap-2">
        {isPro ? (
          <span className="rounded-full bg-collx-lime px-2.5 py-0.5 text-[11px] font-bold text-collx-ink uppercase">
            {proStatusLabel()}
          </span>
        ) : (
          <span className="rounded-full bg-collx-lime px-2.5 py-0.5 text-[11px] font-bold text-collx-ink uppercase">
            Free forever
          </span>
        )}
        {!isPro ? (
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/90">
            Unlimited scans · up to {FREE_CARD_LIMIT} cards
          </span>
        ) : (
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/90">
            Pro {formatProPrice()}/mo vs CollX $9.99
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold tracking-wide text-white/70 uppercase">Portfolio value</p>
      <p className="mt-1 font-display text-4xl font-bold tracking-tight tabular-nums">
        {formatMoney(stats.ownedValue)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <StatPill label="Cards" value={String(stats.ownedCount)} />
        <StatPill label="Priced" value={String(stats.pricedCount)} />
        {stats.wishlistCount > 0 ? (
          <StatPill label="Wishlist" value={formatMoney(stats.wishlistValue)} />
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onScan}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-collx-lime font-semibold text-collx-ink"
        >
          <Sparkles className="size-4" />
          Scan & price
        </button>
        <button
          type="button"
          disabled={refreshing}
          onClick={onRefreshPrices}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-xl border font-semibold disabled:opacity-50",
            isPro ? "border-white/25 bg-white/10 text-white" : "border-[#2563eb]/50 bg-[#2563eb]/20 text-white",
          )}
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          {refreshing ? "Updating…" : isPro ? "Refresh prices" : "Pro · refresh all"}
        </button>
      </div>
      {!isPro ? (
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-3 w-full text-center text-xs text-white/80 underline-offset-2 hover:underline"
        >
          Pro from {formatProPrice()}/mo · {PRO_TRIAL_DAYS}-day free trial — save {formatMoney(annualSavingsVsCollxPro())}/year vs CollX
        </button>
      ) : null}
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-white/90">
      <span className="text-white/60">{label} </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}
