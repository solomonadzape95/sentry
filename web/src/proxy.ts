import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/home",
  "/today",
  "/dashboard",
  "/facilities",
  "/inventory",
  "/forecasts",
  "/transfers",
  "/model",
  "/data",
  "/admin",
  "/account",
  "/supplier",
  "/m",
];

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name === "authjs.session-token" ||
        cookie.name === "__Secure-authjs.session-token",
    );
}

/**
 * Optimistic route guard only. The real check is the database-backed session
 * guard in `getPersona()` / `getApiPersona()`, because a cookie can be stale or
 * forged. Next.js 16 calls this file `proxy.ts` (formerly middleware).
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (protectedRoute && !hasSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
