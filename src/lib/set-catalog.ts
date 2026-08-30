import type { Card } from "./cards";
import { parseValue } from "./cards";

export type CatalogCard = {
  id: string;
  name: string;
  number: string;
  rarity: string;
  market: number;
  imageUrl: string;
};

export type SetManifest = {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  cards: CatalogCard[];
};

export type SetProgress = {
  manifest: SetManifest;
  ownedKeys: Set<string>;
  ownedCount: number;
  missing: CatalogCard[];
  completionPct: number;
  costToComplete: number;
  ownedValue: number;
};

function catalogKey(name: string, number: string) {
  return `${name.trim().toLowerCase()}|${number.trim()}`;
}

function cardKey(card: Pick<Card, "name" | "number">) {
  return catalogKey(card.name, card.number);
}

type PokemonPrice = {
  holofoil?: { market?: number | null };
  reverseHolofoil?: { market?: number | null };
  normal?: { market?: number | null };
};

function pokemonMarket(prices?: PokemonPrice) {
  if (!prices) return 0;
  const n = prices.holofoil?.market || prices.reverseHolofoil?.market || prices.normal?.market;
  return typeof n === "number" && n > 0 ? n : 0;
}

const SV1_SET_ID = "sv1";

export async function fetchPokemonSetManifest(setId = SV1_SET_ID): Promise<SetManifest | null> {
  try {
    const setRes = await fetch(`https://api.pokemontcg.io/v2/sets/${setId}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!setRes.ok) return null;
    const setBody = (await setRes.json()) as {
      data?: { id?: string; name?: string; series?: string; releaseDate?: string; total?: number };
    };
    const meta = setBody.data;
    if (!meta?.id) return null;

    const cardsRes = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&orderBy=number`,
      { headers: { Accept: "application/json" }, next: { revalidate: 86400 } },
    );
    if (!cardsRes.ok) return null;
    const cardsBody = (await cardsRes.json()) as {
      data?: Array<{
        id?: string;
        name?: string;
        number?: string;
        rarity?: string;
        images?: { small?: string };
        tcgplayer?: { prices?: PokemonPrice };
      }>;
    };

    const cards: CatalogCard[] = (cardsBody.data ?? []).map((c) => ({
      id: c.id || `${setId}-${c.number}`,
      name: c.name || "",
      number: c.number || "",
      rarity: c.rarity || "",
      market: pokemonMarket(c.tcgplayer?.prices),
      imageUrl: c.images?.small || "",
    }));

    return {
      id: meta.id,
      name: meta.name || setId,
      series: meta.series || "",
      releaseDate: meta.releaseDate || "",
      total: meta.total || cards.length,
      cards,
    };
  } catch {
    return null;
  }
}

export function computeSetProgress(manifest: SetManifest, collection: Card[]): SetProgress {
  const ownedKeys = new Set<string>();
  let ownedValue = 0;

  for (const card of collection) {
    if (card.status !== "owned") continue;
    if (card.setName.trim().toLowerCase() !== manifest.name.trim().toLowerCase()) continue;
    ownedKeys.add(cardKey(card));
    ownedValue += parseValue(card.value);
  }

  const missing = manifest.cards.filter((c) => !ownedKeys.has(catalogKey(c.name, c.number)));
  const ownedCount = manifest.cards.length - missing.length;
  const completionPct = manifest.cards.length
    ? Math.round((ownedCount / manifest.cards.length) * 100)
    : 0;
  const costToComplete = missing.reduce((sum, c) => sum + c.market, 0);

  return {
    manifest,
    ownedKeys,
    ownedCount,
    missing,
    completionPct,
    costToComplete,
    ownedValue,
  };
}

export async function listKnownPokemonSets() {
  try {
    const res = await fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=12", {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      data?: Array<{ id?: string; name?: string; series?: string; total?: number }>;
    };
    return (body.data ?? []).map((s) => ({
      id: s.id || "",
      name: s.name || "",
      series: s.series || "",
      total: s.total || 0,
    }));
  } catch {
    return [];
  }
}
