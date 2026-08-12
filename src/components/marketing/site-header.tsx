import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { HeaderAuthActions } from "@/components/marketing/header-auth-actions";

/**
 * Public header, per the `public_donation_page_tablet` design: wordmark left,
 * nav centre, auth actions right.
 *
 * Nothing here reads cookies — see `HeaderAuthActions` for why that matters.
 * This component stays statically renderable, which is what lets the marketing
 * pages (and, later, the donation pages) be prerendered.
 */
const NAV = [
  { href: "/faq", labelKey: "navFaq" },
  { href: "/contact", labelKey: "navContact" },
  { href: "/donation-terms", labelKey: "navTerms" },
] as const;

export async function SiteHeader() {
  const t = await getTranslations("marketing");

  return (
    <header className="sticky top-0 z-40 border-b border-subtle bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-topbar max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Wordmark size="md" />

        <nav aria-label={t("navFaq")} className="hidden sm:block">
          <ul className="flex items-center gap-6">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-xs text-sm text-muted transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <HeaderAuthActions />
        </div>
      </div>
    </header>
  );
}
