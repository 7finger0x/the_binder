/**
 * Neon/Vercel Postgres URL normalization for deploy-time DDL (see scripts/migrate.mjs).
 */

/** @typedef {{ url: string, source: string }} MigrationTarget */

/**
 * @returns {MigrationTarget | null}
 */
export function readMigrationUrl() {
  for (const key of [
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL_UNPOOLED",
    "NEON_DATABASE_URL_UNPOOLED",
    "DIRECT_URL",
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "NEON_DATABASE_URL",
  ]) {
    const value = process.env[key]?.trim();
    if (value) return { url: value, source: key };
  }
  return null;
}

const DIRECT_URL_SOURCES = new Set([
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "NEON_DATABASE_URL_UNPOOLED",
  "DIRECT_URL",
]);

function stripQueryFlag(url, flag) {
  const pattern = new RegExp(`([?&])${flag}=true(&|$)`, "g");
  let out = url.replace(pattern, "$1");
  return out.replace(/\?&/, "?").replace(/[?&]$/, "");
}

/**
 * Poolers reject DDL. Rewrite pooled Neon/Vercel URLs to the direct compute endpoint.
 * Uses string rewrites so passwords with special characters are not corrupted by URL parsing.
 *
 * @param {string} url
 * @param {string} source
 * @returns {string}
 */
export function toDirectMigrationUrl(url, source) {
  if (DIRECT_URL_SOURCES.has(source)) {
    return url;
  }

  let out = url;
  if (out.includes("-pooler.")) {
    out = out.replaceAll("-pooler.", ".");
  } else if (out.includes(".pooler.")) {
    out = out.replaceAll(".pooler.", ".");
  }

  out = stripQueryFlag(out, "pgbouncer");

  // Neon pooler often uses 6543; direct compute listens on 5432.
  if (/:6543(\/|\?|$)/.test(out)) {
    out = out.replace(/:6543(?=\/|\?|$)/, ":5432");
  }

  return out;
}
