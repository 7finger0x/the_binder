"use server";

import { getSql } from "@/lib/db";
import { requireUserIdForAction } from "@/lib/auth/action-auth";
import { uid } from "@/lib/cards";

export type UserRelation = "none" | "friend" | "pending_outgoing" | "pending_incoming";

export type PublicUser = {
  id: string;
  username: string;
  displayName: string | null;
  image: string | null;
  relation: UserRelation;
};

export type MyProfile = {
  username: string | null;
  displayName: string | null;
  image: string | null;
};

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function validateUsername(username: string): string | null {
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3–20 characters: letters, numbers, and underscores only.";
  }
  return null;
}

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string | null;
};

type UserRow = {
  id: string;
  name: string;
  image: string | null;
};

type FriendRow = {
  requester_id: string;
  addressee_id: string;
  status: string;
};

async function loadRelationMap(userId: string): Promise<Map<string, UserRelation>> {
  const sql = await getSql();
  const rows = await sql<FriendRow>`
    select requester_id, addressee_id, status
    from friend_requests
    where (requester_id = ${userId} or addressee_id = ${userId})
      and status in ('pending', 'accepted')
  `;
  const map = new Map<string, UserRelation>();
  for (const row of rows) {
    const other = row.requester_id === userId ? row.addressee_id : row.requester_id;
    if (row.status === "accepted") {
      map.set(other, "friend");
    } else if (row.requester_id === userId) {
      map.set(other, "pending_outgoing");
    } else {
      map.set(other, "pending_incoming");
    }
  }
  return map;
}

function toPublicUser(
  profile: ProfileRow,
  user: UserRow | undefined,
  relation: UserRelation,
): PublicUser {
  return {
    id: profile.user_id,
    username: profile.username,
    displayName: profile.display_name ?? user?.name ?? null,
    image: user?.image ?? null,
    relation,
  };
}

export async function getMyProfile(bearerToken?: string): Promise<MyProfile> {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const profile = await sql<ProfileRow>`
    select user_id, username, display_name from user_profiles where user_id = ${userId} limit 1
  `;
  let image: string | null = null;
  let displayName: string | null = profile[0]?.display_name ?? null;
  try {
    const user = await sql<{ name: string; image: string | null }>`
      select name, image from "user" where id = ${userId} limit 1
    `;
    if (user[0]) {
      displayName = displayName ?? user[0].name ?? null;
      image = user[0].image ?? null;
    }
  } catch {
    /* auth tables may be absent in some modes */
  }
  return {
    username: profile[0]?.username ?? null,
    displayName,
    image,
  };
}

export async function setUsername(usernameRaw: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const username = normalizeUsername(usernameRaw);
  const err = validateUsername(username);
  if (err) return { ok: false as const, error: err };

  const sql = await getSql();
  const taken = await sql<{ user_id: string }>`
    select user_id from user_profiles where lower(username) = ${username} and user_id <> ${userId} limit 1
  `;
  if (taken[0]) return { ok: false as const, error: "That username is already taken." };

  const existing = await sql<ProfileRow>`
    select user_id, username, display_name from user_profiles where user_id = ${userId} limit 1
  `;
  if (existing[0]) {
    await sql`
      update user_profiles set username = ${username} where user_id = ${userId}
    `;
  } else {
    let displayName: string | null = null;
    try {
      const user = await sql<{ name: string }>`select name from "user" where id = ${userId} limit 1`;
      displayName = user[0]?.name?.trim() || null;
    } catch {
      displayName = null;
    }
    await sql`
      insert into user_profiles (user_id, username, display_name)
      values (${userId}, ${username}, ${displayName})
    `;
  }
  return { ok: true as const, username };
}

export async function listFriends(bearerToken?: string): Promise<PublicUser[]> {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const relations = await loadRelationMap(userId);
  const friendIds = [...relations.entries()]
    .filter(([, r]) => r === "friend")
    .map(([id]) => id);
  if (!friendIds.length) return [];

  const profiles = await sql<ProfileRow>`
    select user_id, username, display_name from user_profiles
    where user_id = any(${friendIds})
    order by username asc
  `;
  const users = await loadUsersByIds(friendIds);
  return profiles.map((p) => toPublicUser(p, users.get(p.user_id), "friend"));
}

