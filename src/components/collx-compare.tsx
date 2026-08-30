"use client";

import { Check, X } from "lucide-react";
import { COLLX_PRO_MONTHLY_USD, COLLX_TRIAL_DAYS, FREE_CARD_LIMIT, FREE_FEATURES, PRO_MONTHLY_USD, PRO_TRIAL_DAYS, formatProPrice } from "@/lib/subscription";
import { annualSavingsVsCollxPro, formatMoney } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

type CellValue = boolean | "unlimited" | "limited";

const FEATURES: { label: string; binderFree: CellValue; binderPro: CellValue; collxPro: CellValue }[] = [
  { label: "Scan & identify cards", binderFree: true, binderPro: true, collxPro: true },
  { label: "Scans", binderFree: "unlimited", binderPro: "unlimited", collxPro: "unlimited" },
  { label: "Collection size", binderFree: "limited", binderPro: "unlimited", collxPro: "unlimited" },
  { label: "Sold comps on card detail", binderFree: true, binderPro: true, collxPro: false },
  { label: "Public share link", binderFree: true, binderPro: true, collxPro: true },
  { label: "Binder page layout", binderFree: true, binderPro: true, collxPro: false },
  { label: "Bulk price refresh", binderFree: false, binderPro: true, collxPro: true },
  { label: "CSV / JSON export", binderFree: false, binderPro: true, collxPro: true },
];

export function CollxCompare({ isPro, onUpgrade }: { isPro?: boolean; onUpgrade?: () => void }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="border-b border-line bg-collx-green/5 px-4 py-5">
        <p className="text-xs font-bold tracking-wide text-collx-green uppercase">Free forever</p>
        <h2 className="mt-1 font-display text-xl font-bold">$0 — no credit card</h2>
        <ul className="mt-3 space-y-1.5">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 text-collx-green" />{f}</li>
          ))}
        </ul>
        {!isPro && onUpgrade ? (
          <button type="button" onClick={onUpgrade} className="mt-4 text-sm font-semibold text-collx-green underline-offset-2 hover:underline">
            Try Pro {PRO_TRIAL_DAYS} days free →
          </button>
        ) : null}
      </div>
      <div className="brand-hero px-4 py-5 text-white">
        <h2 className="font-display text-xl font-bold">Same Pro power — 40% cheaper</h2>
        <p className="mt-2 text-sm text-white/85">
          CollX Pro ${COLLX_PRO_MONTHLY_USD.toFixed(2)}/mo ({COLLX_TRIAL_DAYS}d trial) · Binder Pro {formatProPrice()}/mo ({PRO_TRIAL_DAYS}d trial)
        </p>
        <p className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Save {formatMoney(annualSavingsVsCollxPro())}/year</p>
      </div>
      <div className="overflow-x-auto p-2">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="px-2 py-2 text-left">Feature</th>
              <th className="px-2 py-2">Free</th>
              <th className="px-2 py-2 text-collx-green">Pro</th>
              <th className="px-2 py-2">CollX</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row) => (
              <tr key={row.label} className="border-t border-line/70">
                <td className="px-2 py-2">{row.label}</td>
                <Cell value={row.binderFree} />
                <Cell value={row.binderPro} highlight />
                <Cell value={row.collxPro} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cell({ value, highlight }: { value: CellValue; highlight?: boolean }) {
  return (
    <td className={cn("px-2 py-2 text-center", highlight && "bg-collx-green/5")}>
      {value === true ? <Check className="mx-auto size-4 text-collx-green" /> :
       value === "unlimited" ? <span className="text-[11px] font-bold text-collx-green">∞</span> :
       value === "limited" ? <span className="text-[10px] text-muted">{FREE_CARD_LIMIT}</span> :
       <X className="mx-auto size-4 text-muted/50" />}
    </td>
  );
}
