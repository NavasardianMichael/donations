"use client";

import { CreditCard, Globe, Loader2, ShieldCheck } from "lucide-react";
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
  RadioGroup,
  RadioOption,
  Text,
  Textarea,
} from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/validations/donation";
import { createCheckoutAction } from "@/server/actions/checkout";

export interface DonationFormProps {
  pageId: string;
  currency: string;
  suggestedAmounts: number[];
  minAmountMinor: number;
  /** The international ladder, in USD cents. Index-matched to the above. */
  suggestedAmountsUsd: number[];
  minAmountMinorUsd: number;
  allowCustomAmount: boolean;
  collectDonorName: boolean;
  collectMessage: boolean;
  /** Which gateways have credentials right now. Evaluated on the server. */
  providers: { arca: boolean; paddle: boolean };
  source: "DIRECT" | "EMBED";
}

/** What each method charges. Paddle cannot settle AMD, so it is USD only. */
const PADDLE_CURRENCY = "usd";

/**
 * The interactive donation card.
 *
 * On submit this creates a real order at the chosen gateway and does a FULL
 * browser navigation to the URL it returns (`window.location.assign`, not a Next
 * route) — for ArCa that is its hosted card page on another origin, and for
 * Paddle it is our own overlay-opener page carrying Paddle's `_ptxn`. Either
 * way, card details are never entered on this form; it only ever sees an amount
 * and optional donor metadata.
 *
 * The two methods are not interchangeable: ArCa charges the page's own currency
 * and Paddle charges USD from a separate ladder the creator authored. Switching
 * method therefore swaps the whole amount selector, currency and all.
 */
export function DonationForm({
  pageId,
  currency,
  suggestedAmounts,
  minAmountMinor,
  suggestedAmountsUsd,
  minAmountMinorUsd,
  allowCustomAmount,
  collectDonorName,
  collectMessage,
  providers,
  source,
}: DonationFormProps) {
  const t = useTranslations("donation");
  const tMoney = useTranslations("money");

  // Default to whichever method is actually available, preferring the local
  // one — this is an Armenian platform and most donors will use an Armenian card.
  const [method, setMethod] = useState<PaymentMethod>(
    providers.arca ? "ARCA" : "PADDLE",
  );

  const isPaddle = method === "PADDLE";
  const activeCurrency = isPaddle ? PADDLE_CURRENCY : currency;
  const activeLadder = isPaddle ? suggestedAmountsUsd : suggestedAmounts;
  const activeMinimum = isPaddle ? minAmountMinorUsd : minAmountMinor;

  const defaultAmount = (ladder: number[]) => ladder[1] ?? ladder[0] ?? null;

  const [amountMinor, setAmountMinor] = useState<number | null>(
    defaultAmount(providers.arca ? suggestedAmounts : suggestedAmountsUsd),
  );
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const amountValid = amountMinor !== null && amountMinor >= activeMinimum;

  const buttonLabel = useMemo(() => {
    if (!amountMinor) return t("donateNow");
    return t("donateAmount", {
      amount: formatMoney(amountMinor, activeCurrency),
    });
  }, [amountMinor, activeCurrency, t]);

  function handleMethodChange(next: string) {
    const chosen: PaymentMethod = next === "PADDLE" ? "PADDLE" : "ARCA";
    if (chosen === method) return;
    setMethod(chosen);
    setError(null);
    // The amount is denominated in the old method's currency, so carrying it
    // over would turn 5 000 ֏ into $5 000. Reset to the new ladder's default.
    setAmountMinor(
      defaultAmount(chosen === "PADDLE" ? suggestedAmountsUsd : suggestedAmounts),
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!amountValid) return;
    setError(null);

    startTransition(async () => {
      const result = await createCheckoutAction({
        pageId,
        method,
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

      // A Paddle overlay nested in a third-party iframe is unreliable, so an
      // embedded widget hands checkout to a new top-level tab. The server
      // decides this, not the client.
      if (result.data.newTab) {
        window.open(result.data.redirectUrl, "_blank", "noopener,noreferrer");
        return;
      }

      // Cross-origin: a full navigation, not router.push.
      window.location.assign(result.data.redirectUrl);
    });
  }

  if (!providers.arca && !providers.paddle) {
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
          {providers.arca && providers.paddle ? (
            <div>
              <Heading level={2} size="sm" className="mb-3">
                {t("method.label")}
              </Heading>
              <RadioGroup
                value={method}
                onValueChange={handleMethodChange}
                aria-label={t("method.label")}
              >
                <RadioOption value="ARCA" description={t("method.arcaHint")}>
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="size-4" aria-hidden="true" />
                    {t("method.arca")}
                  </span>
                </RadioOption>
                <RadioOption value="PADDLE" description={t("method.paddleHint")}>
                  <span className="flex items-center gap-1.5">
                    <Globe className="size-4" aria-hidden="true" />
                    {t("method.paddle")}
                  </span>
                </RadioOption>
              </RadioGroup>
            </div>
          ) : null}

          <div>
            <Heading level={2} size="sm" className="mb-3">
              {tMoney("selectAmount")}
            </Heading>
            <AmountSelector
              // Remounts on method change so the custom-amount field cannot
              // keep a value typed in the other currency.
              key={method}
              suggestedAmounts={activeLadder}
              value={amountMinor}
              onChange={setAmountMinor}
              currency={activeCurrency}
              allowCustomAmount={allowCustomAmount}
              minAmountMinor={activeMinimum}
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
            {isPaddle ? t("secureTransactionPaddle") : t("secureTransaction")}
          </Text>
        </form>
      </CardContent>
    </Card>
  );
}
