"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import {
  Alert,
  AmountSelector,
  Button,
  Card,
  CardContent,
  Checkbox,
  Field,
  Heading,
  Input,
  Text,
  Textarea,
} from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { createCheckoutAction } from "@/server/actions/checkout";

export interface DonationFormProps {
  pageId: string;
  currency: string;
  suggestedAmounts: number[];
  minAmountMinor: number;
  allowCustomAmount: boolean;
  collectDonorName: boolean;
  collectMessage: boolean;
  /** Whether a payment provider is actually wired up right now. */
  arcaConfigured: boolean;
  source: "DIRECT" | "EMBED";
}

/**
 * The interactive donation card.
 *
 * On submit this creates a real order at the gateway and does a FULL browser
 * navigation to ArCa's hosted page (`window.location.assign`, not a Next
 * route) — it is a different origin, so client-side routing cannot take the
 * donor there. Card details are entered on ArCa's page, never on ours; this
 * form only ever sees an amount and optional donor metadata.
 */
export function DonationForm({
  pageId,
  currency,
  suggestedAmounts,
  minAmountMinor,
  allowCustomAmount,
  collectDonorName,
  collectMessage,
  arcaConfigured,
  source,
}: DonationFormProps) {
  const t = useTranslations("donation");
  const tMoney = useTranslations("money");

  const [amountMinor, setAmountMinor] = useState<number | null>(
    suggestedAmounts[1] ?? suggestedAmounts[0] ?? null,
  );
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const amountValid =
    amountMinor !== null && amountMinor >= minAmountMinor;

  const buttonLabel = useMemo(() => {
    if (!amountMinor) return t("donateNow");
    return t("donateAmount", { amount: formatMoney(amountMinor, currency) });
  }, [amountMinor, currency, t]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!amountValid) return;
    setError(null);

    startTransition(async () => {
      const result = await createCheckoutAction({
        pageId,
        amountMinor,
        donorName: collectDonorName && !isAnonymous ? donorName : "",
        donorEmail,
        message: collectMessage ? message : "",
        isAnonymous: collectDonorName ? isAnonymous : true,
        source,
        website,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      // Cross-origin: a full navigation, not router.push.
      window.location.assign(result.data.redirectUrl);
    });
  }

  if (!arcaConfigured) {
    return (
      <Card tone="warm">
        <CardContent className="space-y-4 py-6">
          <Heading level={2} size="sm">
            {tMoney("selectAmount")}
          </Heading>
          <AmountSelector
            suggestedAmounts={suggestedAmounts}
            value={amountMinor}
            onChange={setAmountMinor}
            currency={currency}
            allowCustomAmount={allowCustomAmount}
            minAmountMinor={minAmountMinor}
            disabled
          />
          <Alert variant="warning" title={t("disabledTitle")}>
            {t("disabledBody")}
          </Alert>
          <Button type="button" size="lg" fullWidth disabled>
            {t("disabledButton")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card tone="warm">
      <CardContent className="py-6">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <Heading level={2} size="sm" className="mb-3">
              {tMoney("selectAmount")}
            </Heading>
            <AmountSelector
              suggestedAmounts={suggestedAmounts}
              value={amountMinor}
              onChange={setAmountMinor}
              currency={currency}
              allowCustomAmount={allowCustomAmount}
              minAmountMinor={minAmountMinor}
              size="lg"
            />
          </div>

          {collectDonorName ? (
            <Field label={t("donorName")}>
              <Input
                autoComplete="name"
                disabled={isAnonymous}
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
              />
            </Field>
          ) : null}

          <Field label={t("donorEmail")} description={t("emailReceiptHint")}>
            <Input
              type="email"
              autoComplete="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
            />
          </Field>

          {collectMessage ? (
            <Field label={t("donorMessage")}>
              <Textarea
                rows={3}
                resizable={false}
                placeholder={t("donorMessagePlaceholder")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
          ) : null}

          {collectDonorName ? (
            <Field orientation="horizontal" label={t("donateAnonymously")}>
              <Checkbox
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked === true)}
              />
            </Field>
          ) : null}

          {/* Honeypot — hidden from sight, the a11y tree, and tab order. */}
          <div
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
          >
            <label htmlFor="donation-website">Leave this field empty</label>
            <input
              id="donation-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {error ? (
            <Alert variant="danger" icon={false}>
              {error}
            </Alert>
          ) : null}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={pending}
            disabled={!amountValid}
          >
            {buttonLabel}
          </Button>

          <Text
            size="xs"
            variant="muted"
            className="flex items-center justify-center gap-1.5"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-3.5" aria-hidden="true" />
            )}
            {t("secureTransaction")}
          </Text>
        </form>
      </CardContent>
    </Card>
  );
}
