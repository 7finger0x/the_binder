import type { CompsResult, SoldComp } from "./comps";
import { marketplaceUrls, toMarketLookupInput, type CardDraft, type MarketLookupInput } from "./cards";

const LOOKUP_TIMEOUT_MS = 25_000;

export type MarketLookupResult = {
  ok: boolean;
  error?: string;
  value: string;
  source: string;
  soldMedian: number | null;
  comps: SoldComp[];
  tcgplayerUrl: string;
  ebayUrl: string;
  pricechartingUrl: string;
  comcUrl: string;
  point130Url: string;
};

async function postJson<T>(path: string, body: MarketLookupInput): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await res.json()) as T & { error?: string };
    if (!res.ok) {
      throw new Error(payload.error || `Request failed (${res.status})`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function emptyCompsFallback(input: MarketLookupInput, message: string): CompsResult {
  const urls = marketplaceUrls({ ...input } as CardDraft);
  return {
    ok: false,
    error: message,
    marketEstimate: 0,
    marketSource: "",
    soldMedian: null,
    comps: [],
    ebaySearchUrl: urls.ebayUrl,
    point130Url: urls.point130Url,
  };
}

export async function fetchComps(card: MarketLookupInput): Promise<CompsResult> {
  const input = toMarketLookupInput(card);
  try {
    return await postJson<CompsResult>("/api/market/comps", input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load pricing";
    return emptyCompsFallback(input, message);
  }
}

export async function fetchMarket(card: MarketLookupInput): Promise<MarketLookupResult> {
  const input = toMarketLookupInput(card);
  try {
    return await postJson<MarketLookupResult>("/api/market/lookup", input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't look up market price";
    return {
      ok: false,
      error: message,
      value: "",
      source: message,
      soldMedian: null,
      comps: [],
      ...marketplaceUrls({ ...input } as CardDraft),
    };
  }
}
