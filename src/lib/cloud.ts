"use server";

import { getSql } from "@/lib/db";
import { requireUserIdForAction } from "@/lib/auth/action-auth";
import { getServerProStatus } from "@/lib/subscription-server";
import {
  FREE_SHOWCASE_LIMIT,
  PRO_SHOWCASE_LIMIT,
  normalizeCustomSlug,
  type ShowcaseFilterMode,
} from "@/lib/showcase";
import { normalizeCard, uid, type Card } from "./cards";
import { FREE_CARD_LIMIT } from "./subscription";

type CardRow = { id: string; payload: unknown };

type ShareRow = {
  id: string;
  user_id: string;
  slug: string;
  name: string | null;
  is_default: boolean;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  hide_values: boolean;
  show_trade_list: boolean;
  show_want_list: boolean;
  show_wishlist: boolean;
  filter_mode: string;
  filter_stacks: unknown;
};

function asCards(rows: CardRow[]) {
  return rows
    .map((row) => normalizeCard({ ...(asObject(row.payload) || {}), id: row.id }))
    .filter((c): c is Card => Boolean(c));
}

function asObject(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function parseFilterStacks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function asFilterMode(value: string): ShowcaseFilterMode {
  if (value === "stacks" || value === "pick") return value;
  return "all";
}

async function showcaseLimitForUser(bearerToken?: string) {
  const pro = await getServerProStatus(bearerToken);
  return pro.isPro ? PRO_SHOWCASE_LIMIT : FREE_SHOWCASE_LIMIT;
}

async function getShareRowForUser(userId: string, showcaseId?: string) {
  const sql = await getSql();
  if (showcaseId) {
    const rows = await sql<ShareRow>`
      select id, user_id, slug, name, is_default, display_name, bio, avatar_url,
        hide_values, show_trade_list, show_want_list, show_wishlist, filter_mode, filter_stacks
      from shares where id = ${showcaseId} and user_id = ${userId} limit 1
    `;
    return rows[0] ?? null;
  }
  const rows = await sql<ShareRow>`
    select id, user_id, slug, name, is_default, display_name, bio, avatar_url,
      hide_values, show_trade_list, show_want_list, show_wishlist, filter_mode, filter_stacks
    from shares where user_id = ${userId}
    order by is_default desc, created_at asc
    limit 1
  `;
  return rows[0] ?? null;
}

async function filterCardsForShowcase(sql: Awaited<ReturnType<typeof getSql>>, share: ShareRow, cards: Card[]) {
  const mode = asFilterMode(share.filter_mode);
  if (mode === "all") return cards;

  if (mode === "stacks") {
    const stacks = new Set(parseFilterStacks(share.filter_stacks).map((s) => s.toLowerCase()));
    if (!stacks.size) return cards;
    return cards.filter((c) => stacks.has(c.stack.trim().toLowerCase()));
  }

  const picked = await sql<{ card_id: string }>`
    select card_id from showcase_cards where showcase_id = ${share.id}
  `;
  const ids = new Set(picked.map((r) => r.card_id));
  return cards.filter((c) => ids.has(c.id));
}

function mapShowcaseProfile(row: ShareRow, pickedCardIds: string[] = []): ShowcaseProfile {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name?.trim() || "Main showcase",
    isDefault: row.is_default,
    filterMode: asFilterMode(row.filter_mode),
    filterStacks: parseFilterStacks(row.filter_stacks),
    pickedCardIds,
    displayName: row.display_name || "",
    bio: row.bio || "",
    avatarUrl: row.avatar_url || "",
    hideValues: row.hide_values,
    showTradeList: row.show_trade_list,
    showWantList: row.show_want_list,
    showWishlist: row.show_wishlist,
  };
}

export async function pullCloudCards(bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const rows = await sql<CardRow>`select id, payload from cards where user_id = ${userId}`;
  return asCards(rows);
}

