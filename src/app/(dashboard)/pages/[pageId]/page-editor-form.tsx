"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useState,
  useTransition,
  type ChangeEventHandler,
  type ComponentProps,
  type MouseEventHandler,
  type SubmitEventHandler,
} from "react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  TagInput,
  Text,
  Textarea,
  toast,
  type TagInputProps,
} from "@/components/ui";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { amountBounds } from "@/lib/fees";
import { formatMoneyPlain, parseMoneyToMinor } from "@/lib/utils";
import {
  SUGGESTED_AMOUNTS_MAX,
  updatePageSchema,
} from "@/lib/validations/page";
import { resolver } from "@/lib/validations/resolver";
import { updatePageAction } from "@/server/actions/pages";
import { zodFieldErrors } from "@/server/actions/types";

export interface EditablePage {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  currency: CurrencyCode;
  suggestedAmounts: number[];
  /** The international ladder, in USD cents. */
  suggestedAmountsUsd: number[];
  allowCustomAmount: boolean;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  minAmountMinorUsd: number | null;
  maxAmountMinorUsd: number | null;
  goalAmountMinor: number | null;
  showProgressBar: boolean;
  collectDonorName: boolean;
  collectMessage: boolean;
  thankYouMessage: string | null;
}

/** Paddle settles in USD; the international ladder is always denominated here. */
const INTERNATIONAL_CURRENCY = "usd";

/**
 * Amounts, goal, description, thank-you message.
 *
 * A plain controlled form rather than react-hook-form + zodResolver: amount
 * chips are MAJOR-unit strings that have to become MINOR-unit integers (what
 * the schema and the database want), and that transform does not fit the
 * resolver's 1:1 field model. Validation happens once, on submit, against the
 * same `updatePageSchema` the server re-checks — this copy is for a faster
 * error round-trip, not a second source of truth.
 */
