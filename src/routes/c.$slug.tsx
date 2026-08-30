import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadSharedCollection } from "@/lib/cloud";
import type { Card } from "@/lib/cards";
import { LogoLockup } from "@/components/logo";
import { FlipThumb } from "@/components/card-photos";

export const Route = createFileRoute("/c/$slug")({ component: SharedBinder });

function SharedBinder() {
  const { slug } = Route.useParams();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSharedCollection({ data: slug }).then((res) => {
      if (!res.ok) {
        setError(res.error);
        setCards([]);
        return;
      }
      setCards(res.cards);
      setOwnerName(res.ownerName);
    });
  }, [slug]);

  const binderPages = useMemo(() => binderPagesFrom(cards || []), [cards]);
  const sealed = (cards || []).filter((c) => c.kind === "sealed");
  const count = cards?.length ?? 0;

  return (
    <main className="mx-auto min-h-dvh max-w-3xl overflow-x-clip px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex items-center gap-3 border-b border-line pb-4">
        <Link to="/" className="min-w-0 flex-1">
          <LogoLockup showTagline titleAs="h1" />
        </Link>
      </header>
      <p className="font-display text-xl">
        {ownerName ? `${possessive(ownerName)} catalog` : "Public collection"}
      </p>
      <p className="mt-1 mb-6 text-sm text-muted">
        {!cards ? "Loading catalog…" : error ? "This link isn’t active." : `${count} owned card${count === 1 ? "" : "s"} · View only`}
      </p>
      {error ? <p className="mb-6 text-sm text-danger">{error}</p> : null}
      {!cards && !error ? <p className="text-sm text-muted">Loading…</p> : null}
      {cards && !error && count === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          This catalog is empty.
        </p>
      ) : null}
      {cards && count > 0
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
                      <div className="mb-1 aspect-[5/7] grid place-items-center rounded-sm bg-raised text-[10px] text-muted">
                        {p + 1}
                      </div>
                    )}
                    <p className="truncate text-[11px] font-bold leading-tight sm:text-xs">{c?.name || ""}</p>
                    <p className="hidden truncate text-xs text-muted sm:block">
                      {c
                        ? [c.year, c.brand, c.number ? `#${c.number}` : "", c.value]
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
                    {[c.year, c.setName, c.number ? `#${c.number}` : "", c.condition, c.value]
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
        <Link to="/" className="font-semibold text-accent-2">
          Start your own binder
        </Link>
      </p>
    </main>
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
