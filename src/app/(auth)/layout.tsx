import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { copyrightLine } from "@/lib/brand";

/**
 * Centred card, no app chrome. Matches the Stitch auth screens: the card is
 * the only thing on a neutral canvas, with a copyright line beneath it.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("footer");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <main className="w-full max-w-md">{children}</main>

      <footer className="mt-6 text-center text-xs text-muted">
        <p>{copyrightLine()}</p>
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/faq" className="hover:text-brand hover:underline">
            {t("faq")}
          </Link>
          <Link href="/contact" className="hover:text-brand hover:underline">
            {t("contact")}
          </Link>
          <Link
            href="/donation-terms"
            className="hover:text-brand hover:underline"
          >
            {t("donationTerms")}
          </Link>
        </p>
      </footer>
    </div>
  );
}
