import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
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

export const pullCloudCards = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<CardRow>`select id, payload from cards where user_id = ${context.userId}`;
    return asCards(rows);
  });

export const pushCloudCards = createServerFn({ method: "POST" })
  .validator((input: Card[]) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    for (const card of data) {
      const next = normalizeCard(card);
      if (!next || next.id.startsWith("sample-")) continue;
      const payload = JSON.stringify(next);
      await sql`
        insert into cards (id, user_id, payload, updated_at)
        values (${next.id}, ${context.userId}, ${payload}::jsonb, now())
        on conflict (id) do update
        set payload = excluded.payload, updated_at = now()
        where cards.user_id = ${context.userId}
      `;
    }
    return { ok: true as const, count: data.length };
  });

export const deleteCloudCard = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from cards where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const existing = await sql<{ slug: string }>`select slug from shares where user_id = ${context.userId} limit 1`;
    if (existing[0]?.slug) return { slug: existing[0].slug };
    const slug = uid().replace(/^c_/, "s_");
    await sql`insert into shares (id, user_id, slug) values (${uid()}, ${context.userId}, ${slug})`;
    return { slug };
  });

export const loadSharedCollection = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
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
  });
