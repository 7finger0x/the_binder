/**
 * Phase 1 — Data Ingestion
 * Multi-angle camera capture, Card Scanner API, and Document OCR parsing.
 */

import { fileToJpeg } from "../image";
import type { IngestAngle, IngestPayload, IngestResult } from "./types";

/** Capture from device camera or photo library → normalized JPEG data URL. */
export async function captureFromFile(
  file: File,
  angle: IngestAngle,
  maxEdge = 1280,
): Promise<IngestPayload | null> {
  if (!file.type.startsWith("image/")) return null;
  const dataUrl = await fileToJpeg(file, maxEdge, 0.82);
  return { angle, imageDataUrl: dataUrl };
}

/** Multi-angle bundle: front + optional back page for 9-pocket sleeve scans. */
export function buildMultiAnglePayload(
  front: string,
  back?: string | null,
  mirrorBack = false,
): IngestResult {
  if (!front) return { ok: false, error: "Front image is required." };
  const payloads: IngestPayload[] = [{ angle: "front", imageDataUrl: front }];
  if (back) payloads.push({ angle: "back", imageDataUrl: back, mirrorBack });
  return { ok: true, payloads };
}

/** Card Scanner API — routes page/single images to the vision identification service. */
export { identifyPage } from "../identify";

/** Document OCR parsing — extracts structured card fields from scanner API response. */
export { enrichIdentifiedCards } from "../catalog-match";
