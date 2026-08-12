import { getTranslations } from "next-intl/server";

import { Skeleton, SkeletonText } from "@/components/ui";

export default async function DashboardLoading() {
  const t = await getTranslations("a11y");

  return (
    <div
      className="space-y-6 px-4 py-8 sm:px-6 lg:px-10"
      role="status"
      aria-live="polite"
      aria-label={t("loading")}
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <SkeletonText lines={4} />
    </div>
  );
}
