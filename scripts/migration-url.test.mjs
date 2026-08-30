import test from "node:test";
import assert from "node:assert/strict";
import { preparePgPoolConfig, toDirectMigrationUrl } from "./migration-url.mjs";

test("Neon pooler hostname is rewritten to direct", () => {
  const pooled =
    "postgresql://user:pass@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const out = toDirectMigrationUrl(pooled, "POSTGRES_URL");
  assert.match(out, /@ep-cool-name-123456\.us-east-2\.aws\.neon\.tech/);
  assert.doesNotMatch(out, /pooler/);
});

test("pooler port 6543 is switched to 5432 for DDL", () => {
  const pooled =
    "postgresql://user:pass@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech:6543/neondb?sslmode=require";
  const out = toDirectMigrationUrl(pooled, "DATABASE_URL");
  assert.match(out, /:5432\//);
  assert.doesNotMatch(out, /:6543/);
});

test("direct port 6543 without pooler host is still normalized", () => {
  const pooled =
    "postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech:6543/neondb?sslmode=require";
  const out = toDirectMigrationUrl(pooled, "POSTGRES_URL");
  assert.match(out, /:5432\//);
});

test("POSTGRES_URL_NON_POOLING still rewrites pooler host and port", () => {
  const mislabeled =
    "postgresql://user:pass@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech:6543/neondb?sslmode=require";
  const out = toDirectMigrationUrl(mislabeled, "POSTGRES_URL_NON_POOLING");
  assert.doesNotMatch(out, /pooler/);
  assert.match(out, /:5432\//);
});

test("pgbouncer=true query param is stripped", () => {
  const pooled =
    "postgresql://user:pass@ep-x.us-east-2.aws.neon.tech/neondb?pgbouncer=true&sslmode=require";
  const out = toDirectMigrationUrl(pooled, "POSTGRES_URL");
  assert.doesNotMatch(out, /pgbouncer=true/);
});

test("preparePgPoolConfig strips sslmode when using ssl option", () => {
  const url =
    "postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const { connectionString, ssl } = preparePgPoolConfig(url);
  assert.doesNotMatch(connectionString, /sslmode=/);
  assert.deepEqual(ssl, { rejectUnauthorized: false });
});

test("preparePgPoolConfig preserves credentials with reserved characters", () => {
  const url =
    "postgresql://user:p%40ss%3Aword@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const { connectionString } = preparePgPoolConfig(url);
  assert.match(connectionString, /p%40ss%3Aword/);
  assert.doesNotMatch(connectionString, /sslmode=/);
});
