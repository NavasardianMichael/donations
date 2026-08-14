"use client";

import { CreditCard, Globe, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type ChangeEventHandler,
  type ComponentProps,
  type SubmitEventHandler,
} from "react";

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
import { amountBounds } from "@/lib/fees";
import { formatMoney } from "@/lib/utils";
import { checkoutSchema, type PaymentMethod } from "@/lib/validations/donation";
import { resolver } from "@/lib/validations/resolver";
import { createCheckoutAction } from "@/server/actions/checkout";
import { zodFieldErrors } from "@/server/actions/types";

export interface DonationFormProps {
  pageId: string;
  currency: string;
  suggestedAmounts: number[];
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  /** The international ladder, in USD cents. Index-matched to the above. */
  suggestedAmountsUsd: number[];
  minAmountMinorUsd: number | null;
  maxAmountMinorUsd: number | null;
  allowCustomAmount: boolean;
  collectDonorName: boolean;
  collectMessage: boolean;
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
  maxAmountMinor,
  suggestedAmountsUsd,
  minAmountMinorUsd,
  maxAmountMinorUsd,
  allowCustomAmount,
  collectDonorName,
  collectMessage,
  source,
}: DonationFormProps) {
  const t = useTranslations("donation");
  const tMoney = useTranslations("money");
  const tv = useTranslations("validation");

  // Prefer the local method — this is an Armenian platform and most donors
  // will use an Armenian card. A missing gateway is handled on submit, not
  // by hiding the form: the donor can still pick an amount and method.
  const [method, setMethod] = useState<PaymentMethod>("ARCA");

  const isPaddle = method === "PADDLE";
  const activeCurrency = isPaddle ? PADDLE_CURRENCY : currency;
  const activeLadder = isPaddle ? suggestedAmountsUsd : suggestedAmounts;
  const platformBounds = amountBounds(activeCurrency);
  const activeMinimum = isPaddle ? minAmountMinorUsd : minAmountMinor;
  const activeMaximum = isPaddle ? maxAmountMinorUsd : maxAmountMinor;
  const floor = activeMinimum ?? platformBounds.minMinor;
  const ceiling = activeMaximum ?? platformBounds.maxMinor;

  const defaultAmount = (ladder: number[]) => ladder[1] ?? ladder[0] ?? null;

  const [amountMinor, setAmountMinor] = useState<number | null>(
    defaultAmount(suggestedAmounts),
  );
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const amountValid =
    amountMinor !== null && amountMinor >= floor && amountMinor <= ceiling;

  const amountError =
    amountMinor !== null && amountMinor < floor
      ? tv("amount.tooSmall", { min: formatMoney(floor, activeCurrency) })
      : amountMinor !== null && amountMinor > ceiling
        ? tv("amount.abovePageMaximum", {
            max: formatMoney(ceiling, activeCurrency),
          })
        : null;

  const buttonLabel = useMemo(() => {
    if (!amountMinor) return t("donateNow");
    return t("donateAmount", {
      amount: formatMoney(amountMinor, activeCurrency),
    });
  }, [amountMinor, activeCurrency, t]);

  const handleMethodChange: NonNullable<
    ComponentProps<typeof RadioGroup>["onValueChange"]
  > = useCallback(
    (next) => {
      const chosen: PaymentMethod = next === "PADDLE" ? "PADDLE" : "ARCA";
      if (chosen === method) return;
      setMethod(chosen);
      setError(null);
      setFieldErrors({});
      // The amount is denominated in the old method's currency, so carrying it
      // over would turn 5 000 ֏ into $5 000. Reset to the new ladder's default.
      setAmountMinor(
        defaultAmount(
          chosen === "PADDLE" ? suggestedAmountsUsd : suggestedAmounts,
        ),
      );
    },
    [method, suggestedAmounts, suggestedAmountsUsd],
  );

  const onDonorNameChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setDonorName(event.target.value);
    setFieldErrors((prev) => {
      if (!prev.donorName) return prev;
      const next = { ...prev };
      delete next.donorName;
      return next;
    });
  }, []);

  const onDonorEmailChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setDonorEmail(event.target.value);
    setFieldErrors((prev) => {
      if (!prev.donorEmail) return prev;
      const next = { ...prev };
      delete next.donorEmail;
      return next;
    });
  }, []);

  const onMessageChange: ChangeEventHandler<
    HTMLTextAreaElement,
    HTMLTextAreaElement
  > = useCallback((event) => {
    setMessage(event.target.value);
    setFieldErrors((prev) => {
      if (!prev.message) return prev;
      const next = { ...prev };
      delete next.message;
      return next;
    });
  }, []);

  const onAnonymousChange: NonNullable<
    ComponentProps<typeof Checkbox>["onCheckedChange"]
  > = useCallback((checked) => {
    setIsAnonymous(checked === true);
  }, []);

  const onWebsiteChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setWebsite(event.target.value);
  }, []);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      if (!amountValid) {
        setError(amountError ?? t("errors.amountMismatch"));
        return;
      }
      setError(null);
      setFieldErrors({});

      const payload = {
        pageId,
        method,
        amountMinor,
        donorName: collectDonorName && !isAnonymous ? donorName : "",
        donorEmail,
        message: collectMessage ? message : "",
        isAnonymous: collectDonorName ? isAnonymous : true,
        source,
        website,
      };

      const parsed = checkoutSchema(
        resolver(tv),
        formatMoney(floor, activeCurrency),
        { minMinor: floor, maxMinor: ceiling },
      ).safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(zodFieldErrors(parsed.error.issues));
        setError(tv("checkFields"));
        return;
      }

      startTransition(async () => {
        const result = await createCheckoutAction(parsed.data);

        if (!result.ok) {
          setError(result.message);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
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
    },
    [
      activeCurrency,
      amountError,
      amountMinor,
      amountValid,
      ceiling,
      collectDonorName,
      collectMessage,
      donorEmail,
      donorName,
      floor,
      isAnonymous,
      message,
      method,
      pageId,
      source,
      t,
      tv,
      website,
    ],
  );

  return (
    <Card tone="warm">
      <CardContent className="py-6">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
              minAmountMinor={activeMinimum ?? undefined}
              maxAmountMinor={activeMaximum ?? undefined}
              error={amountError}
              size="lg"
            />
          </div>

          {collectDonorName ? (
            <Field label={t("donorName")} error={fieldErrors.donorName}>
              <Input
                autoComplete="name"
                maxLength={80}
                disabled={isAnonymous}
                value={donorName}
                onChange={onDonorNameChange}
              />
            </Field>
          ) : null}

          <Field
            label={t("donorEmail")}
            description={t("emailReceiptHint")}
            error={fieldErrors.donorEmail}
          >
            <Input
              type="email"
              autoComplete="email"
              maxLength={254}
              value={donorEmail}
              onChange={onDonorEmailChange}
            />
          </Field>

          {collectMessage ? (
            <Field label={t("donorMessage")} error={fieldErrors.message}>
              <Textarea
                rows={3}
                resizable={false}
                maxLength={500}
                placeholder={t("donorMessagePlaceholder")}
                value={message}
                onChange={onMessageChange}
              />
            </Field>
          ) : null}

          {collectDonorName ? (
            <Field orientation="horizontal" label={t("donateAnonymously")}>
              <Checkbox
                checked={isAnonymous}
                onCheckedChange={onAnonymousChange}
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
              onChange={onWebsiteChange}
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
