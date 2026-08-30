"use client";

import { Check, X } from "lucide-react";
import {
  COLLX_PRO_MONTHLY_USD,
  COLLX_TRIAL_DAYS,
  FREE_CARD_LIMIT,
  FREE_FEATURES,
  PRO_MONTHLY_USD,
  PRO_TRIAL_DAYS,
  formatProPrice,
} from "@/lib/subscription";
import { annualSavingsVsCollxPro, formatMoney } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

type CellValue = boolean | "unlimited" | "limited";

const FEATURES: {
  label: string;
  binderFree: CellValue;
  binderPro: CellValue;
  collxPro: CellValue;
}[] = [
  { label: "Scan & identify cards", binderFree: true, binderPro: true, collxPro: true },
  { label: "Scans", binderFree: "unlimited", binderPro: "unlimited", collxPro: "unlimited" },
  { label: "Collection size", binderFree: "limited", binderPro: "unlimited", collxPro: "unlimited" },
  { label: "Portfolio value tracking", binderFree: true, binderPro: true, collxPro: true },
  { label: "Market price lookup", binderFree: true, binderPro: true, collxPro: true },
  { label: "Bulk price refresh", binderFree: false, binderPro: true, collxPro: true },
  { label: "Organize stacks", binderFree: false, binderPro: "unlimited", collxPro: "unlimited" },
  { label: "Save card locations", binderFree: true, binderPro: true, collxPro: true },
  { label: "Set checklists (print)", binderFree: false, binderPro: true, collxPro: true },
  { label: "Export CSV / JSON", binderFree: false, binderPro: true, collxPro: true },
  { label: "Cloud sync (signed in)", binderFree: true, binderPro: true, collxPro: true },
  { label: "Public share link", binderFree: false, binderPro: true, collxPro: true },
  { label: "Binder page layout", binderFree: true, binderPro: true, collxPro: false },
];

const COLLX_WINS = [
  { label: "In-app marketplace", detail: "Buy and sell inside CollX" },
  { label: "$10/mo store credit", detail: "CollX Pro perk" },
  { label: "CollX AI chat coach", detail: "Collection advice in-app" },
  { label: "Featured seller listings", detail: "Dealer visibility tools" },
] as const;

export function CollxCompare({ isPro, onUpgrade }: { isPro?: boolean; onUpgrade?: () => void }) {
  const savings = formatMoney(annualSavingsVsCollxPro());

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="border-b border-line bg-collx-green/5 px-4 py-5">
        <p className="text-xs font-bold tracking-wide text-collx-green uppercase">Free forever</p>
        <h2 className="mt-1 font-display text-xl font-bold text-ink">$0 — no credit card</h2>
        <ul className="mt-3 space-y-1.5">
          {FREE_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-ink">
              <Check className="mt-0.5 size-4 shrink-0 text-collx-green" strokeWidth={2.5} />
              {feature}
            </li>
          ))}
        </ul>
        {isPro ? (
          <p className="mt-4 text-sm font-semibold text-collx-green">You&apos;re on Pro — thanks for supporting The Binder.</p>
        ) : onUpgrade ? (
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-4 text-sm font-semibold text-collx-green underline-offset-2 hover:underline"
          >
            You&apos;re on Free — try Pro {PRO_TRIAL_DAYS} days free →
          </button>
        ) : (
          <p className="mt-4 text-sm text-muted">You&apos;re on Free.</p>
        )}
      </div>

      <div className="bg-gradient-to-br from-collx-navy to-[#1b4332] px-4 py-5 text-white">
        <p className="text-xs font-bold tracking-wide text-collx-lime uppercase">Why we beat CollX</p>
        <h2 className="mt-1 font-display text-xl font-bold">Same Pro power — 40% cheaper</h2>
        <p className="mt-2 text-sm text-white/80">
          CollX Pro is <strong className="text-white">${COLLX_PRO_MONTHLY_USD.toFixed(2)}/month</strong> ({COLLX_TRIAL_DAYS}-day trial).
          The Binder Pro is <strong className="text-collx-lime">{formatProPrice()}/month</strong> with a{" "}
          <strong className="text-collx-lime">{PRO_TRIAL_DAYS}-day free trial</strong>.
        </p>
        <p className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
          Save {savings}/year at Pro vs CollX Pro
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="px-3 py-3 font-semibold">Feature</th>
              <th className="px-2 py-3 text-center font-semibold">Free</th>
              <th className="px-2 py-3 text-center font-bold text-collx-green">Pro</th>
              <th className="px-2 py-3 text-center font-semibold">CollX Pro</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row) => (
              <tr key={row.label} className="border-b border-line/70">
                <td className="px-3 py-2.5 text-ink">{row.label}</td>
                <Cell value={row.binderFree} />
                <Cell value={row.binderPro} highlight />
                <Cell value={row.collxPro} />
              </tr>
            ))}
            <tr>
              <td className="px-3 py-3 font-semibold">Price</td>
              <td className="px-2 py-3 text-center font-bold text-collx-green">$0</td>
              <td className="px-2 py-3 text-center font-bold text-collx-green">
                {formatProPrice()}/mo
                <span className="block text-[10px] font-normal text-muted">{PRO_TRIAL_DAYS}-day trial</span>
              </td>
              <td className="px-2 py-3 text-center font-semibold">
                ${COLLX_PRO_MONTHLY_USD.toFixed(2)}/mo
                <span className="block text-[10px] font-normal text-muted">{COLLX_TRIAL_DAYS}-day trial</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-line px-4 py-5">
        <p className="text-xs font-bold tracking-wide text-muted uppercase">Where CollX still leads</p>
        <p className="mt-1 text-sm text-muted">
          We focus on collection, pricing, and binder tools at $0 — not marketplace or dealer perks.
        </p>
        <ul className="mt-4 space-y-3">
          {COLLX_WINS.map((item) => (
            <li key={item.label} className="flex items-start gap-3 rounded-lg bg-raised px-3 py-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted/20 text-[10px] font-bold text-muted">
                —
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <p className="text-xs text-muted">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Cell({ value, highlight }: { value: CellValue; highlight?: boolean }) {
  return (
    <td className={cn("px-2 py-2.5 text-center", highlight && "bg-collx-green/5")}>
      <span className="inline-flex justify-center">
        {value === true ? (
          <Check className="size-4 text-collx-green" strokeWidth={2.5} />
        ) : value === "unlimited" ? (
          <span className="text-[11px] font-bold text-collx-green">∞</span>
        ) : value === "limited" ? (
          <span className="text-[10px] font-semibold text-muted">{FREE_CARD_LIMIT} cap</span>
        ) : (
          <X className="size-4 text-muted/50" strokeWidth={2} />
        )}
      </span>
    </td>
  );
}
