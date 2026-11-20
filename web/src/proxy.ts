import { NextResponse, type NextRequest } from "next/server";

/**
 * Must match FACILITY_COOKIE in src/lib/session.ts. Kept inline because Proxy
 * runs before the render graph and should not pull in server-only modules.
 */
const FACILITY_COOKIE = "cheta_facility";
const FACILITY_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

/**
 * The active facility is stored in a cookie and used by pages that do not name
 * a facility themselves (/today, /m). Facility-scoped URLs, however, carry the
 * facility in the path (/facilities/:id) or query (?facility=:id). Without this
 * sync the cookie keeps its old value, so navigating from General Hospital to
 * "Today" or the mobile workspace silently falls back to the default facility
 * (Gwagwalada PHC).
 *
 * Access control is still enforced by buildScope and each page: the cookie can
 * only ever select a facility the persona is already allowed to see.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const fromQuery = searchParams.get("facility");
  const fromPath = pathname.match(/^\/facilities\/([^/]+)\/?$/)?.[1];
  const candidate = fromQuery ?? fromPath;

  if (!candidate || !FACILITY_ID.test(candidate)) return NextResponse.next();
  if (request.cookies.get(FACILITY_COOKIE)?.value === candidate) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(FACILITY_COOKIE, candidate, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export const config = {
  matcher: [
    /*
     * Skip API routes, static assets and metadata files. Pages and RSC
     * navigations still run through the proxy.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
