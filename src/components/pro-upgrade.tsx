"use client";

import { Check, Sparkles } from "lucide-react";
import { FREE_FEATURES, PRO_FEATURES, PRO_MONTHLY_USD, PRO_TRIAL_DAYS, formatProPrice, monthlySavingsVsCollxPro } from "@/lib/subscription";
import { cn } from "@/lib/utils";

export function ProUpgradeCard({ isPro, trialDaysLeft, onStartTrial, onCheckout, compact }: {
  isPro: boolean;
  trialDaysLeft: number | null;
  onStartTrial: () => void;
  onCheckout?: () => void;
  compact?: boolean;
}) {
  if (isPro) {
    return (
      <section className="rounded-2xl border border-collx-green/40 bg-collx-green/10 p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-collx-green text-white"><Sparkles className="size-4" /></span>
          <div>
            <p className="font-bold">You&apos;re on Pro</p>
            <p className="text-sm text-muted">
              {trialDaysLeft !== null && trialDaysLeft > 0 ? `${trialDaysLeft}d left in trial` : "All Pro features unlocked"}
            </p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] px-4 py-5 text-white">
        <p className="text-xs font-bold tracking-wide uppercase text-white/80">The Binder Pro</p>
        <h2 className="mt-1 font-display text-2xl font-bold">{PRO_TRIAL_DAYS} days free</h2>
        <p className="mt-1 text-sm text-white/90">Then {formatProPrice()}/month — save ${monthlySavingsVsCollxPro().toFixed(2)}/mo vs CollX</p>
      </div>
      {!compact ? (
        <ul className="space-y-2 border-b border-line px-4 py-4">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 text-collx-green" />{f}</li>
          ))}
        </ul>
      ) : null}
      <div className="p-4 space-y-2">
        <button type="button" onClick={onStartTrial} className={cn("h-12 w-full rounded-xl bg-[#2563eb] text-sm font-bold text-white")}>
          Try {PRO_TRIAL_DAYS} days free
        </button>
        {onCheckout ? (
          <button type="button" onClick={onCheckout} className="h-11 w-full rounded-xl border border-line text-sm font-semibold">
            Subscribe with Stripe
          </button>
        ) : null}
        <p className="text-center text-xs text-muted">${PRO_MONTHLY_USD.toFixed(2)}/month after trial</p>
      </div>
    </section>
  );
}

export function ProPaywall({ title, message, onStartTrial, onCheckout, onClose }: {
  title: string; message: string; onStartTrial: () => void; onCheckout?: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-2xl bg-panel p-5 sm:rounded-2xl">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-4 space-y-2">
          <button type="button" onClick={onStartTrial} className="h-12 w-full rounded-xl bg-[#2563eb] text-sm font-bold text-white">Start {PRO_TRIAL_DAYS}-day trial</button>
          {onCheckout ? <button type="button" onClick={onCheckout} className="h-11 w-full rounded-xl border border-line text-sm font-semibold">Subscribe with Stripe</button> : null}
          <button type="button" onClick={onClose} className="h-11 w-full text-sm font-semibold text-muted">Not now</button>
        </div>
      </div>
    </div>
  );
}

export { FREE_FEATURES };
