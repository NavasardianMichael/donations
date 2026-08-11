import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui";
import { AUTH_ERRORS } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to manage your GiveDirect pages.",
  robots: { index: false, follow: false },
};

/**
 * Auth.js redirects failures back here with `?error=`. Anything not listed
 * falls through to a generic message — never echo the raw code at the user.
 */
const ERROR_MESSAGES: Record<string, string> = {
  [AUTH_ERRORS.linkBlocked]:
    "An account with this email already exists and has not been confirmed. Log in with your password, or confirm your email first, then connect Google.",
  [AUTH_ERRORS.unverifiedProviderEmail]:
    "Google has not verified that email address, so we cannot use it to sign in.",
  OAuthAccountNotLinked:
    "That email is already registered with a different sign-in method. Use the method you signed up with.",
  AccessDenied: "Sign-in was cancelled or denied.",
  Verification: "That link is no longer valid. Request a new one.",
};

export default async function LoginPage(props: {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
    reset?: string;
    verified?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const errorMessage = searchParams.error
    ? (ERROR_MESSAGES[searchParams.error] ??
      "Something went wrong signing you in. Try again.")
    : null;

  const noticeMessage = searchParams.reset
    ? "Your password has been changed. Log in with your new password."
    : searchParams.verified
      ? "Your email is confirmed. Log in to continue."
      : null;

  return (
    <AuthCard
      subtitle="Log in to manage your impact."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-brand hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      {errorMessage ? (
        <Alert variant="danger" className="mb-5">
          {errorMessage}
        </Alert>
      ) : null}

      {noticeMessage ? (
        <Alert variant="success" className="mb-5">
          {noticeMessage}
        </Alert>
      ) : null}

      <LoginForm callbackUrl={searchParams.callbackUrl} />
    </AuthCard>
  );
}
