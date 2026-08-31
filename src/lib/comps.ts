"use server";

import { marketQuery, marketplaceUrls, type CardDraft, type MarketLookupInput } from "./cards";

export type SoldComp = {
  title: string;
  soldPrice: number;
  soldDate: string;
  url: string;
  source: string;
};

export type CompsResult = {
  ok: boolean;
  error?: string;
  marketEstimate: number;
  marketSource: string;
  soldMedian: number | null;
  comps: SoldComp[];
  ebaySearchUrl: string;
  point130Url: string;
};

function emptyCompsResult(data: MarketLookupInput, error?: string): CompsResult {
  const urls = marketplaceUrls({ ...data } as CardDraft);
  return {
    ok: false,
    error,
    marketEstimate: 0,
    marketSource: "",
    soldMedian: null,
    comps: [],
    ebaySearchUrl: urls.ebayUrl,
    point130Url: urls.point130Url,
  };
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function parseEbayPrice(raw: unknown) {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function fetchEbaySoldComps(query: string, limit = 12): Promise<SoldComp[]> {
  const appId = process.env.EBAY_APP_ID?.trim();
  if (!appId || !query.trim()) return [];

  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.13.0",
    "SECURITY-APPNAME": appId,
    "RESPONSE-DATA-FORMAT": "JSON",
    "REST-PAYLOAD": "",
    keywords: query,
    "paginationInput.entriesPerPage": String(Math.min(limit, 15)),
    sortOrder: "EndTimeSoonest",
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
  });

  try {
    const res = await fetch(`https://svcs.ebay.com/services/search/FindingService/v1?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      findCompletedItemsResponse?: Array<{
        searchResult?: Array<{
          item?: Array<{
            title?: string[];
            sellingStatus?: Array<{ currentPrice?: Array<{ __value__?: string }> }>;
            listingInfo?: Array<{ endTime?: string[] }>;
            viewItemURL?: string[];
          }>;
        }>;
      }>;
    };
    const items =
      body.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item?.filter(Boolean) ?? [];
    return items
      .map((item) => {
        const soldPrice = parseEbayPrice(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__);
        const title = item.title?.[0]?.trim() || "eBay sold listing";
        const soldDate = item.listingInfo?.[0]?.endTime?.[0] || "";
        const url = item.viewItemURL?.[0] || "";
        if (!soldPrice) return null;
        return { title, soldPrice, soldDate, url, source: "eBay sold" } satisfies SoldComp;
      })
      .filter((c): c is SoldComp => Boolean(c))
      .slice(0, limit);
  } catch {
    return [];
  }
}

type PokemonPrice = {
  holofoil?: { market?: number | null };
  reverseHolofoil?: { market?: number | null };
  normal?: { market?: number | null };
  "1stEditionHolofoil"?: { market?: number | null };
};

function firstPokemonMarket(prices?: PokemonPrice) {
  if (!prices) return 0;
  const n =
    prices.holofoil?.market ||
    prices.reverseHolofoil?.market ||
    prices.normal?.market ||
    prices["1stEditionHolofoil"]?.market;
  return typeof n === "number" && n > 0 ? n : 0;
}

async function fetchPriceChartingEstimate(query: string) {
  const token = process.env.PRICECHARTING_API_TOKEN?.trim();
  if (!token || !query.trim()) return { estimate: 0, source: "" };

  try {
    const res = await fetch(
      `https://www.pricecharting.com/api/product?t=${encodeURIComponent(token)}&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return { estimate: 0, source: "" };
    const body = (await res.json()) as {
      status?: string;
      "loose-price"?: number;
      "used-price"?: number;
      "new-price"?: number;
    };
    if (body.status === "error") return { estimate: 0, source: "" };
    const cents = body["loose-price"] ?? body["used-price"] ?? body["new-price"] ?? 0;
    if (typeof cents === "number" && cents > 0) {
      return { estimate: cents / 100, source: "PriceCharting" };
    }
  } catch {
    /* continue */
  }
  return { estimate: 0, source: "" };
}

async function tcgMarketEstimate(data: MarketLookupInput) {
  const name = data.name.trim();
  if (!name) return { estimate: 0, source: "" };

  if (data.category === "Pokémon" || data.category === "TCG") {
    try {
      const parts = [`name:"${name.replace(/"/g, "")}"`];
      if (data.setName.trim()) parts.push(`set.name:"${data.setName.replace(/"/g, "")}"`);
      if (data.number.trim()) parts.push(`number:${data.number.trim()}`);
      const params = new URLSearchParams({ q: parts.join(" "), pageSize: "3" });
      const res = await fetch(`https://api.pokemontcg.io/v2/cards?${params}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          data?: { tcgplayer?: { prices?: PokemonPrice } }[];
        };
        const priced = firstPokemonMarket(body.data?.[0]?.tcgplayer?.prices);
        if (priced) return { estimate: priced, source: "TCGplayer market (Pokémon TCG API)" };
      }
    } catch {
      /* continue */
    }
  }

  if (data.category === "TCG") {
    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
        { headers: { Accept: "application/json" }, next: { revalidate: 3600 } },
      );
      if (res.ok) {
        const body = (await res.json()) as { prices?: { usd?: string | null } };
        const usd = Number(body.prices?.usd);
        if (Number.isFinite(usd) && usd > 0) return { estimate: usd, source: "Scryfall USD" };
      }
    } catch {
      /* continue */
    }
  }

  return { estimate: 0, source: "" };
}

async function sportsMarketEstimate(data: MarketLookupInput, query: string) {
  if (data.category !== "Sports" && data.category !== "Other") {
    return { estimate: 0, source: "" };
  }
  return fetchPriceChartingEstimate(query);
}

export async function lookupComps(data: MarketLookupInput): Promise<CompsResult> {
  const query = marketQuery(data) || data.name.trim() || data.team.trim();
  if (!query.trim()) {
    return emptyCompsResult(data, "Add a player name or card details to look up pricing.");
  }

  try {
    const urls = marketplaceUrls({ ...data } as CardDraft);
    const [comps, tcgMarket, sportsMarket] = await Promise.all([
      fetchEbaySoldComps(query),
      tcgMarketEstimate(data),
      sportsMarketEstimate(data, query),
    ]);

    const soldPrices = comps.map((c) => c.soldPrice);
    const soldMedian = median(soldPrices);
    const catalogEstimate = tcgMarket.estimate || sportsMarket.estimate;
    const catalogSource = tcgMarket.source || sportsMarket.source;
    const marketEstimate = soldMedian ?? catalogEstimate;
    const hasEbayKey = Boolean(process.env.EBAY_APP_ID?.trim());

    let marketSource = "";
    if (soldMedian) {
      marketSource = `Recent sold median (${comps.length} eBay comps)`;
    } else if (catalogSource) {
      marketSource = catalogSource;
    } else if (!hasEbayKey) {
      marketSource = "Set EBAY_APP_ID for sold comps · links below";
    } else {
      marketSource = "No sold comps found — verify on eBay or 130point";
    }

    return {
      ok: true,
      marketEstimate,
      marketSource,
      soldMedian,
      comps,
      ebaySearchUrl: urls.ebayUrl,
      point130Url: urls.point130Url,
    };
  } catch (err) {
    return emptyCompsResult(
      data,
      err instanceof Error ? err.message : "Couldn't load pricing right now.",
    );
  }
}
