"use server";

import type { Identified } from "./identify";

export type CatalogMatch = {
  name: string;
  setName: string;
  number: string;
  variant: string;
  rarity: string;
  hp: string;
  imageUrl: string;
  tcgplayerUrl: string;
  source: string;
};

type PokemonCard = {
  name?: string;
  number?: string;
  rarity?: string;
  hp?: string;
  set?: { name?: string };
  images?: { small?: string; large?: string };
  tcgplayer?: { url?: string };
};

async function matchPokemon(hit: Identified): Promise<CatalogMatch | null> {
  const name = hit.name.trim();
  if (!name) return null;
  const parts = [`name:"${name.replace(/"/g, "")}"`];
  if (hit.setName.trim()) parts.push(`set.name:"${hit.setName.replace(/"/g, "")}"`);
  if (hit.number.trim()) parts.push(`number:${hit.number.trim()}`);
  const params = new URLSearchParams({ q: parts.join(" "), pageSize: "5", orderBy: "-set.releaseDate" });
  const res = await fetch(`https://api.pokemontcg.io/v2/cards?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: PokemonCard[] };
  const card = pickBestPokemon(body.data ?? [], hit);
  if (!card?.name) return null;
  return {
    name: card.name,
    setName: card.set?.name || hit.setName,
    number: card.number || hit.number,
    variant: hit.variant,
    rarity: card.rarity || hit.rarity,
    hp: card.hp || hit.hp,
    imageUrl: card.images?.large || card.images?.small || "",
    tcgplayerUrl: card.tcgplayer?.url || "",
    source: "Pokémon TCG API",
  };
}

function pickBestPokemon(cards: PokemonCard[], hit: Identified) {
  if (!cards.length) return null;
  const setNeedle = hit.setName.trim().toLowerCase();
  const numNeedle = hit.number.trim();
  const scored = cards.map((card) => {
    let score = 0;
    if (card.name?.toLowerCase() === hit.name.trim().toLowerCase()) score += 3;
    if (setNeedle && card.set?.name?.toLowerCase().includes(setNeedle)) score += 2;
    if (numNeedle && card.number === numNeedle) score += 4;
    return { card, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.card ?? cards[0];
}

async function matchScryfall(hit: Identified): Promise<CatalogMatch | null> {
  const name = hit.name.trim();
  if (!name) return null;
  const set = hit.setName.trim();
  const fuzzy = set ? `${name} ${set}` : name;
  const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(fuzzy)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const card = (await res.json()) as {
    name?: string;
    set_name?: string;
    collector_number?: string;
    rarity?: string;
    image_uris?: { normal?: string; small?: string };
    scryfall_uri?: string;
  };
  return {
    name: card.name || hit.name,
    setName: card.set_name || hit.setName,
    number: card.collector_number || hit.number,
    variant: hit.variant,
    rarity: card.rarity || hit.rarity,
    hp: hit.hp,
    imageUrl: card.image_uris?.normal || card.image_uris?.small || "",
    tcgplayerUrl: card.scryfall_uri || "",
    source: "Scryfall",
  };
}

export async function matchIdentifiedToCatalog(hit: Identified): Promise<CatalogMatch | null> {
  if (!hit.name.trim()) return null;
  if (hit.category === "Pokémon") {
    try {
      return await matchPokemon(hit);
    } catch {
      return null;
    }
  }
  if (hit.category === "TCG") {
    try {
      return await matchScryfall(hit);
    } catch {
      return null;
    }
  }
  return null;
}

export async function enrichIdentifiedCards(cards: Identified[]) {
  return Promise.all(
    cards.map(async (card) => {
      const match = await matchIdentifiedToCatalog(card);
      if (!match) return card;
      return {
        ...card,
        name: match.name || card.name,
        setName: match.setName || card.setName,
        number: match.number || card.number,
        variant: match.variant || card.variant,
        rarity: match.rarity || card.rarity,
        hp: match.hp || card.hp,
      };
    }),
  );
}
