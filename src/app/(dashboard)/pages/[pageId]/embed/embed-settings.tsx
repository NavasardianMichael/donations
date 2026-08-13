"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Field, Switch, TagInput, toast } from "@/components/ui";
import { parseOrigin } from "@/lib/embed-origins";
import { updatePageEmbedAction } from "@/server/actions/pages";

export function EmbedSettings({
  pageId,
  embedEnabled,
  embedAllowAnyOrigin,
  embedAllowedOrigins,
}: {
  pageId: string;
  embedEnabled: boolean;
  embedAllowAnyOrigin: boolean;
  embedAllowedOrigins: string[];
}) {
  const t = useTranslations("pageSettings.embedTab");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [allowAny, setAllowAny] = useState(embedAllowAnyOrigin);
  const [origins, setOrigins] = useState(embedAllowedOrigins);

  function save(next: {
    embedEnabled?: boolean;
    embedAllowAnyOrigin?: boolean;
    embedAllowedOrigins?: string[];
  }) {
    const embedEnabledNext = next.embedEnabled ?? embedEnabled;
    const allowAnyNext = next.embedAllowAnyOrigin ?? allowAny;
    const originsNext = next.embedAllowedOrigins ?? origins;

    startTransition(async () => {
      const result = await updatePageEmbedAction({
        id: pageId,
        embedEnabled: embedEnabledNext,
        embedAllowAnyOrigin: allowAnyNext,
        embedAllowedOrigins: originsNext,
      });
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <Field orientation="horizontal" label={t("enableToggle")}>
        <Switch
          checked={embedEnabled}
          disabled={pending}
          onCheckedChange={(checked) => save({ embedEnabled: checked })}
        />
      </Field>

      {embedEnabled ? (
        <>
          <Field
            orientation="horizontal"
            label={t("allowAnyOrigin")}
            description={t("allowAnyOriginHint")}
          >
            <Switch
              checked={allowAny}
              disabled={pending}
              onCheckedChange={(checked) => {
                setAllowAny(checked);
                save({ embedAllowAnyOrigin: checked });
              }}
            />
          </Field>

          {allowAny ? null : (
            <Field
              label={t("allowedOrigins")}
              description={t("allowedOriginsHint")}
            >
              <TagInput
                value={origins}
                disabled={pending}
                placeholder={t("allowedOriginsPlaceholder")}
                parseValue={parseOrigin}
                onInvalid={() => toast.error(t("originInvalid"))}
                removeLabel={(tag) => t("removeOrigin", { tag })}
                onChange={(next) => {
                  setOrigins(next);
                  save({ embedAllowedOrigins: next });
                }}
              />
            </Field>
          )}
        </>
      ) : null}
    </div>
  );
}
