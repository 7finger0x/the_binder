"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatMoney, cardValue } from "@/lib/portfolio";
import {
  createListing,
  listActiveListings,
  listListingMessages,
  listMyListings,
  listSellerInbox,
  sendListingMessage,
  withdrawListing,
  type Listing,
} from "@/lib/marketplace";
import { COMMISSION_FREE, COMMISSION_PRO, listingNetProceedsFromRate } from "@/lib/marketplace-fees";
import { getBearerToken } from "@/lib/auth/client";
import type { Card } from "@/lib/cards";

type Tab = "browse" | "mine" | "inbox";

export function MarketplaceView({
  cards,
  isPro,
  userSignedIn,
  onNotify,
}: {
  cards: Card[];
  isPro: boolean;
  userSignedIn: boolean;
  onNotify?: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("browse");
  const [listings, setListings] = useState<Listing[]>([]);
  const [inbox, setInbox] = useState<Awaited<ReturnType<typeof listSellerInbox>>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [pickCardId, setPickCardId] = useState("");
  const [askPrice, setAskPrice] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [thread, setThread] = useState<Awaited<ReturnType<typeof listListingMessages>> | null>(null);

  const owned = useMemo(() => cards.filter((c) => c.status === "owned" && !c.id.startsWith("sample-")), [cards]);
  const listedCardIds = useMemo(() => new Set(listings.map((l) => l.cardId)), [listings]);
  const listable = useMemo(
    () => owned.filter((c) => !listedCardIds.has(c.id)),
    [owned, listedCardIds],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "browse") {
        setListings(await listActiveListings());
      } else if (tab === "mine" && userSignedIn) {
        setListings(await listMyListings(getBearerToken() ?? undefined));
      } else if (tab === "inbox" && userSignedIn) {
        setInbox(await listSellerInbox(getBearerToken() ?? undefined));
      }
    } finally {
      setLoading(false);
    }
  }, [tab, userSignedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitListing() {
    const card = listable.find((c) => c.id === pickCardId);
    const price = Number(askPrice);
    if (!card) {
      onNotify?.("Pick a card to list.");
      return;
    }
    const res = await createListing(card, price, listDescription, getBearerToken() ?? undefined);
    if (!res.ok) {
      onNotify?.(res.error);
      return;
    }
    onNotify?.("Listing created");
    setListOpen(false);
    setPickCardId("");
    setAskPrice("");
    setListDescription("");
    setTab("mine");
    void refresh();
  }

  async function openInboxThread(listingId: string) {
    const res = await listListingMessages(listingId, getBearerToken() ?? undefined);
    setThread(res);
    setSelected(listingId);
  }

  const commissionLabel = `${(isPro ? COMMISSION_PRO : COMMISSION_FREE) * 100}%`;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-panel p-4 text-sm">
        <p className="font-bold">Marketplace</p>
        <p className="mt-1 text-muted">
          Fixed-price listings with {commissionLabel} platform fee
          {isPro ? " (Pro rate)" : ""}. Payments and escrow via Stripe Connect are coming soon — messaging works today.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {(["browse", "mine", "inbox"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`h-10 rounded-lg px-4 text-sm font-semibold capitalize ${tab === id ? "bg-accent text-white" : "border border-line"}`}
          >
            {id === "inbox" ? "Inbox" : id === "mine" ? "My listings" : "Browse"}
          </button>
        ))}
      </div>

      {tab === "mine" && userSignedIn ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setListOpen(true)}
            disabled={!listable.length}
            className="h-10 rounded-lg bg-collx-green px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            List a card
          </button>
          {!listable.length ? (
            <span className="text-xs text-muted">Add owned cards or withdraw an active listing to list more.</span>
          ) : null}
        </div>
      ) : null}

      {tab === "inbox" && !userSignedIn ? (
        <p className="text-sm text-muted">Sign in to read buyer messages on your listings.</p>
      ) : null}

      {loading ? <p className="text-sm text-muted">Loading…</p> : null}

      {tab === "inbox" && userSignedIn ? (
        <div className="space-y-2">
          {!inbox.length && !loading ? <p className="text-sm text-muted">No messages yet.</p> : null}
          {inbox.map((msg) => (
            <article key={msg.id} className="rounded-xl border border-line bg-panel p-4">
              <p className="text-xs font-semibold text-muted">{msg.listingTitle}</p>
              <p className="mt-1 text-sm">{msg.body}</p>
              <p className="mt-2 text-xs text-muted">{new Date(msg.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => (
            <article key={l.id} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{l.title}</p>
                  <p className="text-sm text-collx-green">
                    {formatMoney(l.askingPrice)} · you net{" "}
                    {formatMoney(listingNetProceedsFromRate(l.askingPrice, l.commissionRate))}
                  </p>
                  <p className="text-xs text-muted">
                    {(l.commissionRate * 100).toFixed(1)}% fee locked at listing time
                    {l.status !== "active" ? ` · ${l.status}` : ""}
                  </p>
                  {l.description ? <p className="mt-2 text-sm text-muted">{l.description}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {tab === "browse" && userSignedIn ? (
                    <button
                      type="button"
                      onClick={() => setSelected(selected === l.id ? null : l.id)}
                      className="text-sm font-semibold text-accent-2"
                    >
                      Message
                    </button>
                  ) : null}
                  {tab === "mine" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void openInboxThread(l.id)}
                        className="text-sm font-semibold text-accent-2"
                      >
                        Inbox
                      </button>
                      {l.status === "active" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void withdrawListing(l.id, getBearerToken() ?? undefined).then((res) => {
                              if (!res.ok) onNotify?.(res.error);
                              else {
                                onNotify?.("Listing withdrawn");
                                void refresh();
                              }
                            })
                          }
                          className="text-sm text-muted"
                        >
                          Withdraw
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              {selected === l.id && tab === "browse" ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask about condition, shipping…"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void sendListingMessage(l.id, message, getBearerToken() ?? undefined).then((res) => {
                        if (!res.ok) onNotify?.(res.error);
                        else {
                          onNotify?.("Message sent");
                          setMessage("");
                        }
                      })
                    }
                    className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white"
                  >
                    Send
                  </button>
                </div>
              ) : null}
              {selected === l.id && tab === "mine" && thread?.ok ? (
                <div className="mt-3 space-y-2 rounded-lg border border-line bg-pocket p-3">
                  {!thread.messages.length ? (
                    <p className="text-xs text-muted">No messages on this listing yet.</p>
                  ) : (
                    thread.messages.map((m) => (
                      <p key={m.id} className="text-sm">
                        {m.body}
                      </p>
                    ))
                  )}
                </div>
              ) : null}
            </article>
          ))}
          {!listings.length && !loading && tab !== "inbox" ? (
            <p className="text-sm text-muted">No listings yet.</p>
          ) : null}
        </div>
      )}

      {listOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-line bg-panel p-4 shadow-lg">
            <p className="font-display text-lg font-bold">List a card</p>
            <div className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="font-semibold">Card</span>
                <select
                  value={pickCardId}
                  onChange={(e) => {
                    setPickCardId(e.target.value);
                    const card = listable.find((c) => c.id === e.target.value);
                    if (card && !askPrice) setAskPrice(String(cardValue(card) || ""));
                  }}
                  className="mt-1 h-11 w-full rounded-md border border-line bg-pocket px-3"
                >
                  <option value="">Select…</option>
                  {listable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.setName ? ` · ${c.setName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Asking price ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={askPrice}
                  onChange={(e) => setAskPrice(e.target.value)}
                  className="mt-1 h-11 w-full rounded-md border border-line bg-pocket px-3"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Description (optional)</span>
                <textarea
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-line bg-pocket px-3 py-2"
                  placeholder="Notes on condition, shipping, etc."
                />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setListOpen(false)} className="h-11 rounded-md border border-line text-sm font-semibold">
                Cancel
              </button>
              <button type="button" onClick={() => void submitListing()} className="h-11 rounded-md bg-collx-green text-sm font-semibold text-white">
                Publish listing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
