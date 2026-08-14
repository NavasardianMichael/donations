"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { HeaderUserMenu } from "@/components/marketing/header-user-menu";
import { Button, Skeleton } from "@/components/ui";

/**
 * The auth corner of the public header.
 *
 * Deliberately a Client Component reading the session over the wire, rather
 * than a server-side `currentUser()`.
 *
 * Reading cookies on the server would opt the whole route out of static
 * rendering — and because the root `not-found.tsx` renders this header, it
 * would do that for EVERY route in the app, including the public donation
 * pages that need to be statically generated and served from cache.
 *
 * The cost is a brief skeleton while the session resolves. That is the right
 * trade for pages whose main audience is anonymous donors, who will only ever
 * see "log in / sign up" anyway.
 */
export function HeaderAuthActions() {
  const t = useTranslations("marketing");
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Skeleton className="h-8 w-32 rounded-full" />;
  }

  if (status === "authenticated") {
    return <HeaderUserMenu user={session.user} />;
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">{t("logIn")}</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/signup">{t("signUp")}</Link>
      </Button>
    </>
  );
}
