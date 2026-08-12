import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { copyrightLine } from "@/lib/brand";

/** Public footer, matching `public_donation_page_mobile`. */
export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-subtle bg-surface">
      <div className="flex flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-10">
        <div className="space-y-1">
          <Wordmark size="sm" />
          <p className="text-xs text-muted">{t("tagline")}</p>
        </div>

        <nav aria-label={t("faq")}>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            {(
              [
                ["faq", "/faq"],
                ["contact", "/contact"],
                ["donationTerms", "/donation-terms"],
                ["privacy", "/privacy"],
                ["terms", "/terms"],
              ] as const
            ).map(([key, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-muted hover:text-brand hover:underline"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-xs text-muted">{copyrightLine()}</p>
      </div>
    </footer>
  );
}
