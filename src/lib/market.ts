"use server";

import { lookupComps } from "./comps";
import { marketplaceUrls, type CardDraft, type MarketLookupInput } from "./cards";

type PokemonPrice = {
  holofoil?: { market?: number | null };
  reverseHolofoil?: { market?: number | null };
  normal?: { market?: number | null };
  "1stEditionHolofoil"?: { market?: number | null };
};

function firstMarket(prices?: PokemonPrice) {
  if (!prices) return "";
  const n =
    prices.holofoil?.market ||
    prices.reverseHolofoil?.market ||
    prices.normal?.market ||
    prices["1stEditionHolofoil"]?.market;
  return typeof n === "number" && n > 0 ? `$${n.toFixed(2)}` : "";
}

function dollars(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? `$${v.toFixed(2)}` : "";
}

export async function lookupMarket(data: MarketLookupInput) {
  const urls = marketplaceUrls({ ...data } as CardDraft);
  const comps = await lookupComps(data);
  let value = "";
  let source = "";
  const name = data.name.trim();

  if (comps.marketEstimate > 0) {
    value = `$${comps.marketEstimate.toFixed(2)}`;
    source = comps.marketSource;
  } else if (comps.error) {
    source = comps.error;
  } else if (comps.marketSource) {
    source = comps.marketSource;
  }

  if (name && (data.category === "Pokémon" || data.category === "TCG")) {
    try {
      const parts = [`name:"${name.replace(/"/g, "")}"`];
      if (data.number.trim()) parts.push(`number:${data.number.trim()}`);
      const params = new URLSearchParams({ q: parts.join(" "), pageSize: "5" });
      const res = await fetch(`https://api.pokemontcg.io/v2/cards?${params}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          data?: { name?: string; tcgplayer?: { url?: string; prices?: PokemonPrice } }[];
        };
        const hit = body.data?.[0];
        const priced = firstMarket(hit?.tcgplayer?.prices);
        if (priced) {
          value = priced;
          source = "Pokémon TCG API · TCGplayer market";
        }
        if (hit?.tcgplayer?.url) urls.tcgplayerUrl = hit.tcgplayer.url;
      }
    } catch {
      /* continue */
    }
  }

  if (!value && name && data.category === "TCG") {
    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const body = (await res.json()) as { prices?: { usd?: string | null }; scryfall_uri?: string };
        if (body.prices?.usd) {
          value = `$${Number(body.prices.usd).toFixed(2)}`;
          source = "Scryfall · USD";
        }
      }
    } catch {
      /* continue */
    }
    if (!value) {
      try {
        const res = await fetch(
          `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`,
        );
        if (res.ok) {
          const body = (await res.json()) as {
            data?: { card_prices?: { tcgplayer_price?: string; ebay_price?: string }[] }[];
          };
          const prices = body.data?.[0]?.card_prices?.[0];
          const priced = dollars(prices?.tcgplayer_price) || dollars(prices?.ebay_price);
          if (priced) {
            value = priced;
            source = "YGOPRODeck";
          }
        }
      } catch {
        /* links still work */
      }
    }
  }

  return {
    ok: comps.ok as boolean,
    error: comps.error,
    value,
    source,
    soldMedian: comps.soldMedian,
    comps: comps.comps,
    ...urls,
  };
}
