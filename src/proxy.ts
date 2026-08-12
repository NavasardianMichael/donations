import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

/**
 * Route protection.
 *
 * Next.js 16 renamed `middleware` to `proxy`. Proxy is meant to be invoked
 * separately from render code and may be deployed to a CDN edge, so this file
 * deliberately does NOT import the full Auth.js config (which would drag
 * Prisma along with it). It only verifies the session cookie's signature.
 *
 * That is a routing decision, not an authorization decision. Every Server
 * Action and query still does its own `requireUser()` + ownership check —
 * see src/lib/auth-guards.ts. A signed cookie proves who you are, not what
 * you may touch.
 */

/** Requires a session. Anonymous visitors are redirected to /login. */
const PROTECTED_PREFIXES = ["/dashboard", "/pages", "/analytics", "/settings"];

/** Signed-in users have no business here; send them to the dashboard. */
const AUTH_ONLY_PREFIXES = ["/login", "/signup", "/forgot-password"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    // Auth.js prefixes the cookie with `__Secure-` over HTTPS.
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isSignedIn = Boolean(token);

  if (!isSignedIn && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const login = new URL("/login", request.url);
    // Come back here after signing in. Path only — never echo an absolute URL
    // from user input into a redirect.
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (isSignedIn && matchesPrefix(pathname, AUTH_ONLY_PREFIXES)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Skip static assets, image optimisation, the auth API itself, the payment
   * callbacks, and the embed surface.
   *
   * `api/payments` covers the ArCa return leg and the Paddle webhook. Neither
   * carries a session cookie — one is a gateway redirect, the other a
   * server-to-server POST from Paddle — so decoding a token for them is pure
   * waste, and a proxy that ever grew a redirect would break a payment
   * confirmation silently. An embed must likewise render for anonymous visitors
   * inside a third-party iframe with no redirect logic in the way.
   */
  matcher: [
    "/((?!api/auth|api/track|api/payments|embed|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)",
  ],
};
