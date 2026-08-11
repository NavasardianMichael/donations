import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";

import { SignUpForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a GiveDirect account and publish your first donation page.",
  robots: { index: false, follow: false },
};

export default async function SignUpPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await props.searchParams;

  return (
    <AuthCard
      subtitle="Create an account to start collecting support."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <SignUpForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
