import { getTranslations } from "next-intl/server";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Public, indexable pages: header, content, footer.
 *
 * Distinct from the dashboard shell (no sidebar, no auth gate) and from the
 * embed layout (which has no chrome at all).
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("marketing");

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* First tab stop, for keyboard and screen-reader users. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>

      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
