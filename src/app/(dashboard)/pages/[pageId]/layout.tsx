import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PageTabNav } from "@/components/dashboard/page-tab-nav";
import { requireUser } from "@/lib/auth-guards";
import { getOwnedPage } from "@/server/queries/pages";

/**
 * Per-page nav: Editor / Settings / Embed / Donations / Analytics, all
 * scoped under one ownership check so a mistyped id 404s once here instead
 * of in each tab.
 */
export default async function PageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const user = await requireUser();

  const page = await getOwnedPage(user.id, pageId);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-form px-4 pt-6 sm:px-6 lg:px-10">
      <PageTabNav pageId={page.id} title={page.title} />
      <div className="pb-8">{children}</div>
    </div>
  );
}

export async function generateMetadata() {
  const t = await getTranslations("pageSettings");
  return { title: t("editorTitle") };
}
