import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui";
import { AUTH_ERRORS } from "@/lib/auth";

import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return {
    title: t("submit"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage(props: {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
    reset?: string;
    verified?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const t = await getTranslations("auth");

  /**
   * Auth.js redirects failures back here with `?error=`. Anything not listed
   * falls through to a generic message — never echo the raw code at the user.
   */
  const errorMessages: Record<string, string> = {
    [AUTH_ERRORS.linkBlocked]: t("errors.linkBlocked"),
    [AUTH_ERRORS.unverifiedProviderEmail]: t("errors.unverifiedProviderEmail"),
    OAuthAccountNotLinked: t("errors.accountNotLinked"),
    AccessDenied: t("errors.accessDenied"),
    Verification: t("errors.verification"),
  };

  const errorMessage = searchParams.error
    ? (errorMessages[searchParams.error] ?? t("errors.generic"))
    : null;

  const noticeMessage = searchParams.reset
    ? t("login.passwordChanged")
    : searchParams.verified
      ? t("login.emailConfirmed")
      : null;

  return (
    <AuthCard
      subtitle={t("login.subtitle")}
      footer={
        <>
          {t("login.noAccount")}{" "}
          <Link
            href="/signup"
            className="font-semibold text-brand hover:underline"
          >
            {t("login.signUpLink")}
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
