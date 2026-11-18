import { redirect } from "next/navigation";
import { getScope } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

export default async function HomePage() {
  const scope = await getScope();
  redirect(scope.home);
}
