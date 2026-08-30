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

/**
 * Poolers reject DDL. Rewrite pooled Neon/Vercel URLs to the direct compute endpoint.
 *
 * @param {string} url
 * @param {string} source
 * @returns {string}
 */
export function toDirectMigrationUrl(url, source) {
  if (DIRECT_URL_SOURCES.has(source)) {
    return url;
  }
  try {
    const parsed = new URL(url);
    let rewritten = false;

    if (parsed.hostname.includes("-pooler.")) {
      parsed.hostname = parsed.hostname.replace("-pooler.", ".");
      rewritten = true;
    } else if (parsed.hostname.includes(".pooler.")) {
      parsed.hostname = parsed.hostname.replace(".pooler.", ".");
      rewritten = true;
    }

    if (parsed.searchParams.get("pgbouncer") === "true") {
      parsed.searchParams.delete("pgbouncer");
      rewritten = true;
    }

    // Neon pooler often uses 6543; the direct endpoint listens on 5432.
    if (parsed.port === "6543" || (rewritten && !parsed.port)) {
      parsed.port = "5432";
      rewritten = true;
    }

    return parsed.toString();
  } catch {
    let fallback = url;
    if (fallback.includes("-pooler.")) {
      fallback = fallback.replace("-pooler.", ".");
    } else if (fallback.includes(".pooler.")) {
      fallback = fallback.replace(".pooler.", ".");
    }
    if (fallback.includes(":6543")) {
      fallback = fallback.replace(":6543", ":5432");
    }
    return fallback;
  }
}
