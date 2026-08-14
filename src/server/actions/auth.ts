"use server";

import { getTranslations } from "next-intl/server";
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
  consumePasswordResetToken,
  consumeVerificationToken,
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
import { resolver } from "@/lib/validations/resolver";
import { safeRedirect } from "@/lib/safe-redirect";

import {
  fail,
  failTokenInvalid,
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
 *
 * Messages come from the translation catalogue via `getTranslations`, so the
 * server speaks the same language as the page that called it.
 */

async function limiterMessage(retryAfter: number): Promise<string> {
  const t = await getTranslations("validation");
  return t("rateLimited", { seconds: retryAfter });
}

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

export async function signUpAction(
  input: unknown,
): Promise<ActionResult<{ email: string }>> {
  const tv = await getTranslations("validation");
  const te = await getTranslations("email");

  const parsed = signUpSchema(resolver(tv)).safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { name, email, password, website } = parsed.data;

  // Honeypot: a real browser leaves this empty because it is visually hidden
  // and aria-hidden. Fail silently so bots do not learn what tripped them.
  if (website) return ok({ email });

  const ip = await clientIp();
  const limit = await rateLimit("signup", ip);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(await limiterMessage(retryAfter), retryAfter);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, emailVerified: true },
  });

  if (existing) {
    // Do NOT say "already registered" — that confirms the address exists.
    // Instead send mail that is useful to whoever actually owns the inbox.
    if (!existing.passwordHash) {
      await sendEmail(email, {
        subject: te("alreadyGoogle.subject"),
        html: `<p>${te("alreadyGoogle.html", { url: absoluteUrl("/login") })}</p>`,
        text: te("alreadyGoogle.text", { url: absoluteUrl("/login") }),
      });
    } else if (!existing.emailVerified) {
      // Unverified: re-send the confirmation so a genuine retry works.
      const token = await createVerificationToken(email);
      await sendEmail(
        email,
        verificationEmail({
          name,
          url: absoluteUrl(`/verify-email?token=${token}`),
          t: resolver(te),
        }),
      );
    } else {
      await sendEmail(email, {
        subject: te("alreadyRegistered.subject"),
        html: `<p>${te("alreadyRegistered.html", {
          loginUrl: absoluteUrl("/login"),
          resetUrl: absoluteUrl("/forgot-password"),
        })}</p>`,
        text: te("alreadyRegistered.text", {
          loginUrl: absoluteUrl("/login"),
          resetUrl: absoluteUrl("/forgot-password"),
        }),
      });
    }

    return ok({ email });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { name, email, passwordHash } });

  const token = await createVerificationToken(email);
  await sendEmail(
    email,
    verificationEmail({
      name,
      url: absoluteUrl(`/verify-email?token=${token}`),
      t: resolver(te),
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
  const tv = await getTranslations("validation");
  const ta = await getTranslations("auth.login");

  const parsed = signInSchema(resolver(tv)).safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { email, password } = parsed.data;

  // Key on ip+email so one attacker behind a shared NAT cannot lock out every
  // other user on that address, and so a single account cannot be hammered
  // from one host.
  const ip = await clientIp();
  const limit = await rateLimit("login", `${ip}:${email}`);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(await limiterMessage(retryAfter), retryAfter);
  }

  try {
    await authSignIn("credentials", { email, password, redirect: false });
  } catch (error) {
    // Auth.js signals navigation by throwing; that must not be swallowed here.
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      // Deliberately identical for "no such user" and "wrong password".
      return fail(ta("invalidCredentials"));
    }
    throw error;
  }

  return ok({ redirectTo: safeRedirect(callbackUrl) });
}

export async function signOutAction(): Promise<void> {
  await authSignOut({ redirectTo: "/login" });
}


// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function verifyEmailAction(
  token: string,
): Promise<ActionResult<{ email: string }>> {
  const t = await getTranslations("auth.verifyEmail");
  const result = await consumeVerificationToken(token);

  if (!result.ok) {
    return failTokenInvalid(
      result.reason === "expired" ? t("linkExpired") : t("linkInvalid"),
    );
  }

  await prisma.user.updateMany({
    where: { email: result.email, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  return ok({ email: result.email }, t("confirmedBody"));
}

export async function resendVerificationAction(): Promise<ActionResult> {
  const t = await getTranslations("auth.verifyEmail");
  const te = await getTranslations("email");

  const user = await requireUserOrThrow();

  if (user.emailVerified) return fail(t("alreadyConfirmed"));

  const limit = await rateLimit("passwordReset", `verify:${user.id}`);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(await limiterMessage(retryAfter), retryAfter);
  }

  const token = await createVerificationToken(user.email);
  await sendEmail(
    user.email,
    verificationEmail({
      name: user.name,
      url: absoluteUrl(`/verify-email?token=${token}`),
      t: resolver(te),
    }),
  );

  return ok(undefined, t("resent", { email: user.email }));
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult> {
  const tv = await getTranslations("validation");
  const ta = await getTranslations("auth.forgotPassword");
  const te = await getTranslations("email");

  const parsed = forgotPasswordSchema(resolver(tv)).safeParse(input);
  if (!parsed.success) {
    return fail(tv("email.invalid"), zodFieldErrors(parsed.error.issues));
  }

  const { email } = parsed.data;

  const ip = await clientIp();
  const limit = await rateLimit("passwordReset", `${ip}:${email}`);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(await limiterMessage(retryAfter), retryAfter);
  }

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
        t: resolver(te),
      }),
    );
  }

  return ok(undefined, ta("sentIfExists"));
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const tv = await getTranslations("validation");
  const ta = await getTranslations("auth.resetPassword");
  const tl = await getTranslations("auth.login");

  const parsed = resetPasswordSchema(resolver(tv)).safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { token, password } = parsed.data;

  const ip = await clientIp();
  const limit = await rateLimit("passwordReset", `reset:${ip}`);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(await limiterMessage(retryAfter), retryAfter);
  }

  const lookup = await lookupPasswordResetToken(token);
  if (!lookup.ok) {
    return failTokenInvalid(
      lookup.reason === "expired"
        ? ta("reasonExpired")
        : lookup.reason === "used"
          ? ta("reasonUsed")
          : ta("reasonInvalid"),
    );
  }

  // Consume first: if two submissions race, only one wins the update.
  const consumed = await consumePasswordResetToken(lookup.tokenId);
  if (!consumed) return failTokenInvalid(ta("reasonUsed"));

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

  return ok(undefined, tl("passwordChanged"));
}
