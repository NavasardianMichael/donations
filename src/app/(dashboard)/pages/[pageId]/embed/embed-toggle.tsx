"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Field, Switch, toast } from "@/components/ui";
import { updatePageEmbedAction } from "@/server/actions/pages";

export function EmbedToggle({
  pageId,
  embedEnabled,
}: {
  pageId: string;
  embedEnabled: boolean;
}) {
  const t = useTranslations("pageSettings.embedTab");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Field orientation="horizontal" label={t("enableToggle")}>
      <Switch
        checked={embedEnabled}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            const result = await updatePageEmbedAction({
              id: pageId,
              embedEnabled: checked,
            });
            if (result.ok) {
              router.refresh();
            } else {
              toast.error(result.message);
            }
          })
        }
      />
    </Field>
  );
}
