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

function stripQueryFlag(url, flag) {
  const pattern = new RegExp(`([?&])${flag}=[^&]*(&|$)`, "g");
  let out = url.replace(pattern, "$1");
  return out.replace(/\?&/, "?").replace(/[?&]$/, "");
}

/**
 * Poolers reject DDL. Rewrite pooled Neon/Vercel URLs to the direct compute endpoint.
 * Uses string rewrites so passwords with special characters are not corrupted by URL parsing.
 *
 * @param {string} url
 * @param {string} _source
 * @returns {string}
 */
export function toDirectMigrationUrl(url, _source) {
  let out = url;
  if (out.includes("-pooler.")) {
    out = out.replaceAll("-pooler.", ".");
  } else if (out.includes(".pooler.")) {
    out = out.replaceAll(".pooler.", ".");
  }

  out = stripQueryFlag(out, "pgbouncer");

  if (/:6543(\/|\?|$)/.test(out)) {
    out = out.replace(/:6543(?=\/|\?|$)/, ":5432");
  }

  return out;
}

/**
 * Build node-postgres pool options for Neon/Vercel (TLS + query params that break pg).
 * Avoids `new URL()` so credentials with reserved characters stay intact.
 *
 * @param {string} url
 * @returns {{ connectionString: string, ssl?: { rejectUnauthorized: boolean } }}
 */
export function preparePgPoolConfig(url) {
  const disableSsl = /(?:^|[?&])sslmode=disable(?:&|$)/i.test(url);
  let connectionString = url;
  if (!disableSsl) {
    connectionString = stripQueryFlag(connectionString, "sslmode");
  }
  connectionString = stripQueryFlag(connectionString, "channel_binding");
  const ssl = disableSsl ? undefined : { rejectUnauthorized: false };
  return { connectionString, ssl };
}
