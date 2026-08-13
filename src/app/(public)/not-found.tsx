import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Button, Heading, Lead } from "@/components/ui";

/**
 * 404 inside the public donation tree.
 *
 * The root `not-found.tsx` ships the marketing header (dashboard button, nav)
 * and footer. That chrome is wrong here: this layout already has a wordmark
 * and a one-line copyright, and a donor who mistyped a slug should not be
 * dropped into the product shell. Nested `not-found` is rendered *inside*
 * `(public)/layout.tsx`, so we only supply the message.
 */
export default async function PublicNotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-wider text-accent uppercase">
          404
        </p>
        <Heading level={1} size="display" className="mt-3">
          {t("notFoundTitle")}
        </Heading>
        <Lead className="mt-3">{t("notFoundBody")}</Lead>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">{t("goHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
