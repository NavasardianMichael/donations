import { CheckCircle2, MailQuestion, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Button, Heading, Text } from "@/components/ui";
import { currentUser } from "@/lib/auth-guards";
import { verifyEmailAction } from "@/server/actions/auth";

import { ResendVerification } from "./resend-verification";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

/**
 * Two states in one route:
 *   - with `?token=`, consume it and report the outcome;
 *   - without, explain that a link was sent and offer to resend.
 */
export default async function VerifyEmailPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;
  const user = await currentUser();

  if (!token) {
    return (
      <AuthCard subtitle="Confirm your email address.">
        <div className="space-y-5 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-subtle">
            <MailQuestion className="size-6 text-accent" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <Heading level={2} size="md">
              Check your inbox
            </Heading>
            <Text variant="muted" size="sm">
              {user
                ? `We sent a confirmation link to ${user.email}. Click it to finish setting up your account.`
                : "We sent you a confirmation link. Click it to finish setting up your account."}
            </Text>
          </div>

          {user && !user.emailVerified ? <ResendVerification /> : null}

          <Text variant="faint" size="xs">
            Nothing after a minute or two? Check your spam folder.
          </Text>
        </div>
      </AuthCard>
    );
  }

  const result = await verifyEmailAction(token);

  return (
    <AuthCard subtitle="Confirm your email address.">
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
            {result.ok ? "Email confirmed" : "We could not confirm that"}
          </Heading>
          <Text variant="muted" size="sm">
            {result.ok
              ? "Your address is verified. You can sign in and publish pages."
              : result.message}
          </Text>
        </div>

        {result.ok ? (
          <Button asChild size="lg" fullWidth>
            <Link href={user ? "/dashboard" : "/login"}>
              {user ? "Go to dashboard" : "Log in"}
            </Link>
          </Button>
        ) : user && !user.emailVerified ? (
          <ResendVerification />
        ) : (
          <Button asChild size="lg" fullWidth variant="outline">
            <Link href="/login">Back to log in</Link>
          </Button>
        )}
      </div>
    </AuthCard>
  );
}
