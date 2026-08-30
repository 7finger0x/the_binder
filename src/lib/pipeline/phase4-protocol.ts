/**
 * Phase 4 — Protocol Logic
 * P2P Synchronization Protocol, Conflict Resolution, Data Integrity Checks.
 */

import { normalizeCard, type Card } from "../cards";
import { findSyncConflicts, resolveSyncConflicts } from "../cards";
import type { IntegrityReport } from "./types";

export { P2PRoom, type P2PRoomOptions, type PeerInfo } from "../multiplayer/p2p";
export { findSyncConflicts, resolveSyncConflicts };

/** P2P card sync message envelope for Collection Core replication. */
export type P2PSyncEnvelope = {
  type: "cards:delta" | "cards:full" | "cards:ack";
  cards?: Card[];
  deviceId: string;
  timestamp: number;
};

export function buildP2PDelta(local: Card[], remote: Card[]): P2PSyncEnvelope["cards"] {
  const remoteIds = new Set(remote.map((c) => c.id));
  return local.filter((c) => !remoteIds.has(c.id) || needsSync(c, remote.find((r) => r.id === c.id)!));
}

function needsSync(a: Card, b: Card) {
  return (a.updatedAt || 0) > (b.updatedAt || 0);
}

/** Conflict Resolution — last-write-wins with explicit user override support. */
export function autoResolveConflicts(
  local: Card[],
  remote: Card[],
): Card[] {
  const conflicts = findSyncConflicts(local, remote);
  if (!conflicts.length) {
    const map = new Map<string, Card>();
    for (const c of [...local, ...remote]) {
      const cur = map.get(c.id);
      if (!cur || (c.updatedAt || 0) >= (cur.updatedAt || 0)) map.set(c.id, c);
    }
    return Array.from(map.values());
  }
  const picks: Record<string, "local" | "remote"> = {};
  for (const { local: l, remote: r } of conflicts) {
    picks[l.id] = (l.updatedAt || 0) >= (r.updatedAt || 0) ? "local" : "remote";
  }
  return resolveSyncConflicts(local, remote, picks);
}

/** Data Integrity Check — validates collection consistency before sync/export. */
export function runIntegrityCheck(cards: Card[]): IntegrityReport {
  const issues: string[] = [];
  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  let orphanedRefs = 0;

  for (const raw of cards) {
    const card = normalizeCard(raw);
    if (!card) {
      issues.push("Invalid card record encountered.");
      orphanedRefs++;
      continue;
    }
    if (seenIds.has(card.id)) duplicateIds.push(card.id);
    seenIds.add(card.id);
    if (!card.name?.trim()) issues.push(`Card ${card.id} missing name.`);
    if (card.page > 0 && (card.pocket < 0 || card.pocket > 8)) {
      issues.push(`Card ${card.id} has invalid pocket index.`);
    }
  }

  return {
    ok: issues.length === 0 && duplicateIds.length === 0,
    issues,
    cardCount: cards.length,
    duplicateIds,
    orphanedRefs,
  };
}

/** Pre-sync gate — blocks push when integrity fails. */
export function assertIntegrity(cards: Card[]): void {
  const report = runIntegrityCheck(cards);
  if (!report.ok) {
    throw new Error(`Integrity check failed: ${report.issues[0] ?? "duplicate IDs"}`);
  }
}
