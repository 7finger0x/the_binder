/**
 * Phase 2 — Data Processing
 * Identification Layer → External Checklist Lookup → Data Normalization → Collection Core Engine.
 */

import {
  EMPTY_CARD,
  marketplaceUrls,
  normalizeCard,
  type Card,
  type CardDraft,
} from "../cards";
import { enrichIdentifiedCards } from "../catalog-match";
import { identifyPage, type Identified } from "../identify";
import { lookupMarket } from "../market";
import type { ProcessResult } from "./types";

/** Identification Layer — vision API with catalog enrichment. */
export async function identifyLayer(imageDataUrl: string) {
  const result = await identifyPage(imageDataUrl);
  if (!result.ok) return result;
  const enriched = await enrichIdentifiedCards(result.cards);
  return { ok: true as const, cards: enriched };
}

/** External Checklist / Database Lookup — delegated to catalog-match enrichment. */
export { matchIdentifiedToCatalog } from "../catalog-match";

/** Data Normalization — coerce raw identified hits into canonical CardDraft shape. */
export function normalizeIdentified(
  hits: Identified[],
  pocketImages: string[],
  backImages: string[],
): CardDraft[] {
  return hits.map((c, i) => {
    const { box: _box, ...rest } = c;
    const base: CardDraft = {
      ...EMPTY_CARD,
      ...rest,
      image: pocketImages[i] || "",
      imageBack: backImages[i] || "",
    };
    return { ...base, ...marketplaceUrls(base) };
  });
}

/** Collection Core Engine — merge, validate, and price drafts before persistence. */
export async function coreEngineAddDrafts(
  drafts: CardDraft[],
  options?: { priceLookup?: boolean },
): Promise<ProcessResult> {
  const normalized = drafts.map((d) => normalizeCard({ ...d, id: "temp", createdAt: 0 }) || d);
  if (options?.priceLookup) {
    const priced = await Promise.all(
      normalized.map(async (draft) => {
        try {
          const market = await lookupMarket(draft);
          return {
            ...draft,
            value: market.value || draft.value,
            marketSource: market.source || draft.marketSource,
            tcgplayerUrl: market.tcgplayerUrl,
            ebayUrl: market.ebayUrl,
            pricechartingUrl: market.pricechartingUrl,
            comcUrl: market.comcUrl || draft.comcUrl,
          };
        } catch {
          return draft;
        }
      }),
    );
    return {
      ok: true,
      cards: priced.map((draft) => ({ draft, source: "scanner" as const })),
    };
  }
  return {
    ok: true,
    cards: normalized.map((draft) => ({ draft, source: "scanner" as const })),
  };
}

/** Full page scan pipeline: ingest image → identify → normalize. */
export async function processPageScan(
  imageDataUrl: string,
  pocketImages: string[],
  backImages: string[],
): Promise<ProcessResult> {
  const identified = await identifyLayer(imageDataUrl);
  if (!identified.ok) return { ok: false, error: identified.error };
  const drafts = normalizeIdentified(identified.cards, pocketImages, backImages);
  return { ok: true, cards: drafts.map((draft) => ({ draft, source: "scanner" as const })) };
}

/** Validate a card document before it enters the core collection store. */
export function validateCard(card: Card | CardDraft): string | null {
  if (!card.name?.trim()) return "Card name is required.";
  if (card.value && Number.isNaN(parseFloat(card.value))) return "Invalid value format.";
  return null;
}
