"use client";

import { Check, Sparkles } from "lucide-react";
import {
  FREE_FEATURES,
  PRO_FEATURES,
  PRO_MONTHLY_USD,
  PRO_TRIAL_DAYS,
  formatProPrice,
  monthlySavingsVsCollxPro,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

export function ProUpgradeCard({
  isPro,
  trialDaysLeft,
  onStartTrial,
  compact,
}: {
  isPro: boolean;
  trialDaysLeft: number | null;
  onStartTrial: () => void;
  compact?: boolean;
}) {
  if (isPro) {
    return (
      <section className="rounded-2xl border border-collx-green/40 bg-collx-green/10 p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-collx-green text-white">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="font-bold text-collx-ink">You&apos;re on Pro</p>
            <p className="text-sm text-muted">
              {trialDaysLeft !== null && trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your free trial`
                : "All Pro features unlocked"}
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
        <p className="mt-1 text-sm text-white/90">
          Then {formatProPrice()}/month — save ${monthlySavingsVsCollxPro().toFixed(2)}/mo vs CollX Pro ($9.99)
        </p>
      </div>

      {!compact ? (
        <>
          <div className="border-b border-line px-4 py-3">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Already on Free</p>
            <ul className="mt-2 space-y-1">
              {FREE_FEATURES.slice(0, 4).map((feature) => (
                <li key={feature} className="text-xs text-muted">
                  · {feature}
                </li>
              ))}
            </ul>
          </div>
          <ul className="space-y-2 border-b border-line px-4 py-4">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Pro adds</p>
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-collx-green" strokeWidth={2.5} />
                {feature}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="p-4">
        <button
          type="button"
          onClick={onStartTrial}
          className={cn(
            "h-12 w-full rounded-xl bg-[#2563eb] text-sm font-bold tracking-wide text-white uppercase",
            "shadow-[0_4px_14px_rgba(37,99,235,0.45)]",
          )}
        >
          Try {PRO_TRIAL_DAYS} days for free
        </button>
        <p className="mt-2 text-center text-xs text-muted">
          ${PRO_MONTHLY_USD.toFixed(2)}/month after trial · cancel anytime
        </p>
      </div>
    </section>
  );
}

export function ProPaywall({
  title,
  message,
  onStartTrial,
  onClose,
}: {
  title: string;
  message: string;
  onStartTrial: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-2xl bg-panel p-5 sm:rounded-2xl">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onStartTrial}
            className="h-12 w-full rounded-xl bg-[#2563eb] text-sm font-bold text-white"
          >
            Start {PRO_TRIAL_DAYS}-day free trial
          </button>
          <button type="button" onClick={onClose} className="h-11 w-full text-sm font-semibold text-muted">
            Not now
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-muted">{formatProPrice()}/mo after trial · vs $9.99 on CollX</p>
      </div>
    </div>
  );
}
