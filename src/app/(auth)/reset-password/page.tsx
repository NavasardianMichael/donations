import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Alert, Button } from "@/components/ui";
import { lookupPasswordResetToken } from "@/lib/tokens";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

const REASONS: Record<string, string> = {
  invalid: "That link is not valid. It may have been mistyped or already used.",
  expired: "That link has expired. Reset links are valid for one hour.",
  used: "That link has already been used.",
};

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;

  // Validate before rendering the form, so a dead link says so immediately
  // rather than after the user has typed a new password twice. The token is
  // NOT consumed here — only the submit action burns it.
  const lookup = token
    ? await lookupPasswordResetToken(token)
    : ({ ok: false, reason: "invalid" } as const);

  if (!lookup.ok) {
    return (
      <AuthCard subtitle="Choose a new password.">
        <div className="space-y-4">
          <Alert variant="warning" title="This link is no longer valid">
            {REASONS[lookup.reason]}
          </Alert>
          <Button asChild size="lg" fullWidth>
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard subtitle="Choose a new password.">
      <ResetPasswordForm token={token!} />
    </AuthCard>
  );
}
