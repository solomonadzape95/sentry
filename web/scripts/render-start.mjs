/**
 * Render start command.
 *
 * Render's port scan needs the HTTP server to bind quickly, so Next.js starts
 * first. A background bootstrap then:
 *
 *   1. applies the Postgres schema with `prisma db push`
 *   2. reads the SeedState marker
 *   3. seeds the demo dataset only if that marker is missing
 *
 * The seed deletes the marker when it starts and recreates it at the end, so an
 * interrupted seed is retried on the next start. The web server keeps running
 * even if bootstrapping fails; failures are visible in the logs.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("..", import.meta.url));
const nextBin = join(webRoot, "node_modules", "next", "dist", "bin", "next");
const prismaCli = join(webRoot, "node_modules", "prisma", "build", "index.js");
const tsxCli = join(webRoot, "node_modules", "tsx", "dist", "cli.mjs");

for (const [label, path] of [
  ["Next.js", nextBin],
  ["Prisma", prismaCli],
  ["tsx", tsxCli],
]) {
  if (!existsSync(path)) {
    console.error(`[bootstrap] ${label} is missing at ${path}. Check the build install.`);
  }
}

const server = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0"], {
  cwd: webRoot,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 0 : 1));
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readSeedMarker() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    return await prisma.seedState.findUnique({ where: { id: "demo" } });
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    console.error("[bootstrap] DATABASE_URL is not set; skipping schema and seed.");
    return;
  }

  // Give Render's port scan a head start before doing any database work.
  await sleep(3000);

  let pushed = false;
  for (let attempt = 1; attempt <= 10 && !pushed; attempt++) {
    try {
      execFileSync(process.execPath, [join(webRoot, "scripts", "make-postgres-schema.mjs")], {
        cwd: webRoot,
        stdio: "inherit",
      });
      execFileSync(
        process.execPath,
        [prismaCli, "db", "push", "--schema=prisma/schema.postgres.prisma", "--skip-generate"],
        { cwd: webRoot, stdio: "inherit" },
      );
      pushed = true;
    } catch (error) {
      console.error(`[bootstrap] schema push failed (attempt ${attempt}/10); retrying in 5s.`);
      if (attempt < 10) await sleep(5000);
    }
  }

  if (!pushed) {
    console.error("[bootstrap] could not apply the schema; the next start will retry.");
    return;
  }

  let marker;
  try {
    marker = await readSeedMarker();
  } catch (error) {
    console.error("[bootstrap] could not read the seed marker:", error?.message ?? error);
    return;
  }

  if (marker) {
    console.log("[bootstrap] demo data is already seeded; nothing to do.");
    return;
  }

  console.log("[bootstrap] seed marker missing; seeding demo data...");
  try {
    execFileSync(process.execPath, [tsxCli, "prisma/seed.ts"], {
      cwd: webRoot,
      stdio: "inherit",
    });
    console.log("[bootstrap] demo data seeded.");
  } catch (error) {
    console.error("[bootstrap] seed failed; the next start will retry.");
  }
}

bootstrap().catch((error) => {
  console.error("[bootstrap] unexpected failure:", error);
});