export function PageEditorForm({
  page,
  paddleConfigured,
}: {
  page: EditablePage;
  paddleConfigured: boolean;
}) {
  const t = useTranslations("pageSettings");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(page.coverImageUrl ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(page.currency);
  const [amountTags, setAmountTags] = useState(
    page.suggestedAmounts.map((minor) =>
      formatMoneyPlain(minor, page.currency),
    ),
  );
  const [minEnabled, setMinEnabled] = useState(page.minAmountMinor != null);
  const [minAmountText, setMinAmountText] = useState(
    page.minAmountMinor != null
      ? formatMoneyPlain(page.minAmountMinor, page.currency)
      : "",
  );
  const [maxEnabled, setMaxEnabled] = useState(page.maxAmountMinor != null);
  const [maxAmountText, setMaxAmountText] = useState(
    page.maxAmountMinor != null
      ? formatMoneyPlain(page.maxAmountMinor, page.currency)
      : "",
  );
  // Always USD, never `currency` — this ladder exists precisely because Paddle
  // cannot charge the page's own currency.
  const [amountTagsUsd, setAmountTagsUsd] = useState(
    page.suggestedAmountsUsd.map((minor) =>
      formatMoneyPlain(minor, INTERNATIONAL_CURRENCY),
    ),
  );
  const [minUsdEnabled, setMinUsdEnabled] = useState(
    page.minAmountMinorUsd != null,
  );
  const [minAmountUsdText, setMinAmountUsdText] = useState(
    page.minAmountMinorUsd != null
      ? formatMoneyPlain(page.minAmountMinorUsd, INTERNATIONAL_CURRENCY)
      : "",
  );
  const [maxUsdEnabled, setMaxUsdEnabled] = useState(
    page.maxAmountMinorUsd != null,
  );
  const [maxAmountUsdText, setMaxAmountUsdText] = useState(
    page.maxAmountMinorUsd != null
      ? formatMoneyPlain(page.maxAmountMinorUsd, INTERNATIONAL_CURRENCY)
      : "",
  );
  const [goalText, setGoalText] = useState(
    page.goalAmountMinor !== null
      ? formatMoneyPlain(page.goalAmountMinor, page.currency)
      : "",
  );
  const [allowCustomAmount, setAllowCustomAmount] = useState(
    page.allowCustomAmount,
  );
  const [showProgressBar, setShowProgressBar] = useState(page.showProgressBar);
  const [collectDonorName, setCollectDonorName] = useState(
    page.collectDonorName,
  );
  const [collectMessage, setCollectMessage] = useState(page.collectMessage);
  const [thankYouMessage, setThankYouMessage] = useState(
    page.thankYouMessage ?? "",
  );

  const onTitleChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> =
    useCallback((event) => {
      setTitle(event.target.value);
    }, []);

  const onDescriptionChange: ChangeEventHandler<
    HTMLTextAreaElement,
    HTMLTextAreaElement
  > = useCallback((event) => {
    setDescription(event.target.value);
  }, []);

  const onCoverImageUrlChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setCoverImageUrl(event.target.value);
  }, []);

  const onCurrencyChange: NonNullable<
    ComponentProps<typeof Select>["onValueChange"]
  > = useCallback((value) => {
    setCurrency(value as CurrencyCode);
  }, []);

  const removeAmountLabel: TagInputProps["removeLabel"] = useCallback(
    (tag) => t("removeAmount", { tag }),
    [t],
  );

  const parseAmountTags: NonNullable<TagInputProps["parseValue"]> = useCallback(
    (raw) => parseAmountTag(raw, currency, amountTags),
    [amountTags, currency],
  );

  const onAmountTagsInvalid: NonNullable<TagInputProps["onInvalid"]> =
    useCallback(
      (raw) => {
        setFieldErrors((prev) => ({
          ...prev,
          suggestedAmounts: amountTagError(raw, currency, amountTags, t),
        }));
      },
      [amountTags, currency, t],
    );

  const onAmountTagsChange: TagInputProps["onChange"] = useCallback(
    (tags) => {
      setAmountTags(tags);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.suggestedAmounts;
        if (paddleConfigured && amountTagsUsd.length !== tags.length) {
          next.suggestedAmountsUsd = t("amountsUsdLengthMismatch");
        } else {
          delete next.suggestedAmountsUsd;
        }
        return next;
      });
    },
    [amountTagsUsd.length, paddleConfigured, t],
  );

  const onMinAmountTextChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setMinAmountText(event.target.value);
  }, []);

  const onMaxAmountTextChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setMaxAmountText(event.target.value);
  }, []);

  const parseAmountTagsUsd: NonNullable<TagInputProps["parseValue"]> =
    useCallback(
      (raw) => parseAmountTag(raw, INTERNATIONAL_CURRENCY, amountTagsUsd),
      [amountTagsUsd],
    );

  const onAmountTagsUsdInvalid: NonNullable<TagInputProps["onInvalid"]> =
    useCallback(
      (raw) => {
        setFieldErrors((prev) => ({
          ...prev,
          suggestedAmountsUsd: amountTagError(
            raw,
            INTERNATIONAL_CURRENCY,
            amountTagsUsd,
            t,
          ),
        }));
      },
      [amountTagsUsd, t],
    );

  const onAmountTagsUsdChange: TagInputProps["onChange"] = useCallback(
    (tags) => {
      setAmountTagsUsd(tags);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (tags.length !== amountTags.length) {
          next.suggestedAmountsUsd = t("amountsUsdLengthMismatch");
        } else {
          delete next.suggestedAmountsUsd;
        }
        return next;
      });
    },
    [amountTags.length, t],
  );

  const onMinAmountUsdTextChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setMinAmountUsdText(event.target.value);
  }, []);

  const onMaxAmountUsdTextChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setMaxAmountUsdText(event.target.value);
  }, []);

  const onGoalTextChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setGoalText(event.target.value);
  }, []);

  const onThankYouMessageChange: ChangeEventHandler<
    HTMLTextAreaElement,
    HTMLTextAreaElement
  > = useCallback((event) => {
    setThankYouMessage(event.target.value);
  }, []);

  const onCancel: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    router.push("/pages");
  }, [router]);

  const onSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      setFormError(null);
      setFieldErrors({});

      const suggestedAmounts = amountTags.map((tag) =>
        parseMoneyToMinor(tag, currency),
      );

      if (suggestedAmounts.some((amount) => amount === null)) {
        setFieldErrors({ suggestedAmounts: t("amountsInvalid") });
        return;
      }

      const minAmountMinor = readBound(minEnabled, minAmountText, currency);
      if (minAmountMinor === "invalid") {
        setFieldErrors({ minAmountMinor: t("amountsInvalid") });
        return;
      }

      const maxAmountMinor = readBound(maxEnabled, maxAmountText, currency);
      if (maxAmountMinor === "invalid") {
        setFieldErrors({ maxAmountMinor: t("amountsInvalid") });
        return;
      }

      if (
        minAmountMinor != null &&
        maxAmountMinor != null &&
        minAmountMinor >= maxAmountMinor
      ) {
        setFieldErrors({ maxAmountMinor: t("minMaxOrder") });
        return;
      }

      const goalAmountMinor =
        goalText.trim() === "" ? null : parseMoneyToMinor(goalText, currency);
      if (goalText.trim() !== "" && goalAmountMinor === null) {
        setFieldErrors({ goalAmountMinor: t("amountsInvalid") });
        return;
      }

      const suggestedAmountsUsd = amountTagsUsd.map((tag) =>
        parseMoneyToMinor(tag, INTERNATIONAL_CURRENCY),
      );

      if (suggestedAmountsUsd.some((amount) => amount === null)) {
        setFieldErrors({ suggestedAmountsUsd: t("amountsInvalid") });
        return;
      }

      // Checked here as well as in the schema so the creator gets the error
      // without a round-trip: an unpaired chip would leave a donor switching to
      // the international method with no equivalent for the amount they picked.
      if (suggestedAmountsUsd.length !== suggestedAmounts.length) {
        setFieldErrors({ suggestedAmountsUsd: t("amountsUsdLengthMismatch") });
        return;
      }

      const minAmountMinorUsd = readBound(
        minUsdEnabled,
        minAmountUsdText,
        INTERNATIONAL_CURRENCY,
      );
      if (minAmountMinorUsd === "invalid") {
        setFieldErrors({ minAmountMinorUsd: t("amountsInvalid") });
        return;
      }

      const maxAmountMinorUsd = readBound(
        maxUsdEnabled,
        maxAmountUsdText,
        INTERNATIONAL_CURRENCY,
      );
      if (maxAmountMinorUsd === "invalid") {
        setFieldErrors({ maxAmountMinorUsd: t("amountsInvalid") });
        return;
      }

      if (
        minAmountMinorUsd != null &&
        maxAmountMinorUsd != null &&
        minAmountMinorUsd >= maxAmountMinorUsd
      ) {
        setFieldErrors({ maxAmountMinorUsd: t("minMaxOrder") });
        return;
      }

      const payload = {
        id: page.id,
        title,
        description,
        coverImageUrl,
        currency,
        suggestedAmounts: suggestedAmounts as number[],
        suggestedAmountsUsd: suggestedAmountsUsd as number[],
        allowCustomAmount,
        minAmountMinor,
        maxAmountMinor,
        minAmountMinorUsd,
        maxAmountMinorUsd,
        goalAmountMinor,
        showProgressBar,
        collectDonorName,
        collectMessage,
        thankYouMessage,
      };

      const parsed = updatePageSchema(resolver(tv)).safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(zodFieldErrors(parsed.error.issues));
        setFormError(tv("checkFields"));
        return;
      }

      startTransition(async () => {
        const result = await updatePageAction(parsed.data);

        if (!result.ok) {
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          setFormError(result.message);
          return;
        }

        toast.success(tc("saved"));
        router.refresh();
      });
    },
    [
      allowCustomAmount,
      amountTags,
      amountTagsUsd,
      collectDonorName,
      collectMessage,
      coverImageUrl,
      currency,
      description,
      goalText,
      maxAmountText,
      maxAmountUsdText,
      maxEnabled,
      maxUsdEnabled,
      minAmountText,
      minAmountUsdText,
      minEnabled,
      minUsdEnabled,
      page.id,
      router,
      showProgressBar,
      t,
      tc,
      thankYouMessage,
      title,
      tv,
    ],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {formError ? <Alert variant="danger">{formError}</Alert> : null}

      <Card>
        <CardHeader bordered>
          <CardTitle>{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          <Field label={t("titleField")} required error={fieldErrors.title}>
            <Input maxLength={120} value={title} onChange={onTitleChange} />
          </Field>
          <Field label={t("descriptionField")} error={fieldErrors.description}>
            <Textarea
              rows={4}
              resizable={false}
              maxLength={2000}
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={onDescriptionChange}
            />
          </Field>
          <Field
            label={t("coverImage")}
            description={t("coverImageHint")}
            error={fieldErrors.coverImageUrl}
          >
            <Input
              type="url"
              inputMode="url"
              maxLength={2048}
              placeholder="https://…"
              value={coverImageUrl}
              onChange={onCoverImageUrlChange}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader bordered>
          <CardTitle>{t("amountsSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          <Field label={t("currencyField")}>
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCIES).map(([code, meta]) => (
                  <SelectItem key={code} value={code}>
                    {meta.label} ({meta.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={t("suggestedAmounts")}
            description={t("suggestedAmountsHint")}
            error={fieldErrors.suggestedAmounts}
          >
            <TagInput
              value={amountTags}
              placeholder={t("suggestedAmountsPlaceholder")}
              removeLabel={removeAmountLabel}
              parseValue={parseAmountTags}
              onInvalid={onAmountTagsInvalid}
              onChange={onAmountTagsChange}
            />
          </Field>

          <Field orientation="horizontal" label={t("minAmount")}>
            <Switch checked={minEnabled} onCheckedChange={setMinEnabled} />
          </Field>
          {minEnabled ? (
            <Field error={fieldErrors.minAmountMinor}>
              <Input
                leading={CURRENCIES[currency].symbol}
                value={minAmountText}
                onChange={onMinAmountTextChange}
              />
            </Field>
          ) : null}

          <Field orientation="horizontal" label={t("maxAmount")}>
            <Switch checked={maxEnabled} onCheckedChange={setMaxEnabled} />
          </Field>
          {maxEnabled ? (
            <Field error={fieldErrors.maxAmountMinor}>
              <Input
                leading={CURRENCIES[currency].symbol}
                value={maxAmountText}
                onChange={onMaxAmountTextChange}
              />
            </Field>
          ) : null}

          <Field orientation="horizontal" label={t("allowCustomAmount")}>
            <Switch
              checked={allowCustomAmount}
              onCheckedChange={setAllowCustomAmount}
            />
          </Field>
        </CardContent>
      </Card>

      {paddleConfigured ? (
        <Card>
          <CardHeader bordered>
            <CardTitle>{t("internationalSection")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 py-5">
            <Alert variant="info" title={t("internationalTitle")}>
              {t("internationalBody")}
            </Alert>

            <Field
              label={t("suggestedAmountsUsd")}
              description={t("suggestedAmountsUsdHint")}
              error={fieldErrors.suggestedAmountsUsd}
            >
              <TagInput
                value={amountTagsUsd}
                placeholder={t("suggestedAmountsPlaceholder")}
                removeLabel={removeAmountLabel}
                parseValue={parseAmountTagsUsd}
                onInvalid={onAmountTagsUsdInvalid}
                onChange={onAmountTagsUsdChange}
              />
            </Field>

            <Field orientation="horizontal" label={t("minAmountUsd")}>
              <Switch
                checked={minUsdEnabled}
                onCheckedChange={setMinUsdEnabled}
              />
            </Field>
            {minUsdEnabled ? (
              <Field error={fieldErrors.minAmountMinorUsd}>
                <Input
                  leading={CURRENCIES[INTERNATIONAL_CURRENCY].symbol}
                  value={minAmountUsdText}
                  onChange={onMinAmountUsdTextChange}
                />
              </Field>
            ) : null}

            <Field orientation="horizontal" label={t("maxAmountUsd")}>
              <Switch
                checked={maxUsdEnabled}
                onCheckedChange={setMaxUsdEnabled}
              />
            </Field>
            {maxUsdEnabled ? (
              <Field error={fieldErrors.maxAmountMinorUsd}>
                <Input
                  leading={CURRENCIES[INTERNATIONAL_CURRENCY].symbol}
                  value={maxAmountUsdText}
                  onChange={onMaxAmountUsdTextChange}
                />
              </Field>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader bordered>
          <CardTitle>{t("goalSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          <Field
            label={t("goalAmount")}
            description={t("goalAmountHint")}
            error={fieldErrors.goalAmountMinor}
          >
            <Input
              leading={CURRENCIES[currency].symbol}
              value={goalText}
              onChange={onGoalTextChange}
            />
          </Field>
          <Field orientation="horizontal" label={t("showProgressBar")}>
            <Switch
              checked={showProgressBar}
              onCheckedChange={setShowProgressBar}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader bordered>
          <CardTitle>{t("donorFieldsSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          <Field orientation="horizontal" label={t("collectDonorName")}>
            <Switch
              checked={collectDonorName}
              onCheckedChange={setCollectDonorName}
            />
          </Field>
          <Field orientation="horizontal" label={t("collectMessage")}>
            <Switch
              checked={collectMessage}
              onCheckedChange={setCollectMessage}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader bordered>
          <CardTitle>{t("thankYouSection")}</CardTitle>
        </CardHeader>
        <CardContent className="py-5">
          <Field
            label={t("thankYouMessage")}
            error={fieldErrors.thankYouMessage}
          >
            <Textarea
              rows={3}
              resizable={false}
              maxLength={500}
              placeholder={t("thankYouMessagePlaceholder")}
              value={thankYouMessage}
              onChange={onThankYouMessageChange}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-2 rounded-sm border border-subtle bg-surface/95 p-3 backdrop-blur sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {tc("saveChanges")}
        </Button>
      </div>

      <Text size="xs" variant="faint">
        {t("currencyChangeWarning")}
      </Text>
    </form>
  );
}

/** Switch off → unset. Switch on with unparseable text → `"invalid"`. */
function readBound(
  enabled: boolean,
  text: string,
  currency: string,
): number | null | "invalid" {
  if (!enabled) return null;
  const minor = parseMoneyToMinor(text, currency);
  if (minor === null) return "invalid";
  const bounds = amountBounds(currency);
  if (minor < bounds.minMinor || minor > bounds.maxMinor) return "invalid";
  return minor;
}

function parseAmountTag(
  raw: string,
  currency: string,
  existing: string[],
): string | null {
  if (existing.length >= SUGGESTED_AMOUNTS_MAX) return null;
  const minor = parseMoneyToMinor(raw, currency);
  if (minor === null) return null;
  const bounds = amountBounds(currency);
  if (minor < bounds.minMinor || minor > bounds.maxMinor) return null;
  const formatted = formatMoneyPlain(minor, currency);
  if (existing.includes(formatted)) return null;
  return formatted;
}

function amountTagError(
  raw: string,
  currency: string,
  existing: string[],
  t: (key: "amountsUnique" | "amountsMax" | "amountsInvalid") => string,
): string {
  const minor = parseMoneyToMinor(raw, currency);
  const formatted = minor !== null ? formatMoneyPlain(minor, currency) : null;
  if (formatted !== null && existing.includes(formatted)) {
    return t("amountsUnique");
  }
  if (existing.length >= SUGGESTED_AMOUNTS_MAX) return t("amountsMax");
  return t("amountsInvalid");
}