export async function pushCloudCards(cards: Card[], bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const pro = await getServerProStatus(bearerToken);

  if (!pro.isPro) {
    const countRows = await sql<{ n: string }>`
      select count(*)::text as n from cards where user_id = ${userId}
    `;
    const currentCount = Number(countRows[0]?.n ?? 0);
    const existingIds = await sql<{ id: string }>`select id from cards where user_id = ${userId}`;
    const known = new Set(existingIds.map((row) => row.id));
    const netNew = cards
      .map((card) => normalizeCard(card)?.id)
      .filter((id): id is string => Boolean(id && !id.startsWith("sample-") && !known.has(id)));
    if (currentCount + netNew.length > FREE_CARD_LIMIT) {
      return {
        ok: false as const,
        error: `Free plan is limited to ${FREE_CARD_LIMIT} cards. Upgrade to Pro for unlimited sync.`,
      };
    }
  }

  for (const card of cards) {
    const next = normalizeCard(card);
    if (!next || next.id.startsWith("sample-")) continue;
    const payload = JSON.stringify(next);
    await sql`
      insert into cards (id, user_id, payload, updated_at)
      values (${next.id}, ${userId}, ${payload}::jsonb, now())
      on conflict (id) do update
      set payload = excluded.payload, updated_at = now()
      where cards.user_id = ${userId}
    `;
  }
  return { ok: true as const, count: cards.length };
}

export async function deleteCloudCard(id: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  await sql`
    update listings set status = 'withdrawn', updated_at = now()
    where card_id = ${id} and seller_id = ${userId} and status = 'active'
  `;
  await sql`delete from cards where id = ${id} and user_id = ${userId}`;
  return { ok: true as const };
}

export async function createShareLink(bearerToken?: string, showcaseId?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const existing = await getShareRowForUser(userId, showcaseId);
  if (existing?.slug) return { slug: existing.slug, showcaseId: existing.id };

  const slug = uid().replace(/^c_/, "s_");
  const id = uid();
  await sql`
    insert into shares (id, user_id, slug, name, is_default)
    values (${id}, ${userId}, ${slug}, 'Main showcase', true)
  `;
  return { slug, showcaseId: id };
}

export type ShowcaseSummary = {
  id: string;
  slug: string;
  name: string;
  isDefault: boolean;
  filterMode: ShowcaseFilterMode;
};

export type ShowcaseProfile = ShowcaseSummary & {
  filterStacks: string[];
  pickedCardIds: string[];
  displayName: string;
  bio: string;
  avatarUrl: string;
  hideValues: boolean;
  showTradeList: boolean;
  showWantList: boolean;
  showWishlist: boolean;
};

export type FeaturedShowcase = {
  slug: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  cardCount: number;
  name: string;
};

export async function listShowcases(bearerToken?: string): Promise<ShowcaseSummary[]> {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const rows = await sql<Pick<ShareRow, "id" | "slug" | "name" | "is_default" | "filter_mode">>`
    select id, slug, name, is_default, filter_mode
    from shares where user_id = ${userId}
    order by is_default desc, created_at asc
  `;
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name?.trim() || "Main showcase",
    isDefault: row.is_default,
    filterMode: asFilterMode(row.filter_mode),
  }));
}

export async function createShowcase(name: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const countRows = await sql<{ n: string }>`
    select count(*)::text as n from shares where user_id = ${userId}
  `;
  const count = Number(countRows[0]?.n ?? 0);
  const limit = await showcaseLimitForUser(bearerToken);
  if (count >= limit) {
    const message =
      limit <= FREE_SHOWCASE_LIMIT
        ? "Multiple showcases are a Pro feature."
        : `You can have up to ${PRO_SHOWCASE_LIMIT} showcases.`;
    return { ok: false as const, error: message };
  }

  const trimmed = name.trim() || "New showcase";
  const slug = uid().replace(/^c_/, "s_");
  const id = uid();
  await sql`
    insert into shares (id, user_id, slug, name, is_default, filter_mode, filter_stacks)
    values (${id}, ${userId}, ${slug}, ${trimmed}, false, 'all', '[]'::jsonb)
  `;
  return { ok: true as const, id, slug, name: trimmed };
}

