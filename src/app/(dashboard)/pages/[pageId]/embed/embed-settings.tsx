"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useState,
  useTransition,
  type ComponentProps,
} from "react";

import {
  Field,
  Switch,
  TagInput,
  toast,
  type TagInputProps,
} from "@/components/ui";
import { parseOrigin } from "@/lib/embed-origins";
import { updatePageEmbedAction } from "@/server/actions/pages";

const ORIGINS_MAX = 25;

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
  const [originError, setOriginError] = useState<string | null>(null);

  const save = useCallback(
    (next: {
      embedEnabled?: boolean;
      embedAllowAnyOrigin?: boolean;
      embedAllowedOrigins?: string[];
    }) => {
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
          setOriginError(null);
          router.refresh();
        } else {
          setOriginError(result.fieldErrors?.embedAllowedOrigins ?? null);
          toast.error(result.message);
        }
      });
    },
    [allowAny, embedEnabled, origins, pageId, router],
  );

  const onEmbedEnabledChange: NonNullable<
    ComponentProps<typeof Switch>["onCheckedChange"]
  > = useCallback(
    (checked) => {
      save({ embedEnabled: checked });
    },
    [save],
  );

  const onAllowAnyChange: NonNullable<
    ComponentProps<typeof Switch>["onCheckedChange"]
  > = useCallback(
    (checked) => {
      setAllowAny(checked);
      save({ embedAllowAnyOrigin: checked });
    },
    [save],
  );

  const parseOriginTag: NonNullable<TagInputProps["parseValue"]> = useCallback(
    (raw) => {
      if (origins.length >= ORIGINS_MAX) return null;
      return parseOrigin(raw);
    },
    [origins.length],
  );

  const onOriginInvalid: NonNullable<TagInputProps["onInvalid"]> =
    useCallback(() => {
      setOriginError(
        origins.length >= ORIGINS_MAX ? t("originsMax") : t("originInvalid"),
      );
    }, [origins.length, t]);

  const removeOriginLabel: TagInputProps["removeLabel"] = useCallback(
    (tag) => t("removeOrigin", { tag }),
    [t],
  );

  const onOriginsChange: TagInputProps["onChange"] = useCallback(
    (next) => {
      setOriginError(null);
      setOrigins(next);
      save({ embedAllowedOrigins: next });
    },
    [save],
  );

  return (
    <div className="space-y-5">
      <Field orientation="horizontal" label={t("enableToggle")}>
        <Switch
          checked={embedEnabled}
          disabled={pending}
          onCheckedChange={onEmbedEnabledChange}
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
              onCheckedChange={onAllowAnyChange}
            />
          </Field>

          {allowAny ? null : (
            <Field
              label={t("allowedOrigins")}
              description={t("allowedOriginsHint")}
              error={originError}
            >
              <TagInput
                value={origins}
                disabled={pending}
                placeholder={t("allowedOriginsPlaceholder")}
                parseValue={parseOriginTag}
                onInvalid={onOriginInvalid}
                removeLabel={removeOriginLabel}
                onChange={onOriginsChange}
              />
            </Field>
          )}
        </>
      ) : null}
    </div>
  );
}
