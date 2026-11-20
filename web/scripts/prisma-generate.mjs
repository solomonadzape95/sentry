/**
 * Generate the Prisma client for whichever database DATABASE_URL points at.
 *
 * Prisma cannot switch datasource providers from an environment variable, so
 * the SQLite demo schema stays canonical and this script generates the
 * Postgres profile (prisma/schema.postgres.prisma) when needed. It runs:
 *
 *   - after `npm install` (so Vercel builds do not ship a SQLite client)
 *   - before `next build`
 *   - before `next dev` (so local development heals after a Postgres seed)
 *
 * Resolution order for DATABASE_URL: the process environment first, then
 * web/.env. If no URL is present we fall back to the SQLite demo client.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("..", import.meta.url));
const prismaBin = join(
  webRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);

if (!existsSync(prismaBin)) {
  console.warn("[prisma] CLI is not installed; skipping client generation.");
  process.exit(0);
}

function databaseUrlFromEnvFile() {
  const envPath = join(webRoot, ".env");
  if (!existsSync(envPath)) return "";
  const match = /^DATABASE_URL=(.*)$/m.exec(readFileSync(envPath, "utf8"));
  return (match?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
}

const databaseUrl =
  (process.env.DATABASE_URL ?? "").trim() || databaseUrlFromEnvFile();
const isPostgres = /^postgres(ql)?:\/\//i.test(databaseUrl);

if (isPostgres) {
  execFileSync(process.execPath, [join(webRoot, "scripts", "make-postgres-schema.mjs")], {
    cwd: webRoot,
    stdio: "inherit",
  });
  execFileSync(prismaBin, ["generate", "--schema=prisma/schema.postgres.prisma"], {
    cwd: webRoot,
    stdio: "inherit",
  });
  console.log("[prisma] Generated the PostgreSQL client.");
} else {
  if (!databaseUrl) {
    console.warn("[prisma] DATABASE_URL is not set; using the SQLite demo client.");
  }
  execFileSync(prismaBin, ["generate"], { cwd: webRoot, stdio: "inherit" });
  console.log("[prisma] Generated the SQLite client.");
}
