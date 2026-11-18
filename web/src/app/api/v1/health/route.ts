import { prisma } from "@/lib/db";
import { apiOk } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return apiOk({
    status: "ok",
    service: "sentry-api",
    version: "v1",
    database: "reachable",
    latencyMs: Date.now() - started,
  });
}
