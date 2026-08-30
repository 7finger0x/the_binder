"use client";

import { FREE_CARD_LIMIT, PRO_TRIAL_DAYS, formatProPrice, proStatusLabel } from "@/lib/subscription";
import { formatMoney, type PortfolioStats } from "@/lib/portfolio";
import { portfolioValueTrend } from "@/lib/price-history";
import { cn } from "@/lib/utils";

export function PortfolioHero({
  stats,
  isPro,
  trialDaysLeft,
  refreshing,
  valueTrend,
  onRefreshPrices,
  onUpgrade,
}: {
  stats: PortfolioStats;
  isPro: boolean;
  trialDaysLeft: number | null;
  refreshing: boolean;
  valueTrend?: ReturnType<typeof portfolioValueTrend>;
  onRefreshPrices: () => void;
  onUpgrade: () => void;
}) {
  return (
    <section className="brand-hero mb-4 overflow-hidden rounded-2xl p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-white/80 uppercase">Portfolio</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatMoney(stats.ownedValue)}</p>
          <p className="mt-1 text-sm text-white/85">
            {stats.ownedCount} owned · {stats.pricedCount} priced
            {stats.wishlistCount ? ` · ${stats.wishlistCount} wishlist` : ""}
          </p>
          {valueTrend ? (
            <p className={cn("mt-1 text-xs font-semibold tabular-nums", valueTrend.delta >= 0 ? "text-white/90" : "text-orange-200")}>
              {valueTrend.delta >= 0 ? "+" : ""}
              {formatMoney(valueTrend.delta)} ({valueTrend.pct >= 0 ? "+" : ""}
              {valueTrend.pct.toFixed(1)}%) last 30 days
            </p>
          ) : null}
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", isPro ? "bg-white/20" : "bg-white/10")}>
          {proStatusLabel()}
        </span>
      </div>
      {!isPro ? (
        <p className="mt-2 text-xs text-white/80">Unlimited scans · up to {FREE_CARD_LIMIT} cards · share link free</p>
      ) : trialDaysLeft ? (
        <p className="mt-2 text-xs text-white/80">Pro trial · {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={refreshing}
          onClick={isPro ? onRefreshPrices : onUpgrade}
          className="h-10 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold"
        >
          {refreshing ? "Updating…" : isPro ? "Refresh all prices" : `Pro · bulk refresh · ${formatProPrice()}/mo`}
        </button>
      </div>
    </section>
  );
}
