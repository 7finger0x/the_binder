"use client";

import { useMemo, useState } from "react";
import { PRO_TRIAL_DAYS } from "@/lib/subscription";
import { ChevronRight, Layers, Search } from "lucide-react";
import { formatMoney, type StackGroup } from "@/lib/portfolio";
import type { Card } from "@/lib/cards";
import { CollectionCardTile } from "./collection-card-tile";

export function StacksView({
  stacks,
  onOpenCard,
}: {
  stacks: StackGroup[];
  onOpenCard: (card: Card) => void;
}) {
  const [query, setQuery] = useState("");
  const namedStacks = stacks.filter((s) => s.label !== "Unsorted");
  const hasNamedStacks = namedStacks.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stacks;
    return stacks.filter((s) => s.label.toLowerCase().includes(q));
  }, [stacks, query]);

  if (!hasNamedStacks) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-panel px-4 py-10 text-center">
        <Layers className="mx-auto size-10 text-muted" />
        <p className="mt-3 text-sm font-semibold text-ink">No stacks yet</p>
        <p className="mt-1 text-sm text-muted">
          Edit a card and add a stack name — like &ldquo;Rookies&rdquo; or &ldquo;PC hits&rdquo;. Stacks view is included in your{" "}
          {PRO_TRIAL_DAYS}-day Pro trial.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Cards grouped by stack — tag them when editing. Pro feature included in your {PRO_TRIAL_DAYS}-day trial.
      </p>
      {stacks.length > 3 ? (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stacks…"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted">No stacks match &ldquo;{query}&rdquo;</p>
      ) : null}
      {filtered.map((stack) => (
        <details key={stack.key} className="group overflow-hidden rounded-xl border border-line bg-panel">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <Layers className="size-5 shrink-0 text-collx-green" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{stack.label}</p>
              <p className="text-xs text-muted">
                {stack.count} card{stack.count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-collx-green">{formatMoney(stack.totalValue)}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted transition group-open:rotate-90" />
          </summary>
          <div className="border-t border-line p-3">
            <div className="grid grid-cols-3 gap-2">
              {stack.cards.map((card) => (
                <CollectionCardTile key={card.id} card={card} showStack={false} onClick={() => onOpenCard(card)} />
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
