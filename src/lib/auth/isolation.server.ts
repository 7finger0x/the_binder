import { headers } from "next/headers";

/**
 * Fetch-Metadata sibling isolation — **server-only** (`.server.ts` suffix).
 *
 * Apps deployed on `*.grok.me` are "same-site" to each other but MUTUALLY
 * UNTRUSTED. Reject scripted cross-site / same-site subrequests before
 * touching per-user data.
 */
export class CrossSiteRequestError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: cross-site request blocked");
    this.name = "CrossSiteRequestError";
  }
}

function hostsMatch(requestHost: string, url: string) {
  try {
    return new URL(url).host === requestHost;
  } catch {
    return false;
  }
}

function hasTrustedSameOriginHeaders(h: Headers) {
  const host = h.get("host");
  if (!host) return false;
  const origin = h.get("origin");
  if (origin && hostsMatch(host, origin)) return true;
  const referer = h.get("referer");
  if (referer && hostsMatch(host, referer)) return true;
  return false;
}

/** Throw `CrossSiteRequestError` for a scripted cross-site/sibling request. */
export async function assertSameSiteRequest(): Promise<void> {
  const h = await headers();
  const site = h.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") return;

  const dest = h.get("sec-fetch-dest");
  const mode = h.get("sec-fetch-mode");
  const method = h.get("x-http-method-override") ?? h.get(":method") ?? "POST";
  const isTopLevelGet =
    mode === "navigate" &&
    method === "GET" &&
    dest !== "object" &&
    dest !== "embed";
  if (isTopLevelGet) return;

  if (!site) {
    if (hasTrustedSameOriginHeaders(h)) return;
    throw new CrossSiteRequestError();
  }

  throw new CrossSiteRequestError();
}
