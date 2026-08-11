/**
 * Integration tests for the auth Server Actions.
 *
 * These run against a REAL database — start it with `docker compose up -d`
 * and apply migrations first. They are excluded from the default `pnpm test`
 * run; use `pnpm test:db`.
 *
 * Three things are mocked, because they only exist inside a request:
 *   - `next/headers`, for the rate limiter's client IP;
 *   - `next-intl/server`, backed by the REAL message catalogue, so a missing
 *     translation key fails the test instead of rendering a placeholder;
 *   - `@/lib/email`, so the test can read the token out of the message that
 *     would have been sent.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/hy.json";

const sentEmails: { to: string; subject: string; text: string }[] = [];

/**
 * A translator over the real catalogue.
 *
 * Deliberately throws on a missing key. In the app a typo degrades to a
 * warning; in a test it should be a hard failure, which makes these tests
 * double as a check that every key the actions reference actually exists.
 */
function lookup(path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      messages,
    );

  if (typeof value !== "string") {
    throw new Error(`Missing translation key: ${path}`);
  }
  return value;
}

function makeTranslator(namespace: string) {
  const t = (key: string, values?: Record<string, string | number>) => {
    let out = lookup(`${namespace}.${key}`);
    for (const [name, value] of Object.entries(values ?? {})) {
      out = out.replaceAll(`{${name}}`, String(value));
    }
    return out;
  };
  return t;
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => makeTranslator(namespace),
}));

/**
 * The rate limiter keys on client IP and its in-memory buckets live for the
 * whole process. Tests therefore each get their own IP, so one test's attempts
 * cannot throttle the next. `currentIp` is pinned deliberately in the
 * rate-limiting test below.
 */
let currentIp = "203.0.113.1";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": currentIp }),
}));

/**
 * Auth.js's internals only resolve inside the Next bundler. None of the
 * actions under test here call into it — `signInAction` does, and it is
 * covered by the HTTP smoke test instead.
 */
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  default: () => ({}),
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => null,
  signIn: async () => undefined,
  signOut: async () => undefined,
  handlers: {},
  AUTH_ERRORS: {
    linkBlocked: "OAuthLinkBlocked",
    unverifiedProviderEmail: "OAuthEmailUnverified",
  },
}));

vi.mock("@/lib/email", async () => {
  const templates = await import("@/lib/email/templates");
  return {
    ...templates,
    sendEmail: async (
      to: string,
      content: { subject: string; text: string },
    ) => {
      sentEmails.push({ to, subject: content.subject, text: content.text });
      return { sent: true };
    },
  };
});

const { prisma } = await import("@/lib/prisma");
const {
  requestPasswordResetAction,
  resetPasswordAction,
  signUpAction,
  verifyEmailAction,
} = await import("./auth");
const { verifyPassword } = await import("@/lib/password");

const EMAIL = "integration-test@givedirect.test";

/** Pull the token out of the link in the email body. */
function tokenFromLastEmail(): string {
  const last = sentEmails.at(-1);
  if (!last) throw new Error("No email was sent");
  const match = last.text.match(/[?&]token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`No token in email:\n${last.text}`);
  return match[1]!;
}

let ipCounter = 0;

async function reset() {
  sentEmails.length = 0;
  currentIp = `203.0.113.${++ipCounter}`;
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.verificationToken.deleteMany({ where: { identifier: EMAIL } });
}

beforeEach(reset);
afterAll(async () => {
  await reset();
  await prisma.$disconnect();
});

describe("signUpAction", () => {
  it("creates an unverified user and emails a confirmation link", async () => {
    const result = await signUpAction({
      name: "Integration Test",
      email: EMAIL,
      password: "CorrectHorse9Battery",
      website: "",
    });

    expect(result.ok).toBe(true);

    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(user).not.toBeNull();
    expect(user!.emailVerified).toBeNull();
    expect(user!.passwordHash).toBeTruthy();

    // The plaintext password must never be recoverable from the row.
    expect(user!.passwordHash).not.toContain("CorrectHorse9Battery");
    expect(
      await verifyPassword("CorrectHorse9Battery", user!.passwordHash!),
    ).toBe(true);

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]!.to).toBe(EMAIL);
  });

  it("rejects a weak password without creating anything", async () => {
    const result = await signUpAction({
      name: "Integration Test",
      email: EMAIL,
      password: "short",
      website: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.password).toBeTruthy();
    expect(await prisma.user.count({ where: { email: EMAIL } })).toBe(0);
  });

  it("silently no-ops when the honeypot is filled", async () => {
    const result = await signUpAction({
      name: "Spam Bot",
      email: EMAIL,
      password: "CorrectHorse9Battery",
      website: "http://spam.example",
    });

    // Looks like success to the bot, but nothing was written or sent.
    expect(result.ok).toBe(true);
    expect(await prisma.user.count({ where: { email: EMAIL } })).toBe(0);
    expect(sentEmails).toHaveLength(0);
  });

  it("does not reveal that an address is already registered", async () => {
    await signUpAction({
      name: "Integration Test",
      email: EMAIL,
      password: "CorrectHorse9Battery",
      website: "",
    });
    sentEmails.length = 0;

    const second = await signUpAction({
      name: "Someone Else",
      email: EMAIL,
      password: "DifferentPassword7Here",
      website: "",
    });

    // Same success shape as a fresh signup — no "already registered" tell.
    expect(second.ok).toBe(true);

    // And the existing account is untouched.
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(user!.name).toBe("Integration Test");
    expect(
      await verifyPassword("DifferentPassword7Here", user!.passwordHash!),
    ).toBe(false);
  });
});

