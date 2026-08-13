"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

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
} from "@/components/ui";
import { BRAND } from "@/lib/brand";
import {
  updatePageSeoSchema,
  type UpdatePageSeoInput,
} from "@/lib/validations/page";
import { resolver } from "@/lib/validations/resolver";
import { updatePageSeoAction } from "@/server/actions/pages";

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

  const seoTitle = useWatch({ control, name: "seoTitle" }) ?? "";
  const seoDescription = useWatch({ control, name: "seoDescription" }) ?? "";
  const seoKeywords = useWatch({ control, name: "seoKeywords" }) ?? "";
  const noIndex = useWatch({ control, name: "noIndex" });

  const keywordTags = seoKeywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  function onSubmit(values: UpdatePageSeoInput) {
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
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
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
              required
            >
              <Input
                spellCheck={false}
                autoComplete="off"
                leading={
                  <span className="text-xs whitespace-nowrap">
                    {BRAND.domain}/d/
                  </span>
                }
                className="pl-30"
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
                removeLabel={(tag) => t("removeKeyword", { tag })}
                onChange={(tags) =>
                  setValue("seoKeywords", tags.join(", "), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
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
              onCheckedChange={(checked) =>
                setValue("noIndex", checked, { shouldDirty: true })
              }
              aria-label={t("noIndex")}
            />
          </CardHeader>
        </Card>
      </section>

      {/* Sticky so the primary action stays reachable on a long form. Sticks to
          the bottom of the workspace scroll region, not the viewport. */}
      <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-2 rounded-sm border border-subtle bg-surface/95 p-3 backdrop-blur sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/pages")}
        >
          {tc("cancel")}
        </Button>
        <Button type="submit" loading={pending} disabled={!isDirty}>
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
