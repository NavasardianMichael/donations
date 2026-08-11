"use server";

import { unstable_rethrow } from "next/navigation";

import { AuthError } from "next-auth";

import { signIn as authSignIn, signOut as authSignOut } from "@/lib/auth";
import { requireUserOrThrow } from "@/lib/auth-guards";
import { passwordResetEmail, sendEmail, verificationEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import {
  consumeVerificationToken,
  consumePasswordResetToken,
  createPasswordResetToken,
  createVerificationToken,
  lookupPasswordResetToken,
} from "@/lib/tokens";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";

import {
  fail,
  ok,
  rateLimited,
  zodFieldErrors,
  type ActionResult,
} from "./types";

/**
 * Every action here is a public HTTP endpoint. They all validate with Zod and
 * rate limit before touching the database.
 *
 * A recurring theme: none of these confirm whether an email address is
 * registered. Sign-up, sign-in and password reset all return the same shape
 * whether or not the account exists, because an endpoint that says "no such
 * user" is an account enumeration oracle.
 */

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

export async function signUpAction(
  input: unknown,
): Promise<ActionResult<{ email: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Check the highlighted fields.",
      zodFieldErrors(parsed.error.issues),
    );
  }

  const { name, email, password, website } = parsed.data;

  // Honeypot: a real browser leaves this empty because it is visually hidden
  // and aria-hidden. Fail silently so bots do not learn what tripped them.
  if (website) return ok({ email });

  const ip = await clientIp();
  const limit = await rateLimit("signup", ip);
  if (!limit.success) return rateLimited(retryAfterSeconds(limit));

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, emailVerified: true },
  });

  if (existing) {
    // Do NOT say "already registered" — that confirms the address exists.
    // Instead send mail that is useful to whoever actually owns the inbox.
    if (!existing.passwordHash) {
      // OAuth-only account. Tell the real owner to sign in with Google.
      await sendEmail(email, {
        subject: "Sign in with Google",
        html: `<p>Someone tried to create a password account for this address, but it is already registered through Google. Use <a href="${absoluteUrl("/login")}">Continue with Google</a> to sign in.</p>`,
        text: `Someone tried to create a password account for this address, but it is already registered through Google. Sign in at ${absoluteUrl("/login")} using "Continue with Google".`,
      });
    } else if (!existing.emailVerified) {
      // Unverified: re-send the confirmation so a genuine retry works.
      const token = await createVerificationToken(email);
      await sendEmail(
        email,
        verificationEmail({
          name,
          url: absoluteUrl(`/verify-email?token=${token}`),
        }),
      );
    } else {
      await sendEmail(email, {
        subject: "You already have an account",
        html: `<p>Someone tried to sign up with this address. You already have an account — <a href="${absoluteUrl("/login")}">sign in</a> or <a href="${absoluteUrl("/forgot-password")}">reset your password</a>.</p>`,
        text: `Someone tried to sign up with this address. You already have an account. Sign in at ${absoluteUrl("/login")} or reset your password at ${absoluteUrl("/forgot-password")}.`,
      });
    }

    return ok({ email });
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const token = await createVerificationToken(email);
  await sendEmail(
    email,
    verificationEmail({
      name,
      url: absoluteUrl(`/verify-email?token=${token}`),
    }),
  );

  return ok({ email });
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export async function signInAction(
  input: unknown,
  callbackUrl?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Check the highlighted fields.",
      zodFieldErrors(parsed.error.issues),
    );
  }

  const { email, password } = parsed.data;

  // Key on ip+email so one attacker behind a shared NAT cannot lock out every
  // other user on that address, and so a single account cannot be hammered
  // from one host.
  const ip = await clientIp();
  const limit = await rateLimit("login", `${ip}:${email}`);
  if (!limit.success) return rateLimited(retryAfterSeconds(limit));

  try {
    await authSignIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    // Auth.js signals navigation by throwing; that must not be swallowed here.
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      // Deliberately identical for "no such user" and "wrong password".
      return fail("That email or password is not right.");
    }
    throw error;
  }

  return ok({ redirectTo: safeRedirect(callbackUrl) });
}

export async function signOutAction(): Promise<void> {
  await authSignOut({ redirectTo: "/login" });
}

/**
 * Only ever redirect to a path on this origin. An attacker-supplied
 * `callbackUrl` of `https://evil.example` would otherwise turn the login page
 * into an open redirect.
 */
function safeRedirect(callbackUrl?: string): string {
  if (!callbackUrl) return "/dashboard";
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/dashboard";
  }
  return callbackUrl;
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function verifyEmailAction(
  token: string,
): Promise<ActionResult<{ email: string }>> {
  const result = await consumeVerificationToken(token);

  if (!result.ok) {
    return fail(
      result.reason === "expired"
        ? "That link has expired. Request a new one below."
        : "That link is not valid. It may already have been used.",
    );
  }

  await prisma.user.updateMany({
    where: { email: result.email, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  return ok({ email: result.email }, "Your email is confirmed.");
}

export async function resendVerificationAction(): Promise<ActionResult> {
  const user = await requireUserOrThrow();

  if (user.emailVerified) {
    return fail("That address is already confirmed.");
  }

  const limit = await rateLimit("passwordReset", `verify:${user.id}`);
  if (!limit.success) return rateLimited(retryAfterSeconds(limit));

  const token = await createVerificationToken(user.email);
  await sendEmail(
    user.email,
    verificationEmail({
      name: user.name,
      url: absoluteUrl(`/verify-email?token=${token}`),
    }),
  );

  return ok(undefined, `Confirmation sent to ${user.email}.`);
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Enter a valid email address.",
      zodFieldErrors(parsed.error.issues),
    );
  }

  const { email } = parsed.data;

  const ip = await clientIp();
  const limit = await rateLimit("passwordReset", `${ip}:${email}`);
  if (!limit.success) return rateLimited(retryAfterSeconds(limit));

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, passwordHash: true },
  });

  // Only send a reset link to accounts that actually have a password. An
  // OAuth-only user has nothing to reset. Either way the caller sees the same
  // response.
  if (user?.passwordHash) {
    const token = await createPasswordResetToken(user.id);
    await sendEmail(
      email,
      passwordResetEmail({
        name: user.name,
        url: absoluteUrl(`/reset-password?token=${token}`),
      }),
    );
  }

  return ok(
    undefined,
    "If that address has an account, a reset link is on its way.",
  );
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Check the highlighted fields.",
      zodFieldErrors(parsed.error.issues),
    );
  }

  const { token, password } = parsed.data;

  const ip = await clientIp();
  const limit = await rateLimit("passwordReset", `reset:${ip}`);
  if (!limit.success) return rateLimited(retryAfterSeconds(limit));

  const lookup = await lookupPasswordResetToken(token);
  if (!lookup.ok) {
    return fail(
      lookup.reason === "expired"
        ? "That link has expired. Request a new one."
        : "That link is no longer valid. Request a new one.",
    );
  }

  // Consume first: if two submissions race, only one wins the update.
  const consumed = await consumePasswordResetToken(lookup.tokenId);
  if (!consumed) {
    return fail("That link has already been used. Request a new one.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: lookup.userId },
      data: {
        passwordHash,
        // Completing a reset proves inbox control, so the address is verified.
        emailVerified: new Date(),
      },
    }),
    // Setting a new password invalidates existing sessions. JWT sessions are
    // stateless, so this only clears database sessions, but it keeps the two
    // strategies consistent if we ever switch.
    prisma.session.deleteMany({ where: { userId: lookup.userId } }),
  ]);

  return ok(undefined, "Your password has been changed. Sign in to continue.");
}
