import Link from "next/link";
import type { Card } from "@/lib/cards";
import { formatMoney, cardValue } from "@/lib/portfolio";
import { groupPublicBinders, showcaseInitials } from "@/lib/showcase";
import { LogoLockup } from "@/components/logo";
import { FlipThumb } from "@/components/card-photos";
import { TradeFairnessPanel } from "@/components/trade-fairness-panel";

type SharedResult =
  | {
      ok: true;
      cards: Card[];
      tradeCards: Card[];
      wantCards: Card[];
      wishlistCards: Card[];
      ownerName: string | null;
      showcaseName: string;
      bio: string;
      avatarUrl: string;
      hideValues: boolean;
      slug: string;
    }
  | { ok: false; error: string };

export function SharedBinderView({ result }: { result: SharedResult }) {
  const cards = result.ok ? result.cards : [];
  const tradeCards = result.ok ? result.tradeCards : [];
  const wantCards = result.ok ? result.wantCards : [];
  const wishlistCards = result.ok ? result.wishlistCards : [];
  const ownerName = result.ok ? result.ownerName : null;
  const showcaseName = result.ok ? result.showcaseName : "";
  const bio = result.ok ? result.bio : "";
  const avatarUrl = result.ok ? result.avatarUrl : "";
  const hideValues = result.ok ? result.hideValues : false;
  const slug = result.ok ? result.slug : "";
  const error = result.ok ? "" : result.error;
  const binderGroups = groupPublicBinders(cards);
  const binderPages = binderPagesFrom(cards);
  const sealed = cards.filter((c) => c.kind === "sealed");
  const count = cards.reduce((n, c) => n + (Number(c.qty) || 1), 0);

  return (
    <main className="mx-auto min-h-dvh max-w-3xl overflow-x-clip px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-line pb-4">
        <Link href="/" className="min-w-0 flex-1">
          <LogoLockup showTagline titleAs="h1" />
        </Link>
        <Link href="/featured" className="text-xs font-semibold text-accent-2">
          Featured
        </Link>
      </header>

      <div className="mb-4 flex items-start gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-14 shrink-0 rounded-full object-cover ring-2 ring-line" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-collx-green/15 text-lg font-bold text-collx-green ring-2 ring-line">
            {showcaseInitials(ownerName || "Collector")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl">
            {ownerName ? `${possessive(ownerName)} showcase` : showcaseName || "Public collection"}
          </p>
          {showcaseName && ownerName ? (
            <p className="text-sm font-semibold text-accent-2">{showcaseName}</p>
          ) : null}
          {bio ? <p className="mt-1 text-sm leading-relaxed text-muted">{bio}</p> : null}
          <p className="mt-1 text-sm text-muted">
            {error ? "This link isn’t active." : `${count} owned card${count === 1 ? "" : "s"} · View only`}
          </p>
        </div>
      </div>

      {slug && !error ? (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <Link href={`/c/${slug}/trade`} className="rounded-full border border-line bg-panel px-3 py-1.5 font-semibold text-accent-2">
            Trade pool
          </Link>
          {tradeCards.length > 0 && wantCards.length > 0 ? (
            <span className="rounded-full bg-collx-green/10 px-3 py-1.5 font-semibold text-collx-green">
              {tradeCards.length} for trade · {wantCards.length} wants
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mb-6 text-sm text-danger">{error}</p> : null}

      {!error && tradeCards.length > 0 && wantCards.length > 0 ? (
        <TradeFairnessPanel tradeCards={tradeCards} wantCards={wantCards} hideValues={hideValues} />
      ) : null}

      {!error && tradeCards.length > 0 ? (
        <CardListSection title="For trade" cards={tradeCards} hideValues={hideValues} />
      ) : null}
      {!error && wantCards.length > 0 ? (
        <CardListSection title="Want list" cards={wantCards} hideValues={hideValues} />
      ) : null}
      {!error && wishlistCards.length > 0 ? (
        <CardListSection title="Wishlist" cards={wishlistCards} hideValues={hideValues} />
      ) : null}

      {!error && binderGroups.length > 1 ? (
        <section className="mb-4 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Binders</p>
          {binderGroups.map((group) => (
            <details key={group.key} className="rounded-xl border border-line bg-panel">
              <summary className="cursor-pointer list-none px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                {group.label} · {group.cards.length} cards
              </summary>
              <div className="grid grid-cols-3 gap-2 border-t border-line p-3">
                {group.cards.slice(0, 9).map((c) => (
                  <MiniCard key={c.id} card={c} hideValues={hideValues} />
                ))}
              </div>
            </details>
          ))}
        </section>
      ) : null}

      {!error && count === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          This catalog is empty.
        </p>
      ) : null}

      {!error && count > 0
        ? binderPages.map((slots, i) => (
            <div key={i} className="mb-4 rounded-lg border border-line bg-panel p-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Page {i + 1}</p>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((c, p) => (
                  <div
                    key={p}
                    className={`min-w-0 overflow-hidden rounded-sm border border-line bg-pocket p-1 sm:p-2 ${!c ? "opacity-40" : ""}`}
                  >
                    {c ? (
                      <FlipThumb front={c.image} back={c.imageBack} />
                    ) : (
                      <div className="mb-1 grid aspect-[5/7] place-items-center rounded-sm bg-raised text-[10px] text-muted">
                        {p + 1}
                      </div>
                    )}
                    <p className="truncate text-[11px] font-bold leading-tight sm:text-xs">{c?.name || ""}</p>
                    <p className="hidden truncate text-xs text-muted sm:block">
                      {c
                        ? [
                            c.year,
                            c.brand,
                            c.number ? `#${c.number}` : "",
                            !hideValues && c.value ? c.value : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : `Pocket ${p + 1}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        : null}

      {sealed.length ? (
        <div className="mb-4 rounded-lg border border-line bg-panel p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Sealed product</p>
          <div className="space-y-2">
            {sealed.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-sm border border-line bg-pocket p-2">
                {c.image ? (
                  <img src={c.image} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="h-14 w-10 shrink-0 rounded-sm bg-raised" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{c.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[c.year, c.setName, c.number ? `#${c.number}` : "", c.condition, !hideValues && c.value ? c.value : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/" className="font-semibold text-accent-2">
          Start your own binder
        </Link>
      </p>
    </main>
  );
}

function MiniCard({ card, hideValues }: { card: Card; hideValues: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-pocket p-1">
      <FlipThumb front={card.image} back={card.imageBack} />
      <p className="truncate px-0.5 text-[10px] font-bold">{card.name}</p>
      {!hideValues && card.value ? (
        <p className="truncate px-0.5 text-[10px] text-collx-green">{formatMoney(cardValue(card))}</p>
      ) : null}
    </div>
  );
}

function CardListSection({ title, cards, hideValues }: { title: string; cards: Card[]; hideValues: boolean }) {
  return (
    <section className="mb-4 rounded-lg border border-line bg-panel p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>
      <div className="space-y-2">
        {cards.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-sm border border-line bg-pocket p-2">
            {c.image ? (
              <img src={c.image} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover" />
            ) : (
              <div className="h-14 w-10 shrink-0 rounded-sm bg-raised" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{c.name}</p>
              <p className="truncate text-xs text-muted">
                {[c.setName, c.number ? `#${c.number}` : "", c.condition, !hideValues ? formatMoney(cardValue(c)) : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function possessive(name: string) {
  return name.endsWith("s") || name.endsWith("S") ? `${name}’` : `${name}’s`;
}

function binderPagesFrom(cards: Card[]) {
  const owned = cards.filter((c) => c.kind === "single");
  const placed = new Set<string>();
  const maxPage = Math.max(1, ...owned.map((c) => (c.page > 0 ? c.page : 1)));
  const pages = Array.from({ length: maxPage }, (_, i) => {
    const page = i + 1;
    const slots: (Card | null)[] = Array.from({ length: 9 }, () => null);
    owned.forEach((c) => {
      if (c.page === page && c.pocket >= 0 && c.pocket < 9) {
        slots[c.pocket] = c;
        placed.add(c.id);
      }
    });
    return slots;
  });
  const leftovers = owned.filter((c) => !placed.has(c.id));
  leftovers.forEach((c) => {
    let page = pages.find((slots) => slots.some((slot) => slot === null));
    if (!page) {
      page = Array.from({ length: 9 }, () => null);
      pages.push(page);
    }
    const empty = page.findIndex((slot) => slot === null);
    if (empty >= 0) page[empty] = c;
  });
  if (owned.length === 0) return [];
  return pages.filter((slots) => slots.some(Boolean));
}