export async function deleteShowcase(showcaseId: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const row = await getShareRowForUser(userId, showcaseId);
  if (!row) return { ok: false as const, error: "Showcase not found." };

  const countRows = await sql<{ n: string }>`
    select count(*)::text as n from shares where user_id = ${userId}
  `;
  if (Number(countRows[0]?.n ?? 0) <= 1) {
    return { ok: false as const, error: "You need at least one showcase." };
  }
  if (row.is_default) {
    return { ok: false as const, error: "Set another showcase as default before deleting this one." };
  }

  await sql`delete from shares where id = ${showcaseId} and user_id = ${userId}`;
  return { ok: true as const };
}

export async function setDefaultShowcase(showcaseId: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const row = await getShareRowForUser(userId, showcaseId);
  if (!row) return { ok: false as const, error: "Showcase not found." };

  await sql`update shares set is_default = false where user_id = ${userId}`;
  await sql`update shares set is_default = true where id = ${showcaseId} and user_id = ${userId}`;
  return { ok: true as const };
}

export async function updateShowcaseProfile(
  profile: Partial<Omit<ShowcaseProfile, "slug" | "id">> & {
    customSlug?: string;
    showcaseId?: string;
    filterMode?: ShowcaseFilterMode;
    filterStacks?: string[];
    pickedCardIds?: string[];
    name?: string;
  },
  bearerToken?: string,
) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const existing = await getShareRowForUser(userId, profile.showcaseId);
  if (!existing) {
    const created = await createShareLink(bearerToken);
    const row = await getShareRowForUser(userId, created.showcaseId);
    if (!row) return { ok: false as const, error: "Could not create showcase." };
    return updateShowcaseProfile({ ...profile, showcaseId: row.id }, bearerToken);
  }

  let slug = existing.slug;

  if (profile.customSlug) {
    const pro = await getServerProStatus(bearerToken);
    if (!pro.isPro) {
      return { ok: false as const, error: "Custom showcase URL is a Pro feature." };
    }
    const nextSlug = normalizeCustomSlug(profile.customSlug);
    if (nextSlug.length < 3) {
      return { ok: false as const, error: "URL must be at least 3 characters." };
    }
    const taken = await sql<{ slug: string }>`
      select slug from shares where slug = ${nextSlug} and id <> ${existing.id} limit 1
    `;
    if (taken[0]) {
      return { ok: false as const, error: "That showcase URL is already taken." };
    }
    await sql`update shares set slug = ${nextSlug} where id = ${existing.id}`;
    slug = nextSlug;
  }

  const filterStacksJson = JSON.stringify(profile.filterStacks ?? parseFilterStacks(existing.filter_stacks));

  await sql`
    update shares set
      name = coalesce(${profile.name ?? null}, name),
      display_name = coalesce(${profile.displayName ?? null}, display_name),
      bio = coalesce(${profile.bio ?? null}, bio),
      avatar_url = coalesce(${profile.avatarUrl ?? null}, avatar_url),
      hide_values = coalesce(${profile.hideValues ?? null}, hide_values),
      show_trade_list = coalesce(${profile.showTradeList ?? null}, show_trade_list),
      show_want_list = coalesce(${profile.showWantList ?? null}, show_want_list),
      show_wishlist = coalesce(${profile.showWishlist ?? null}, show_wishlist),
      filter_mode = coalesce(${profile.filterMode ?? null}, filter_mode),
      filter_stacks = coalesce(${filterStacksJson}::jsonb, filter_stacks)
    where id = ${existing.id}
  `;

  if (profile.pickedCardIds) {
    const owned = await sql<{ id: string }>`select id from cards where user_id = ${userId}`;
    const ownedIds = new Set(owned.map((row) => row.id));
    const validIds = profile.pickedCardIds.filter((cardId) => ownedIds.has(cardId));
    await sql`delete from showcase_cards where showcase_id = ${existing.id}`;
    for (const cardId of validIds) {
      await sql`
        insert into showcase_cards (showcase_id, card_id)
        values (${existing.id}, ${cardId})
        on conflict do nothing
      `;
    }
  }

  return { ok: true as const, slug, showcaseId: existing.id };
}

