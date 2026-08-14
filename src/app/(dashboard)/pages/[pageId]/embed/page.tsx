import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CodeBlock,
  CopyButton,
} from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { requireUser } from "@/lib/auth-guards";
import { absoluteUrl } from "@/lib/env";
import { escapeHtml } from "@/lib/utils";
import { getOwnedEmbedSettings } from "@/server/queries/pages";

import { EmbedSettings } from "./embed-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pageSettings.embedTab");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Reads the query height and drives the iframe's own height, live. */
function listenerScript(): string {
  return `<script>
window.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "donation-embed-height") return;
  if (typeof event.data.height !== "number" || !isFinite(event.data.height)) return;
  var height = Math.max(0, Math.min(Math.round(event.data.height), 8000));
  var frames = document.querySelectorAll('iframe[data-${BRAND.cssPrefix}-embed]');
  for (var i = 0; i < frames.length; i++) {
    if (frames[i].contentWindow === event.source) {
      frames[i].style.height = height + "px";
    }
  }
});
</script>`;
}

export default async function PageEmbedPage(props: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await props.params;
  const user = await requireUser();
  const t = await getTranslations("pageSettings.embedTab");

  const page = await getOwnedEmbedSettings(user.id, pageId);
  if (!page) notFound();

  const embedUrl = absoluteUrl(`/embed/${page.slug}`);
  const snippet = `<iframe
  data-${BRAND.cssPrefix}-embed
  src="${embedUrl}"
  width="100%"
  height="480"
  style="border:0;max-width:420px;"
  loading="lazy"
  title="${escapeHtml(page.title)}"
></iframe>
${listenerScript()}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader bordered>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 py-5">
          <p className="text-sm text-muted">{t("subtitle")}</p>
          <EmbedSettings
            pageId={page.id}
            embedEnabled={page.embedEnabled}
            embedAllowAnyOrigin={page.embedAllowAnyOrigin}
            embedAllowedOrigins={page.embedAllowedOrigins}
          />
        </CardContent>
      </Card>

      {!page.embedEnabled ? (
        <Alert variant="warning" title={t("disabledTitle")}>
          {t("disabledBody")}
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader bordered className="items-center justify-between">
              <CardTitle>{t("snippetTitle")}</CardTitle>
              <CopyButton value={snippet} variant="outline" size="sm" />
            </CardHeader>
            <CardContent className="py-4">
              <CodeBlock>{snippet}</CodeBlock>
            </CardContent>
          </Card>

          <Card>
            <CardHeader bordered>
              <CardTitle>{t("previewTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center bg-surface-sunken py-6">
              <iframe
                src={embedUrl}
                width="100%"
                height="498"
                style={{ border: 0, maxWidth: "100%" }}
                loading="lazy"
                title={page.title}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
