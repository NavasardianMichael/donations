"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  Text,
  Textarea,
  toast,
} from "@/components/ui";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { formatMoneyPlain, parseMoneyToMinor } from "@/lib/utils";
import { updatePageAction } from "@/server/actions/pages";

export interface EditablePage {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  currency: CurrencyCode;
  suggestedAmounts: number[];
  allowCustomAmount: boolean;
  minAmountMinor: number;
  goalAmountMinor: number | null;
  showProgressBar: boolean;
  collectDonorName: boolean;
  collectMessage: boolean;
  thankYouMessage: string | null;
}

/**
 * Amounts, goal, description, thank-you message.
 *
 * A plain controlled form rather than react-hook-form + zodResolver: the
 * comma-separated amounts field is a text representation of a number array in
 * MAJOR units (what a person types) that has to become an array of MINOR
 * units (what the schema and the database want), and that transform does not
 * fit the resolver's 1:1 field model. Validation happens once, on submit,
 * against the same `updatePageSchema` the server re-checks — this copy is for
 * a faster error round-trip, not a second source of truth.
 */
export function PageEditorForm({ page }: { page: EditablePage }) {
  const t = useTranslations("pageSettings");
  const tc = useTranslations("common");

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(page.coverImageUrl ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(page.currency);
  const [amountsText, setAmountsText] = useState(
    page.suggestedAmounts
      .map((minor) => formatMoneyPlain(minor, page.currency))
      .join(", "),
  );
  const [minAmountText, setMinAmountText] = useState(
    formatMoneyPlain(page.minAmountMinor, page.currency),
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

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const suggestedAmounts = amountsText
      .split(",")
      .map((piece) => piece.trim())
      .filter(Boolean)
      .map((piece) => parseMoneyToMinor(piece, currency));

    if (suggestedAmounts.some((amount) => amount === null)) {
      setFieldErrors({ suggestedAmounts: t("amountsInvalid") });
      return;
    }

    const minAmountMinor = parseMoneyToMinor(minAmountText, currency);
    if (minAmountMinor === null) {
      setFieldErrors({ minAmountMinor: t("amountsInvalid") });
      return;
    }

    const goalAmountMinor =
      goalText.trim() === "" ? null : parseMoneyToMinor(goalText, currency);
    if (goalText.trim() !== "" && goalAmountMinor === null) {
      setFieldErrors({ goalAmountMinor: t("amountsInvalid") });
      return;
    }

    startTransition(async () => {
      const result = await updatePageAction({
        id: page.id,
        title,
        description,
        coverImageUrl,
        currency,
        suggestedAmounts: suggestedAmounts as number[],
        allowCustomAmount,
        minAmountMinor,
        goalAmountMinor,
        showProgressBar,
        collectDonorName,
        collectMessage,
        thankYouMessage,
      });

      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setFormError(result.message);
        return;
      }

      toast.success(tc("saved"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {formError ? <Alert variant="danger">{formError}</Alert> : null}

      <Card>
        <CardHeader bordered>
          <CardTitle>{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          <Field label={t("titleField")} required error={fieldErrors.title}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field
            label={t("descriptionField")}
            error={fieldErrors.description}
          >
            <Textarea
              rows={4}
              resizable={false}
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              placeholder="https://…"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
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
            <Select
              value={currency}
              onValueChange={(value) => setCurrency(value as CurrencyCode)}
            >
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
            <Input
              value={amountsText}
              onChange={(e) => setAmountsText(e.target.value)}
              placeholder="1000, 5000, 10000"
            />
          </Field>

          <Field
            label={t("minAmount")}
            error={fieldErrors.minAmountMinor}
          >
            <Input
              leading={CURRENCIES[currency].symbol}
              value={minAmountText}
              onChange={(e) => setMinAmountText(e.target.value)}
            />
          </Field>

          <Field orientation="horizontal" label={t("allowCustomAmount")}>
            <Switch
              checked={allowCustomAmount}
              onCheckedChange={setAllowCustomAmount}
            />
          </Field>
        </CardContent>
      </Card>

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
              onChange={(e) => setGoalText(e.target.value)}
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
              placeholder={t("thankYouMessagePlaceholder")}
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-2 rounded-sm border border-subtle bg-surface/95 p-3 backdrop-blur sm:flex-row sm:justify-end md:bottom-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/pages")}
        >
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
