import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

/**
 * Ensures a local env file exists and contains a usable Auth.js secret. Safe to
 * run from the repository root or from web/.
 */
// Build environments (Render, Vercel, CI) must get their secrets from the
// platform. Never create an ephemeral .env file there.
if (process.env.RENDER || process.env.VERCEL || process.env.CI) process.exit(0);

const cwd = process.cwd();
const inWeb = cwd.endsWith("/web") || cwd.endsWith("\\web");
const envPath = inWeb ? join(cwd, ".env") : join(cwd, "web", ".env");
const examplePath = inWeb
  ? join(cwd, ".env.example")
  : join(cwd, "web", ".env.example");

if (!existsSync(envPath) && existsSync(examplePath)) {
  copyFileSync(examplePath, envPath);
}
if (!existsSync(envPath)) process.exit(0);

let text = readFileSync(envPath, "utf8");
const match = /^AUTH_SECRET=(.*)$/m.exec(text);
const current = match?.[1].trim().replace(/^"|"$/g, "");
if (!match || !current) {
  const secret = randomBytes(32).toString("base64");
  text = match
    ? text.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`)
    : `${text.trimEnd()}\nAUTH_SECRET="${secret}"\n`;
  writeFileSync(envPath, text);
  console.log("Generated AUTH_SECRET in web/.env");
}
