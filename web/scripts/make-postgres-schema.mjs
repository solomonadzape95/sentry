/**
 * Generate a Postgres variant of the Prisma schema.
 *
 * Prisma does not support an env-driven provider, so the SQLite demo schema
 * stays the default and this script produces the Postgres profile. Regenerate
 * the client with:
 *
 *   npm run db:pg:generate
 *
 * Switch back to the SQLite demo with:
 *
 *   npm run db:sqlite:generate
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = join(root, "prisma", "schema.prisma");
const target = join(root, "prisma", "schema.postgres.prisma");

const schema = readFileSync(source, "utf8").replace(
  'provider = "sqlite"',
  'provider = "postgresql"',
);

if (!schema.includes('provider = "postgresql"')) {
  throw new Error("Could not find the SQLite provider in prisma/schema.prisma");
}

writeFileSync(target, schema);
console.log(`wrote ${target}`);
