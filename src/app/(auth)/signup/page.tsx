import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";

import { SignUpForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return {
    title: t("submit"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function SignUpPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await props.searchParams;
  const t = await getTranslations("auth.signup");

  return (
    <AuthCard
      subtitle={t("subtitle")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            {t("loginLink")}
          </Link>
        </>
      }
    >
      <SignUpForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
