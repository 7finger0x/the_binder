"use server";

import { getSql } from "@/lib/db";
import { requireUserIdForAction } from "@/lib/auth/action-auth";
import { normalizeCard, uid, type Card } from "./cards";

type CardRow = { id: string; payload: unknown };

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

export async function pullCloudCards(bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const rows = await sql<CardRow>`select id, payload from cards where user_id = ${userId}`;
  return asCards(rows);
}

export async function pushCloudCards(cards: Card[], bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
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
  await sql`delete from cards where id = ${id} and user_id = ${userId}`;
  return { ok: true as const };
}

export async function createShareLink(bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const existing = await sql<{ slug: string }>`select slug from shares where user_id = ${userId} limit 1`;
  if (existing[0]?.slug) return { slug: existing[0].slug };
  const slug = uid().replace(/^c_/, "s_");
  await sql`insert into shares (id, user_id, slug) values (${uid()}, ${userId}, ${slug})`;
  return { slug };
}

export async function loadSharedCollection(slug: string) {
  const sql = await getSql();
  const share = await sql<{ user_id: string }>`select user_id from shares where slug = ${slug} limit 1`;
  if (!share[0]) return { ok: false as const, error: "That collection isn’t shared." };
  const rows = await sql<CardRow>`select id, payload from cards where user_id = ${share[0].user_id}`;
  const cards = asCards(rows).filter((c) => c.status === "owned");
  let ownerName: string | null = null;
  try {
    const owner = await sql<{ name: string }>`
      select name from "user" where id = ${share[0].user_id} limit 1
    `;
    ownerName = owner[0]?.name?.trim() || null;
  } catch {
    ownerName = null;
  }
  return { ok: true as const, cards, ownerName };
}
