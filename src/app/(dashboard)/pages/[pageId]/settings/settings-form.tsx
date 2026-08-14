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
  type ComponentProps,
  type MouseEventHandler,
  type SubmitEventHandler,
} from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Heading,
  Input,
  Switch,
  TagInput,
  Text,
  Textarea,
  toast,
  type TagInputProps,
} from "@/components/ui";
import { BRAND } from "@/lib/brand";
import {
  updatePageSeoSchema,
  type UpdatePageSeoInput,
} from "@/lib/validations/page";
import { resolver } from "@/lib/validations/resolver";
import { SLUG_MAX, SLUG_MIN } from "@/lib/validations/slug";
import { checkSlugAction, updatePageSeoAction } from "@/server/actions/pages";

/** Search engines truncate around these lengths; the counter warns past them. */
const TITLE_IDEAL = 60;
const DESCRIPTION_IDEAL = 160;

export function PageSettingsForm({
  page,
}: {
  page: {
    id: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    ogImageUrl: string | null;
    noIndex: boolean;
    title: string;
    description: string | null;
  };
}) {
  const t = useTranslations("pageSettings");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => updatePageSeoSchema(resolver(tv)), [tv]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<UpdatePageSeoInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: page.id,
      slug: page.slug,
      seoTitle: page.seoTitle ?? "",
      seoDescription: page.seoDescription ?? "",
      seoKeywords: page.seoKeywords ?? "",
      ogImageUrl: page.ogImageUrl ?? "",
      noIndex: page.noIndex,
    },
  });

  const slug = useWatch({ control, name: "slug" }) ?? "";
  const seoTitle = useWatch({ control, name: "seoTitle" }) ?? "";
  const seoDescription = useWatch({ control, name: "seoDescription" }) ?? "";
  const seoKeywords = useWatch({ control, name: "seoKeywords" }) ?? "";
  const noIndex = useWatch({ control, name: "noIndex" });

  const [verdict, setVerdict] = useState<{
    slug: string;
    available: boolean;
  } | null>(null);

  useEffect(() => {
    if (slug.length < SLUG_MIN) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkSlugAction(slug, page.id);
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
  }, [slug, page.id]);

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

  const keywordTags = seoKeywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const removeKeywordLabel: TagInputProps["removeLabel"] = useCallback(
    (tag) => t("removeKeyword", { tag }),
    [t],
  );

  const onKeywordsChange: TagInputProps["onChange"] = useCallback(
    (tags) => {
      setValue("seoKeywords", tags.join(", "), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const onNoIndexChange: NonNullable<
    ComponentProps<typeof Switch>["onCheckedChange"]
  > = useCallback(
    (checked) => {
      setValue("noIndex", checked, { shouldDirty: true });
    },
    [setValue],
  );

  const onCancel: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    router.push("/pages");
  }, [router]);

  const onSubmit: SubmitHandler<UpdatePageSeoInput> = useCallback(
    (values) => {
      setFormError(null);

      startTransition(async () => {
        const result = await updatePageSeoAction(values);

        if (!result.ok) {
          if (result.fieldErrors) {
            for (const [name, message] of Object.entries(result.fieldErrors)) {
              setError(name as keyof UpdatePageSeoInput, { message });
            }
          }
          setFormError(result.message);
          return;
        }

        toast.success(tc("saved"));
        // The slug may have changed, so the URL this page was reached by is
        // stale for the public preview — refresh the server data.
        router.refresh();
      });
    },
    [router, setError, tc],
  );

  const onFormSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      void handleSubmit(onSubmit)(event);
    },
    [handleSubmit, onSubmit],
  );

  return (
    <form onSubmit={onFormSubmit} noValidate className="space-y-8">
      {formError ? <Alert variant="danger">{formError}</Alert> : null}

      <input type="hidden" {...register("id")} />

      <section>
        <div className="section-rule">
          <Heading level={2} size="md">
            {t("addressTitle")}
          </Heading>
          <Text size="sm" variant="muted" className="mt-1">
            {t("addressDescription")}
          </Text>
        </div>

        <Card>
          <CardContent className="py-5">
            <Field
              label={t("slug")}
              description={t("slugHint")}
              error={errors.slug?.message}
              hint={<SlugStatus status={slugStatus} />}
              required
            >
              <Input
                spellCheck={false}
                autoComplete="off"
                maxLength={SLUG_MAX}
                leading={
                  <span className="text-xs whitespace-nowrap">
                    {BRAND.domain}/d/
                  </span>
                }
                className="pl-22"
                {...register("slug")}
              />
            </Field>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="section-rule">
          <Heading level={2} size="md">
            {t("seoTitle")}
          </Heading>
          <Text size="sm" variant="muted" className="mt-1">
            {t("seoDescription")}
          </Text>
        </div>

        <Card>
          <CardContent className="space-y-5 py-5">
            <Field
              label={t("metaTitle")}
              description={t("metaTitleHint")}
              error={errors.seoTitle?.message}
              hint={<Counter value={seoTitle.length} ideal={TITLE_IDEAL} />}
            >
              <Input
                maxLength={70}
                placeholder={t("metaTitlePlaceholder")}
                {...register("seoTitle")}
              />
            </Field>

            <Field
              label={t("metaDescription")}
              error={errors.seoDescription?.message}
              hint={
                <Counter
                  value={seoDescription.length}
                  ideal={DESCRIPTION_IDEAL}
                />
              }
            >
              <Textarea
                rows={3}
                resizable={false}
                maxLength={200}
                placeholder={t("metaDescriptionPlaceholder")}
                {...register("seoDescription")}
              />
            </Field>

            <Field
              label={t("keywords")}
              description={t("keywordsHint")}
              error={errors.seoKeywords?.message}
            >
              <TagInput
                value={keywordTags}
                placeholder={t("keywordsPlaceholder")}
                removeLabel={removeKeywordLabel}
                onChange={onKeywordsChange}
              />
            </Field>

            <Field
              label={t("ogImage")}
              description={t("ogImageHint")}
              error={errors.ogImageUrl?.message}
            >
              <Input
                type="url"
                inputMode="url"
                maxLength={2048}
                placeholder="https://…"
                {...register("ogImageUrl")}
              />
            </Field>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader bordered={false}>
            <div>
              <CardTitle>{t("noIndex")}</CardTitle>
              <Text size="sm" variant="muted" className="mt-1">
                {t("noIndexHint")}
              </Text>
            </div>
            <Switch
              checked={noIndex}
              onCheckedChange={onNoIndexChange}
              aria-label={t("noIndex")}
            />
          </CardHeader>
        </Card>
      </section>

      {/* Sticky so the primary action stays reachable on a long form. Sticks to
          the bottom of the workspace scroll region, not the viewport. */}
      <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-2 rounded-sm border border-subtle bg-surface/95 p-3 backdrop-blur sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          loading={pending}
          disabled={
            !isDirty || slugStatus === "taken" || slugStatus === "checking"
          }
        >
          {tc("saveChanges")}
        </Button>
      </div>
    </form>
  );
}

function Counter({ value, ideal }: { value: number; ideal: number }) {
  return (
    <span className={value > ideal ? "text-warning-fg" : undefined}>
      <span className="tabular">{value}</span> / {ideal}
    </span>
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
