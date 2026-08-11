import { CheckCircle2, MailQuestion, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { Button, Heading, Text } from "@/components/ui";
import { currentUser } from "@/lib/auth-guards";
import { verifyEmailAction } from "@/server/actions/auth";

import { ResendVerification } from "./resend-verification";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verifyEmail");
  return { title: t("subtitle"), robots: { index: false, follow: false } };
}

/**
 * Two states in one route:
 *   - with `?token=`, consume it and report the outcome;
 *   - without, explain that a link was sent and offer to resend.
 */
export default async function VerifyEmailPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;
  const t = await getTranslations("auth.verifyEmail");
  const user = await currentUser();

  if (!token) {
    return (
      <AuthCard subtitle={t("subtitle")}>
        <div className="space-y-5 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-subtle">
            <MailQuestion className="size-6 text-accent" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <Heading level={2} size="md">
              {t("checkInbox")}
            </Heading>
            <Text variant="muted" size="sm">
              {user
                ? t.rich("sentToAddress", {
                    email: () => (
                      <span className="font-medium text-fg">{user.email}</span>
                    ),
                  })
                : t("sentGeneric")}
            </Text>
          </div>

          {user && !user.emailVerified ? <ResendVerification /> : null}

          <Text variant="faint" size="xs">
            {t("checkSpam")}
          </Text>
        </div>
      </AuthCard>
    );
  }

  const result = await verifyEmailAction(token);

  return (
    <AuthCard subtitle={t("subtitle")}>
      <div className="space-y-5 text-center">
        <span
          className={`mx-auto flex size-12 items-center justify-center rounded-full ${
            result.ok ? "bg-success-subtle" : "bg-danger-subtle"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
          ) : (
            <XCircle className="size-6 text-danger" aria-hidden="true" />
          )}
        </span>

        <div className="space-y-2">
          <Heading level={2} size="md">
            {result.ok ? t("confirmedTitle") : t("failedTitle")}
          </Heading>
          <Text variant="muted" size="sm">
            {result.ok ? t("confirmedBody") : result.message}
          </Text>
        </div>

        {result.ok ? (
          <Button asChild size="lg" fullWidth>
            <Link href={user ? "/dashboard" : "/login?verified=1"}>
              {user ? t("goToDashboard") : t("backToLogin")}
            </Link>
          </Button>
        ) : user && !user.emailVerified ? (
          <ResendVerification />
        ) : (
          <Button asChild size="lg" fullWidth variant="outline">
            <Link href="/login">{t("backToLogin")}</Link>
          </Button>
        )}
      </div>
    </AuthCard>
  );
}
