#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 */
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pendingMigrations } from "./migration-plan.mjs";
import {
  preparePgPoolConfig,
  readMigrationUrl,
  toDirectMigrationUrl,
} from "./migration-url.mjs";

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

const migrationTarget = readMigrationUrl();
if (!migrationTarget) {
  console.log(
    "[migrate] no Postgres URL set - skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const { source: databaseSource } = migrationTarget;
const databaseUrl = toDirectMigrationUrl(migrationTarget.url, databaseSource);
if (databaseUrl !== migrationTarget.url) {
  console.log("[migrate] using direct Neon endpoint (pooler URLs cannot run DDL)");
}

function migrationHostForLog(url) {
  const match = url.match(/@([^/?]+)/);
  return match?.[1] ?? "(unknown)";
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/** @param {string} url */
function isRetryableConnectError(err) {
  const code = err?.code;
  return (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    code === "ECONNRESET"
  );
}

/**
 * @param {string} primaryUrl
 * @param {string} fallbackUrl
 */
async function connectMigrationClient(primaryUrl, fallbackUrl) {
  const candidates = primaryUrl === fallbackUrl ? [primaryUrl] : [primaryUrl, fallbackUrl];
  let lastErr;

  for (let i = 0; i < candidates.length; i += 1) {
    const url = candidates[i];
    const { connectionString, ssl } = preparePgPoolConfig(url);
    const pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 60_000,
      ssl,
    });
    try {
      const client = await pool.connect();
      if (i > 0) {
        console.log("[migrate] connected using alternate database URL");
      }
      return { pool, client, connectionString };
    } catch (err) {
      lastErr = err;
      await pool.end().catch(() => {});
      const hasFallback = i < candidates.length - 1;
      if (!hasFallback || !isRetryableConnectError(err)) {
        throw err;
      }
      console.warn(
        `[migrate] connection failed (${err?.code || err?.message}); retrying with alternate URL`,
      );
    }
  }

  throw lastErr;
}

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory - nothing to do.");
    return;
  }

  const pending = pendingMigrations(entries, []);
  if (pending.length === 0) {
    console.log("[migrate] no migrations - nothing to do.");
    return;
  }

  console.log(
    `[migrate] ${pending.length} migration file(s) to check via ${databaseSource}`,
  );

  const { pool, client, connectionString } = await connectMigrationClient(
    databaseUrl,
    migrationTarget.url,
  );
  console.log(`[migrate] connected (${migrationHostForLog(connectionString)})`);

  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done - ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
