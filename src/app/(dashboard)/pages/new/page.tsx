import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import { Card, CardContent, Heading, Lead } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";

import { CreatePageForm } from "./create-page-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  return { title: t("createTitle"), robots: { index: false, follow: false } };
}

export default async function NewPagePage() {
  await requireUser();
  const t = await getTranslations("pages");

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <header>
        <Heading level={1} size="display">
          {t("createTitle")}
        </Heading>
        <Lead className="mt-1">{t("createDescription")}</Lead>
      </header>

      <Card>
        <CardContent className="py-6">
          <CreatePageForm />
        </CardContent>
      </Card>
    </div>
  );
}
