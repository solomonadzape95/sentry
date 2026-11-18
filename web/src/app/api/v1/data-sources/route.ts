import { apiOk } from "@/lib/api";
import { getDataProvenance } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const { sources, runs } = await getDataProvenance();
  return apiOk(
    { sources, runs },
    {
      count: sources.length,
      runs: runs.length,
      activeSources: sources.filter((source) => source.status === "ACTIVE").length,
      gatedSources: sources.filter((source) => source.status === "GATED").length,
    },
  );
}
