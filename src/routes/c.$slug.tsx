import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadSharedCollection } from "@/lib/cloud";
import type { Card } from "@/lib/cards";

export const Route = createFileRoute("/c/$slug")({ component: SharedBinder });

function SharedBinder() {
  const { slug } = Route.useParams();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSharedCollection({ data: slug }).then((res) => {
      if (!res.ok) {
        setError(res.error);
        setCards([]);
        return;
      }
      setCards(res.cards);
    });
  }, [slug]);

  const pages = Math.max(1, Math.ceil((cards || []).filter((c) => c.kind === "single").length / 9));

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl">
        The Card <span className="text-accent-2">Binder</span>
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted">Public collection</p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!cards ? <p className="text-sm text-muted">Loading…</p> : null}
      {cards
        ? Array.from({ length: pages }, (_, i) => {
            const slice = cards.filter((c) => c.kind === "single").slice(i * 9, i * 9 + 9);
            return (
              <div key={i} className="mb-4 rounded-lg border border-line bg-panel p-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Page {i + 1}</p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, p) => {
                    const c = slice[p];
                    return (
                      <div key={p} className="min-h-28 rounded-sm border border-line bg-pocket p-2">
                        {c?.image ? (
                          <img src={c.image} alt="" className="mb-1 h-16 w-full rounded-sm object-cover" />
                        ) : null}
                        <p className="text-xs font-bold leading-snug">{c?.name || ""}</p>
                        <p className="text-xs text-muted">
                          {c ? [c.year, c.setName, c.number ? `#${c.number}` : ""].filter(Boolean).join(" · ") : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        : null}
    </main>
  );
}
