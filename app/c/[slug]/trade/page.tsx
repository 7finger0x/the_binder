import Link from "next/link";
import { loadSharedCollection } from "@/lib/cloud";
import { SharedBinderView } from "@/components/shared-binder-view";
import { TradeFairnessPanel } from "@/components/trade-fairness-panel";
import type { Card } from "@/lib/cards";
import { formatMoney, cardValue } from "@/lib/portfolio";
import { FlipThumb } from "@/components/card-photos";
import { LogoLockup } from "@/components/logo";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TradeListPage({ params }: Props) {
  const { slug } = await params;
  const result = await loadSharedCollection(slug);
  if (!result.ok) {
    return <SharedBinderView result={result} />;
  }

  const tradeCards = result.tradeCards;
  const wantCards = result.wantCards;
  const ownerName = result.ownerName;

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 border-b border-line pb-4">
        <Link href="/">
          <LogoLockup showTagline titleAs="h1" />
        </Link>
      </header>
      <p className="font-display text-xl">{ownerName ? `${ownerName}'s trade pool` : "Trade list"}</p>
      <p className="mt-1 mb-6 text-sm text-muted">
        {tradeCards.length} card{tradeCards.length === 1 ? "" : "s"} available to trade
      </p>
      <Link href={`/c/${slug}`} className="mb-4 inline-block text-sm font-semibold text-accent-2">
        ← Full showcase
      </Link>
      {tradeCards.length > 0 && wantCards.length > 0 ? (
        <TradeFairnessPanel tradeCards={tradeCards} wantCards={wantCards} hideValues={result.hideValues} />
      ) : null}
      {tradeCards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          No cards tagged for trade yet.
        </p>
      ) : (
        <TradeGrid cards={tradeCards} hideValues={result.hideValues} />
      )}
    </main>
  );
}

function TradeGrid({ cards, hideValues }: { cards: Card[]; hideValues: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <article key={card.id} className="rounded-xl border border-line bg-panel p-2">
          <FlipThumb front={card.image} back={card.imageBack} />
          <p className="mt-2 truncate text-sm font-bold">{card.name}</p>
          <p className="truncate text-xs text-muted">
            {[card.setName, card.number ? `#${card.number}` : "", card.condition]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {!hideValues && card.value ? (
            <p className="mt-1 text-sm font-semibold text-collx-green">{formatMoney(cardValue(card))}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
