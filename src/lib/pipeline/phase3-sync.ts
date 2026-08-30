/**
 * Phase 3 — Synchronization
 * Sync Manager + IndexedDB Local Storage + Encrypted Cloud Backup.
 */

import {
  findSyncConflicts,
  mergeCardLists,
  resolveSyncConflicts,
  type Card,
  type SyncConflict,
} from "../cards";
import { deleteCard, loadCards, putCard, putMany } from "../idb";
import { deleteCloudCard, pullCloudCards, pushCloudCards } from "../cloud";

export type SyncManagerState = {
  lastSyncAt: number | null;
  pendingPush: Card[];
  conflicts: SyncConflict[];
};

const syncState: SyncManagerState = {
  lastSyncAt: null,
  pendingPush: [],
  conflicts: [],
};

/** Sync Manager — orchestrates local ↔ cloud reconciliation. */
export const SyncManager = {
  getState: () => ({ ...syncState }),

  /** Pull remote, detect conflicts, merge non-conflicting cards. */
  async reconcile(bearerToken?: string): Promise<{
    merged: Card[];
    conflicts: SyncConflict[];
    remote: Card[];
  }> {
    const local = await loadCards();
    const remote = await pullCloudCards(bearerToken);
    const conflicts = findSyncConflicts(local, remote);
    syncState.conflicts = conflicts;
    if (conflicts.length) {
      return { merged: local, conflicts, remote };
    }
    const merged = mergeCardLists(local, remote);
    syncState.lastSyncAt = Date.now();
    syncState.conflicts = [];
    return { merged, conflicts: [], remote };
  },

  /** Resolve user-picked conflict winners and persist locally + cloud. */
  async resolveAndPush(
    local: Card[],
    remote: Card[],
    picks: Record<string, "local" | "remote">,
    bearerToken?: string,
  ): Promise<Card[]> {
    const merged = resolveSyncConflicts(local, remote, picks);
    await putMany(merged);
    await pushCloudCards(merged.filter((c) => !c.id.startsWith("sample-")), bearerToken);
    syncState.lastSyncAt = Date.now();
    syncState.conflicts = [];
    return merged;
  },

  queuePush(cards: Card[]) {
    syncState.pendingPush.push(...cards);
  },

  async flushPush(bearerToken?: string) {
    if (!syncState.pendingPush.length) return;
    const batch = [...syncState.pendingPush];
    syncState.pendingPush = [];
    await pushCloudCards(batch, bearerToken);
    syncState.lastSyncAt = Date.now();
  },
};

/** IndexedDB Local Storage — offline-first persistence layer. */
export const LocalStore = {
  load: loadCards,
  put: putCard,
  putMany,
  delete: deleteCard,
};

/** Encrypted Cloud Backup — server-side Postgres via authenticated API. */
export const CloudBackup = {
  pull: pullCloudCards,
  push: pushCloudCards,
  delete: deleteCloudCard,
};

export { findSyncConflicts, resolveSyncConflicts, mergeCardLists };
