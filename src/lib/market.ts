import { createServerFn } from "@tanstack/react-start";
import { marketplaceUrls, type CardDraft } from "./cards";

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

type LookupInput = Pick<CardDraft, "name" | "setName" | "number" | "year" | "brand" | "variant" | "category">;

export const lookupMarket = createServerFn({ method: "POST" })
  .validator((input: LookupInput) => input)
  .handler(async ({ data }) => {
    const urls = marketplaceUrls({ ...data } as CardDraft);
    let value = "";
    let source = "";

    const name = data.name.trim();
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
        /* links still work */
      }
    }

    return { ok: true as const, value, source, ...urls };
  });
