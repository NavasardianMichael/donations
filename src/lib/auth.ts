import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import type { Adapter } from "next-auth/adapters";

import { fakeVerifyPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validations/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }
}

/**
 * Error codes surfaced back to /login as `?error=`. Auth.js turns a thrown
 * error into a generic code, so anything the UI needs to distinguish is
 * returned as a redirect string from the `signIn` callback instead.
 */
export const AUTH_ERRORS = {
  /** Google sign-in matched an unverified local account. See the guard below. */
  linkBlocked: "OAuthLinkBlocked",
  /** Google returned an unverified email. */
  unverifiedProviderEmail: "OAuthEmailUnverified",
} as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,

  /**
   * JWT, not database sessions. The Credentials provider cannot use the
   * adapter's session table — Auth.js does not persist a session row for it —
   * so JWT is the only strategy that works for both providers at once.
   */
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },

  providers: [
    Google({
      /**
       * Linking by email is allowed, but ONLY because the `signIn` callback
       * below vets it first. Without that guard this flag is an account
       * takeover vector: anyone can register foo@gmail.com with a password,
       * never verify it, and then inherit the real owner's account the moment
       * they sign in with Google.
       */
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { prompt: "consent", access_type: "offline" },
      },
    }),

    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            emailVerified: true,
          },
        });

        // Burn the same time whether or not the account exists, so response
        // latency does not reveal which addresses are registered.
        if (!user?.passwordHash) {
          await fakeVerifyPassword(password);
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Runs BEFORE the adapter creates or links anything, so returning a
     * redirect here aborts the link.
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      // Google tells us whether it has verified the address. If it has not,
      // the email proves nothing and must not be used for matching.
      if (profile?.email_verified === false) {
        return `/login?error=${AUTH_ERRORS.unverifiedProviderEmail}`;
      }

      const email = profile?.email;
      if (!email) return false;

      const existing = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          emailVerified: true,
          passwordHash: true,
          accounts: {
            where: { provider: "google" },
            select: { id: true },
            take: 1,
          },
        },
      });

      // New user, or a user who already has this Google account linked.
      if (!existing || existing.accounts.length > 0) return true;

      // An existing local account with the same address. Linking is only safe
      // when that account has proven control of the address itself; otherwise
      // whoever set the password would inherit this identity.
      if (existing.passwordHash && !existing.emailVerified) {
        return `/login?error=${AUTH_ERRORS.linkBlocked}`;
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // First call after sign-in: copy what the session needs onto the token.
      if (user) {
        token.id = user.id;
        token.emailVerified =
          "emailVerified" in user ? (user.emailVerified ?? null) : null;
      }

      // `update()` from the client — used after email verification so the
      // banner disappears without forcing a re-login.
      if (trigger === "update" && session) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, image: true, emailVerified: true },
        });
        if (fresh) {
          token.name = fresh.name;
          token.picture = fresh.image;
          token.emailVerified = fresh.emailVerified;
        }
      }

      return token;
    },

    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
      return session;
    },
  },

  events: {
    /**
     * A Google account is proof of address control, so a user who signs up
     * that way starts verified.
     */
    async linkAccount({ user, account }) {
      if (account.provider === "google" && user.id) {
        await prisma.user.updateMany({
          where: { id: user.id, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      }
    },
  },

  trustHost: true,
});
