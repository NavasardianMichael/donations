"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  useCallback,
  type ChangeEventHandler,
  type MouseEventHandler,
  type SubmitEventHandler,
} from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";

import { Alert, Button, Field, Input, Text } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { slugify } from "@/lib/utils";
import { createPageSchema, type CreatePageInput } from "@/lib/validations/page";
import { resolver } from "@/lib/validations/resolver";
import { checkSlugAction, createPageAction } from "@/server/actions/pages";

import { SLUG_MAX, SLUG_MIN } from "@/lib/validations/slug";

/** The server's verdict for one specific slug value. */
interface SlugVerdict {
  slug: string;
  available: boolean;
}

/**
 * Title → auto-slug → availability check.
 *
 * The slug mirrors the title until the field is edited directly, after which
 * it is left alone — otherwise fixing a typo in the title would silently
 * overwrite a hand-picked address. That "has it been edited" flag is state set
 * from an event handler, not a ref read during render.
 *
 * The availability status is DERIVED during render from the verdict the server
 * last returned. The effect's only job is to fire the debounced request and
 * store the answer, so nothing calls setState synchronously while rendering.
 *
 * Availability is advisory either way: `createPageAction` re-checks, because
 * another tab can take the slug between this probe and submit.
 */
export function CreatePageForm() {
  const t = useTranslations("pages");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<SlugVerdict | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const schema = useMemo(() => createPageSchema(resolver(tv)), [tv]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreatePageInput>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", slug: "" },
  });

  const slug = useWatch({ control, name: "slug" }) ?? "";

  useEffect(() => {
    if (slug.length < SLUG_MIN) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkSlugAction(slug);
      if (cancelled) return;
      setVerdict({
        slug,
        available: result.ok ? result.data.available : false,
      });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  // Derived, not stored — so it can never disagree with the current input.
  const slugStatus: "idle" | "short" | "checking" | "available" | "taken" =
    slug.length === 0
      ? "idle"
      : slug.length < SLUG_MIN
        ? "short"
        : verdict?.slug === slug
          ? verdict.available
            ? "available"
            : "taken"
          : "checking";

  const onTitleChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> =
    useCallback(
      (event) => {
        if (slugEdited) return;
        setValue("slug", slugify(event.target.value));
      },
      [setValue, slugEdited],
    );

  const onSlugChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> =
    useCallback(() => {
      setSlugEdited(true);
    }, []);

  const onCancel: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    router.push("/pages");
  }, [router]);

  const onSubmit: SubmitHandler<CreatePageInput> = useCallback(
    (values) => {
      setFormError(null);

      startTransition(async () => {
        const result = await createPageAction(values);

        if (!result.ok) {
          if (result.fieldErrors) {
            for (const [name, message] of Object.entries(result.fieldErrors)) {
              setError(name as keyof CreatePageInput, { message });
            }
          }
          setFormError(result.message);
          return;
        }

        router.replace(`/pages/${result.data.id}/settings`);
        router.refresh();
      });
    },
    [router, setError],
  );

  const onFormSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      void handleSubmit(onSubmit)(event);
    },
    [handleSubmit, onSubmit],
  );

  return (
    <form onSubmit={onFormSubmit} noValidate className="space-y-5">
      {formError ? (
        <Alert variant="danger" icon={false}>
          {formError}
        </Alert>
      ) : null}

      <Field
        label={t("titleLabel")}
        description={t("titleHint")}
        error={errors.title?.message}
        required
      >
        <Input
          autoFocus
          autoComplete="off"
          maxLength={120}
          placeholder={t("titlePlaceholder")}
          {...register("title", {
            onChange: onTitleChange,
          })}
        />
      </Field>

      <Field
        label={t("slugLabel")}
        error={errors.slug?.message}
        description={t("slugHint")}
        hint={<SlugStatus status={slugStatus} />}
        required
      >
        <Input
          autoComplete="off"
          spellCheck={false}
          maxLength={SLUG_MAX}
          placeholder="makur-jur"
          leading={
            <span className="text-xs whitespace-nowrap">{BRAND.domain}/d/</span>
          }
          className="pl-22"
          {...register("slug", {
            onChange: onSlugChange,
          })}
        />
      </Field>

      <Text size="xs" variant="faint">
        {t("createDraftNote")}
      </Text>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          loading={pending}
          disabled={slugStatus === "taken" || slugStatus === "checking"}
        >
          {t("createSubmit")}
        </Button>
      </div>
    </form>
  );
}

function SlugStatus({
  status,
}: {
  status: "idle" | "short" | "checking" | "available" | "taken";
}) {
  const t = useTranslations("pages");

  if (status === "idle" || status === "short") return null;

  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        {t("slugChecking")}
      </span>
    );
  }

  const available = status === "available";

  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1 ${available ? "text-success" : "text-danger"
        }`}
    >
      {available ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <X className="size-3.5" aria-hidden="true" />
      )}
      {available ? t("slugAvailable") : t("slugTaken")}
    </span>
  );
}
