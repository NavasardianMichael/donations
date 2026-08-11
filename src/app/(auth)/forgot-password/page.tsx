import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";

import { ForgotPasswordForm } from "./forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return {
    title: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgotPassword");

  return (
    <AuthCard
      subtitle={t("subtitle")}
      footer={
        <>
          {t("remembered")}{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            {t("loginLink")}
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