export async function listDiscoverUsers(
  query: string,
  bearerToken?: string,
): Promise<PublicUser[]> {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const relations = await loadRelationMap(userId);
  const q = query.trim().toLowerCase();

  let profiles: ProfileRow[];
  if (q) {
    profiles = await sql<ProfileRow>`
      select user_id, username, display_name from user_profiles
      where user_id <> ${userId}
        and (lower(username) like ${`%${q}%`} or lower(coalesce(display_name, '')) like ${`%${q}%`})
      order by username asc
      limit 50
    `;
  } else {
    profiles = await sql<ProfileRow>`
      select user_id, username, display_name from user_profiles
      where user_id <> ${userId}
      order by created_at desc
      limit 50
    `;
  }

  const ids = profiles.map((p) => p.user_id);
  const users = await loadUsersByIds(ids);
  return profiles
    .map((p) => {
      const relation = relations.get(p.user_id) ?? "none";
      return toPublicUser(p, users.get(p.user_id), relation);
    })
    .filter((u) => u.relation !== "friend");
}

export async function listPendingRequests(bearerToken?: string): Promise<PublicUser[]> {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const pending = await sql<{ requester_id: string }>`
    select requester_id from friend_requests
    where addressee_id = ${userId} and status = 'pending'
    order by created_at desc
  `;
  if (!pending.length) return [];
  const ids = pending.map((r) => r.requester_id);
  const profiles = await sql<ProfileRow>`
    select user_id, username, display_name from user_profiles where user_id = any(${ids})
  `;
  const users = await loadUsersByIds(ids);
  return profiles.map((p) => toPublicUser(p, users.get(p.user_id), "pending_incoming"));
}

export async function sendFriendRequest(targetUserId: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  if (targetUserId === userId) return { ok: false as const, error: "You can’t friend yourself." };

  const sql = await getSql();
  const profile = await sql<{ user_id: string }>`
    select user_id from user_profiles where user_id = ${targetUserId} limit 1
  `;
  if (!profile[0]) return { ok: false as const, error: "That user doesn’t have a profile yet." };

  const existing = await sql<FriendRow>`
    select requester_id, addressee_id, status from friend_requests
    where (requester_id = ${userId} and addressee_id = ${targetUserId})
       or (requester_id = ${targetUserId} and addressee_id = ${userId})
    limit 1
  `;
  if (existing[0]?.status === "accepted") {
    return { ok: false as const, error: "You’re already friends." };
  }
  if (existing[0]?.status === "pending") {
    if (existing[0].requester_id === targetUserId) {
      await sql`
        update friend_requests set status = 'accepted'
        where requester_id = ${targetUserId} and addressee_id = ${userId}
      `;
      return { ok: true as const, status: "accepted" as const };
    }
    return { ok: false as const, error: "Friend request already sent." };
  }

  await sql`
    insert into friend_requests (id, requester_id, addressee_id, status)
    values (${uid()}, ${userId}, ${targetUserId}, 'pending')
  `;
  return { ok: true as const, status: "pending" as const };
}

export async function acceptFriendRequest(requesterId: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const row = await sql<FriendRow>`
    select requester_id, addressee_id, status from friend_requests
    where requester_id = ${requesterId} and addressee_id = ${userId} and status = 'pending'
    limit 1
  `;
  if (!row[0]) return { ok: false as const, error: "No pending request from that user." };
  await sql`
    update friend_requests set status = 'accepted'
    where requester_id = ${requesterId} and addressee_id = ${userId}
  `;
  return { ok: true as const };
}

export async function declineFriendRequest(requesterId: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  await sql`
    update friend_requests set status = 'declined'
    where requester_id = ${requesterId} and addressee_id = ${userId} and status = 'pending'
  `;
  return { ok: true as const };
}

export async function removeFriend(friendId: string, bearerToken?: string) {
  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  await sql`
    delete from friend_requests
    where status = 'accepted'
      and ((requester_id = ${userId} and addressee_id = ${friendId})
        or (requester_id = ${friendId} and addressee_id = ${userId}))
  `;
  return { ok: true as const };
}

async function loadUsersByIds(ids: string[]): Promise<Map<string, UserRow>> {
  const map = new Map<string, UserRow>();
  if (!ids.length) return map;
  try {
    const sql = await getSql();
    const rows = await sql<UserRow>`select id, name, image from "user" where id = any(${ids})`;
    for (const row of rows) map.set(row.id, row);
  } catch {
    /* no auth tables */
  }
  return map;
}