describe("rate limiting", () => {
  it("cuts off repeated signups from one IP", async () => {
    currentIp = "198.51.100.77"; // pinned: the whole point is to reuse it

    const attempt = (n: number) =>
      signUpAction({
        name: "Flooder",
        email: `flood-${n}@givedirect.test`,
        password: "CorrectHorse9Battery",
        website: "",
      });

    // The signup rule allows 5 per 10 minutes.
    const results = [];
    for (let n = 0; n < 7; n++) results.push(await attempt(n));

    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]!.ok).toBe(false);
    expect(results[6]!.ok).toBe(false);
    if (!results[5]!.ok) expect(results[5]!.retryAfter).toBeGreaterThan(0);

    // The blocked attempts created nothing.
    expect(
      await prisma.user.count({
        where: {
          email: { in: ["flood-5@givedirect.test", "flood-6@givedirect.test"] },
        },
      }),
    ).toBe(0);

    await prisma.user.deleteMany({
      where: { email: { startsWith: "flood-" } },
    });
  });
});

describe("verifyEmailAction", () => {
  it("marks the address verified and burns the token", async () => {
    await signUpAction({
      name: "Integration Test",
      email: EMAIL,
      password: "CorrectHorse9Battery",
      website: "",
    });

    const token = tokenFromLastEmail();
    const result = await verifyEmailAction(token);
    expect(result.ok).toBe(true);

    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(user!.emailVerified).toBeInstanceOf(Date);

    // Replaying the same link must fail.
    expect((await verifyEmailAction(token)).ok).toBe(false);
  });

  it("rejects a token that was never issued", async () => {
    expect((await verifyEmailAction("not-a-real-token")).ok).toBe(false);
  });

  it("stores only a hash, never the raw token", async () => {
    await signUpAction({
      name: "Integration Test",
      email: EMAIL,
      password: "CorrectHorse9Battery",
      website: "",
    });

    const token = tokenFromLastEmail();
    const rows = await prisma.verificationToken.findMany({
      where: { identifier: EMAIL },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.token).not.toBe(token);
    expect(rows[0]!.token).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("password reset", () => {
  async function signUpAndVerify() {
    await signUpAction({
      name: "Integration Test",
      email: EMAIL,
      password: "CorrectHorse9Battery",
      website: "",
    });
    await verifyEmailAction(tokenFromLastEmail());
    sentEmails.length = 0;
  }

  it("changes the password and invalidates the link", async () => {
    await signUpAndVerify();

    const requested = await requestPasswordResetAction({ email: EMAIL });
    expect(requested.ok).toBe(true);

    const token = tokenFromLastEmail();
    const reset = await resetPasswordAction({
      token,
      password: "BrandNewPassword4You",
      confirmPassword: "BrandNewPassword4You",
    });
    expect(reset.ok).toBe(true);

    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(
      await verifyPassword("BrandNewPassword4You", user!.passwordHash!),
    ).toBe(true);
    expect(
      await verifyPassword("CorrectHorse9Battery", user!.passwordHash!),
    ).toBe(false);

    // Single use.
    const replay = await resetPasswordAction({
      token,
      password: "YetAnotherPassword5",
      confirmPassword: "YetAnotherPassword5",
    });
    expect(replay.ok).toBe(false);
  });

  it("returns the same message for an address that does not exist", async () => {
    const known = await requestPasswordResetAction({ email: EMAIL });
    const unknown = await requestPasswordResetAction({
      email: "nobody-at-all@givedirect.test",
    });

    expect(known.ok).toBe(true);
    expect(unknown.ok).toBe(true);
    if (known.ok && unknown.ok) {
      expect(known.message).toBe(unknown.message);
    }
    // Nothing was sent for the unknown address.
    expect(sentEmails).toHaveLength(0);
  });

  it("rejects mismatched confirmation", async () => {
    await signUpAndVerify();
    await requestPasswordResetAction({ email: EMAIL });

    const result = await resetPasswordAction({
      token: tokenFromLastEmail(),
      password: "BrandNewPassword4You",
      confirmPassword: "DoesNotMatch9Here",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.confirmPassword).toBeTruthy();
  });
});