export async function getShowcaseProfile(showcaseId?: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const row = await getShareRowForUser(userId, showcaseId);
  if (!row) return null;

  const picked =
    asFilterMode(row.filter_mode) === "pick"
      ? await sql<{ card_id: string }>`
          select card_id from showcase_cards where showcase_id = ${row.id}
        `
      : [];

  return mapShowcaseProfile(
    row,
    picked.map((p) => p.card_id),
  );
}

export async function listFeaturedShowcases(): Promise<FeaturedShowcase[]> {
  try {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      slug: string;
      name: string | null;
      display_name: string | null;
      bio: string | null;
      avatar_url: string | null;
      user_id: string;
      filter_mode: string;
      filter_stacks: unknown;
    }>`
      select id, slug, name, display_name, bio, avatar_url, user_id, filter_mode, filter_stacks
      from shares
      where featured = true
      order by created_at desc
      limit 24
    `;

    const out: FeaturedShowcase[] = [];
    for (const row of rows) {
      const cardRows = await sql<CardRow>`select id, payload from cards where user_id = ${row.user_id}`;
      const allCards = asCards(cardRows).filter((c) => c.status === "owned");
      const shareRow = row as ShareRow;
      const filtered = await filterCardsForShowcase(sql, shareRow, allCards);
      out.push({
        slug: row.slug,
        name: row.name?.trim() || "Showcase",
        displayName: row.display_name?.trim() || "Collector",
        bio: row.bio?.trim() || "",
        avatarUrl: row.avatar_url?.trim() || "",
        cardCount: filtered.length,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadSharedCollection(slug: string) {
  const sql = await getSql();
  const share = await sql<ShareRow>`
    select id, user_id, slug, name, is_default, display_name, bio, avatar_url,
      hide_values, show_trade_list, show_want_list, show_wishlist, filter_mode, filter_stacks
    from shares where slug = ${slug} limit 1
  `;
  if (!share[0]) return { ok: false as const, error: "That collection isn’t shared." };

  const rows = await sql<CardRow>`select id, payload from cards where user_id = ${share[0].user_id}`;
  const allCards = asCards(rows);
  const owned = allCards.filter((c) => c.status === "owned");
  const cards = await filterCardsForShowcase(sql, share[0], owned);
  const showcasedIds = new Set(cards.map((c) => c.id));

  const tradeCards = share[0].show_trade_list
    ? allCards.filter((c) => c.tradeStatus === "for_trade" && showcasedIds.has(c.id))
    : [];
  const wantCards = share[0].show_want_list
    ? allCards.filter((c) => c.tradeStatus === "want" && showcasedIds.has(c.id))
    : [];
  const wishlistCards = share[0].show_wishlist ? allCards.filter((c) => c.status === "wishlist") : [];

  let ownerName: string | null = share[0].display_name?.trim() || null;
  try {
    if (!ownerName) {
      const owner = await sql<{ name: string }>`
        select name from "user" where id = ${share[0].user_id} limit 1
      `;
      ownerName = owner[0]?.name?.trim() || null;
    }
  } catch {
    ownerName = ownerName || null;
  }

  return {
    ok: true as const,
    cards,
    tradeCards,
    wantCards,
    wishlistCards,
    ownerName,
    showcaseName: share[0].name?.trim() || "Showcase",
    bio: share[0].bio || "",
    avatarUrl: share[0].avatar_url || "",
    hideValues: share[0].hide_values,
    slug,
  };
}
