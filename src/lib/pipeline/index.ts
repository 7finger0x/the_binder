/**
 * The Card Binder — 4-Phase Collection Core Pipeline
 *
 * Phase 1: Data Ingestion (camera, scanner API, OCR)
 * Phase 2: Data Processing (identification, checklist lookup, normalization, core engine)
 * Phase 3: Synchronization (sync manager, IndexedDB, cloud backup)
 * Phase 4: Protocol Logic (P2P sync, conflict resolution, integrity checks)
 */

export * from "./types";
export * as Ingestion from "./phase1-ingestion";
export * as Processing from "./phase2-processing";
export * as Sync from "./phase3-sync";
export * as Protocol from "./phase4-protocol";
