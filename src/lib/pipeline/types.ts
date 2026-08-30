/** Shared types for the 4-phase Collection Core pipeline. */

export type IngestAngle = "front" | "back" | "page";

export type IngestPayload = {
  angle: IngestAngle;
  imageDataUrl: string;
  mirrorBack?: boolean;
};

export type IngestResult =
  | { ok: true; payloads: IngestPayload[] }
  | { ok: false; error: string };

export type ProcessedCard = {
  draft: import("./cards-ref").CardDraft;
  source: "scanner" | "ocr" | "manual";
};

export type ProcessResult =
  | { ok: true; cards: ProcessedCard[] }
  | { ok: false; error: string };

export type SyncState = "idle" | "syncing" | "conflict" | "error";

export type IntegrityReport = {
  ok: boolean;
  issues: string[];
  cardCount: number;
  duplicateIds: string[];
  orphanedRefs: number;
};

// Re-export Card types for pipeline consumers without circular imports at runtime.
export type { Card, CardDraft } from "../cards";
