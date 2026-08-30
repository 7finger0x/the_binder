"use server";

import { getSql } from "@/lib/db";
import { requireUserIdForAction } from "@/lib/auth/action-auth";
import { getServerProStatus } from "@/lib/subscription-server";
import { listingCommissionRate } from "@/lib/marketplace-fees";
import { uid, type Card } from "./cards";

export type Listing = {
  id: string;
  sellerId: string;
  cardId: string;
  title: string;
  askingPrice: number;
  condition: string;
  description: string;
  status: "active" | "sold" | "withdrawn";
  commissionRate: number;
  createdAt: string;
};

export type ListingMessage = {
  id: string;
  listingId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type ListingRow = {
  id: string;
  seller_id: string;
  card_id: string;
  title: string;
  asking_price: string;
  condition: string | null;
  description: string | null;
  status: string;
  commission_rate: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  listing_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function mapListing(row: ListingRow): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    cardId: row.card_id,
    title: row.title,
    askingPrice: Number(row.asking_price),
    condition: row.condition || "",
    description: row.description || "",
    status: row.status as Listing["status"],
    commissionRate: Number(row.commission_rate),
    createdAt: row.created_at,
  };
}

function mapMessage(row: MessageRow): ListingMessage {
  return {
    id: row.id,
    listingId: row.listing_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listActiveListings(): Promise<Listing[]> {
  const sql = await getSql();
  const rows = await sql<ListingRow>`
    select id, seller_id, card_id, title, asking_price, condition, description, status, commission_rate, created_at
    from listings where status = 'active' order by created_at desc limit 50
  `;
  return rows.map(mapListing);
}

export async function listMyListings(bearerToken?: string): Promise<Listing[]> {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const rows = await sql<ListingRow>`
    select id, seller_id, card_id, title, asking_price, condition, description, status, commission_rate, created_at
    from listings where seller_id = ${userId} order by created_at desc limit 50
  `;
  return rows.map(mapListing);
}

export async function createListing(
  card: Card,
  askingPrice: number,
  description: string,
  bearerToken?: string,
) {
  const userId = await requireUserIdForAction(bearerToken);
  if (!Number.isFinite(askingPrice) || askingPrice <= 0) {
    return { ok: false as const, error: "Enter a valid asking price." };
  }
  if (card.status !== "owned") {
    return { ok: false as const, error: "Only owned cards can be listed." };
  }

  const sql = await getSql();
  const owned = await sql<{ id: string }>`
    select id from cards where id = ${card.id} and user_id = ${userId} limit 1
  `;
  if (!owned[0]) {
    return { ok: false as const, error: "That card isn’t in your cloud collection." };
  }

  const duplicate = await sql<{ id: string }>`
    select id from listings
    where seller_id = ${userId} and card_id = ${card.id} and status = 'active'
    limit 1
  `;
  if (duplicate[0]) {
    return { ok: false as const, error: "This card already has an active listing." };
  }

  const pro = await getServerProStatus(bearerToken);
  const commissionRate = listingCommissionRate(pro.isPro);
  const id = uid();
  const title = [card.name, card.setName, card.number ? `#${card.number}` : ""].filter(Boolean).join(" · ");

  await sql`
    insert into listings (id, seller_id, card_id, title, asking_price, condition, description, status, commission_rate)
    values (${id}, ${userId}, ${card.id}, ${title}, ${askingPrice}, ${card.condition || null}, ${description || null}, 'active', ${commissionRate})
  `;
  return { ok: true as const, id, commissionRate };
}

export async function withdrawListing(listingId: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const updated = await sql<{ id: string }>`
    update listings set status = 'withdrawn', updated_at = now()
    where id = ${listingId} and seller_id = ${userId} and status = 'active'
    returning id
  `;
  if (!updated[0]) return { ok: false as const, error: "Listing not found." };
  return { ok: true as const };
}

export async function sendListingMessage(listingId: string, body: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const trimmed = body.trim();
  if (!trimmed) return { ok: false as const, error: "Message is empty." };
  const sql = await getSql();
  const listing = await sql<{ id: string }>`
    select id from listings where id = ${listingId} and status = 'active' limit 1
  `;
  if (!listing[0]) return { ok: false as const, error: "Listing not found." };
  await sql`
    insert into listing_messages (id, listing_id, sender_id, body)
    values (${uid()}, ${listingId}, ${userId}, ${trimmed})
  `;
  return { ok: true as const };
}

export async function listListingMessages(listingId: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const listing = await sql<{ seller_id: string }>`
    select seller_id from listings where id = ${listingId} limit 1
  `;
  if (!listing[0]) return { ok: false as const, error: "Listing not found." };
  if (listing[0].seller_id !== userId) {
    return { ok: false as const, error: "Only the seller can read listing messages." };
  }

  const rows = await sql<MessageRow>`
    select id, listing_id, sender_id, body, created_at
    from listing_messages
    where listing_id = ${listingId}
    order by created_at asc
    limit 100
  `;
  return { ok: true as const, messages: rows.map(mapMessage) };
}

export async function listSellerInbox(bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const rows = await sql<MessageRow & { listing_title: string }>`
    select m.id, m.listing_id, m.sender_id, m.body, m.created_at, l.title as listing_title
    from listing_messages m
    join listings l on l.id = m.listing_id
    where l.seller_id = ${userId}
    order by m.created_at desc
    limit 50
  `;
  return rows.map((row) => ({
    ...mapMessage(row),
    listingTitle: row.listing_title,
  }));
}
