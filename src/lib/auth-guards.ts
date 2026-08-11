import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * Authorization helpers for Server Actions, Route Handlers and RSC queries.
 *
 * `proxy.ts` only decides which URLs render. It grants nothing. A Server
 * Action is a public HTTP endpoint that anyone can POST to directly, so every
 * one of them starts by calling into this file.
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
}

/** Current user, or null. Use when both states are renderable. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    emailVerified: session.user.emailVerified ?? null,
  };
}

/**
 * Current user, or redirect to /login. For Server Components and page-level
 * loaders where an anonymous visitor should never see the route.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Thrown by `requireUserOrThrow`. Server Actions catch this and return a
 * result object rather than redirecting mid-mutation.
 */
export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Current user, or throw. For Server Actions. */
export async function requireUserOrThrow(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
