"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useState,
  type ChangeEventHandler,
  type ComponentProps,
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
  RadioGroup,
  RadioOption,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  toast,
} from "@/components/ui";
import { currencyMeta } from "@/lib/currency";
import { amountBounds } from "@/lib/fees";
import { formatMoney, formatMoneyPlain, parseMoneyToMinor } from "@/lib/utils";
import {
  PAYOUT_BANKS,
  payoutSettingsSchema,
  type PayoutMethod,
  type PayoutSchedule,
} from "@/lib/validations/payout";
import { resolver } from "@/lib/validations/resolver";
import { zodFieldErrors } from "@/server/actions/types";

/**
 * Payout destination and cadence.
 *
 * Everything here is live: the fields accept input, the schema runs, the errors
 * are real. The one thing that does not happen is persistence — there is no
 * payout table and no Server Action, so a valid submit reports that payouts are
 * not switched on yet instead of pretending to save.
 *
 * Nothing is disabled to convey that. A disabled form says "not for you"; a form
 * that validates and then tells you why it cannot finish says "not yet". When
 * payouts land, `onSubmit` calls an action and the rest of this file is done.
 */
export function PayoutSettingsForm({ currency }: { currency: string }) {
  const t = useTranslations("payouts");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");

  const bounds = amountBounds(currency);
  const symbol = currencyMeta(currency).symbol;

  const [method, setMethod] = useState<PayoutMethod>("BANK");
  const [accountHolder, setAccountHolder] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [schedule, setSchedule] = useState<PayoutSchedule>("MONTHLY");
  const [thresholdText, setThresholdText] = useState(
    formatMoneyPlain(bounds.minMinor, currency),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onMethodChange: NonNullable<
    ComponentProps<typeof RadioGroup>["onValueChange"]
  > = useCallback((value) => {
    setMethod(value as PayoutMethod);
  }, [setMethod]);

  const onScheduleChange: NonNullable<
    ComponentProps<typeof RadioGroup>["onValueChange"]
  > = useCallback((value) => {
    setSchedule(value as PayoutSchedule);
  }, [setSchedule]);

  const onBankChange: NonNullable<
    ComponentProps<typeof Select>["onValueChange"]
  > = useCallback((value) => {
    setBank(value);
  }, [setBank]);

  const onAccountHolderChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setAccountHolder(event.target.value);
  }, [setAccountHolder]);

  const onAccountNumberChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setAccountNumber(event.target.value);
  }, [setAccountNumber]);

  const onCardNumberChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setCardNumber(event.target.value);
  }, [setCardNumber]);

  const onTaxIdChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> =
    useCallback((event) => {
      setTaxId(event.target.value);
    }, [setTaxId]);

  const onThresholdChange: ChangeEventHandler<
    HTMLInputElement,
    HTMLInputElement
  > = useCallback((event) => {
    setThresholdText(event.target.value);
  }, [setThresholdText]);

  const onSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      setFormError(null);
      setFieldErrors({});

      // The threshold is typed in whole drams and stored in minor units, like
      // every other amount. `null` means it was not a clean money value.
      const thresholdMinor = parseMoneyToMinor(thresholdText, currency);
      if (thresholdMinor === null) {
        setFieldErrors({ thresholdMinor: tv("amount.whole") });
        return;
      }

      const schema = payoutSettingsSchema(
        resolver(tv),
        formatMoney(bounds.minMinor, currency),
        bounds,
      );

      const parsed = schema.safeParse({
        method,
        accountHolder,
        bank,
        accountNumber,
        cardNumber,
        taxId,
        schedule,
        thresholdMinor,
      });

      if (!parsed.success) {
        setFieldErrors(zodFieldErrors(parsed.error.issues));
        setFormError(tv("checkFields"));
        return;
      }

      // The only step that is not built. Everything above it is.
      toast.info(t("notAvailableTitle"), { description: tc("comingSoon") });
    },
    [
      accountHolder,
      accountNumber,
      bank,
      bounds,
      cardNumber,
      currency,
      method,
      schedule,
      t,
      taxId,
      tc,
      thresholdText,
      tv,
    ],
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError ? <Alert variant="danger">{formError}</Alert> : null}

      <Card>
        <CardHeader bordered>
          <div>
            <CardTitle>{t("methodTitle")}</CardTitle>
            <Text size="sm" variant="muted" className="mt-1">
              {t("methodDescription")}
            </Text>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          {/* The card title is the group's visible name, so the group is
              labelled by reference rather than repeating it in a legend. */}
          <RadioGroup
            value={method}
            onValueChange={onMethodChange}
            aria-label={t("methodTitle")}
          >
            <RadioOption value="BANK" description={t("methodBankHint")}>
              {t("methodBank")}
            </RadioOption>
            <RadioOption value="CARD" description={t("methodCardHint")}>
              {t("methodCard")}
            </RadioOption>
          </RadioGroup>

          <Field
            label={t("accountHolder")}
            description={t("accountHolderHint")}
            error={fieldErrors.accountHolder}
            required
          >
            <Input
              maxLength={80}
              autoComplete="name"
              value={accountHolder}
              onChange={onAccountHolderChange}
            />
          </Field>

          <Field label={t("bank")} error={fieldErrors.bank} required>
            <Select value={bank} onValueChange={onBankChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("bankPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_BANKS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {t(`banks.${id}`)}
                  </SelectItem>
                ))}
                <SelectItem value="other">{t("bankOther")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Only the destination the chosen method uses — the schema requires
              exactly the one that is on screen. */}
          {method === "BANK" ? (
            <Field
              label={t("accountNumber")}
              description={t("accountNumberHint")}
              error={fieldErrors.accountNumber}
              required
            >
              <Input
                inputMode="numeric"
                autoComplete="off"
                maxLength={19}
                placeholder="1234567890123456"
                value={accountNumber}
                onChange={onAccountNumberChange}
              />
            </Field>
          ) : (
            <Field
              label={t("cardNumber")}
              description={t("cardNumberHint")}
              error={fieldErrors.cardNumber}
              required
            >
              <Input
                inputMode="numeric"
                autoComplete="off"
                maxLength={19}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={onCardNumberChange}
              />
            </Field>
          )}

          <Field
            label={t("taxId")}
            description={t("taxIdHint")}
            error={fieldErrors.taxId}
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              placeholder="12345678"
              value={taxId}
              onChange={onTaxIdChange}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader bordered>
          <div>
            <CardTitle>{t("scheduleTitle")}</CardTitle>
            <Text size="sm" variant="muted" className="mt-1">
              {t("scheduleDescription")}
            </Text>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          <RadioGroup
            value={schedule}
            onValueChange={onScheduleChange}
            aria-label={t("scheduleTitle")}
          >
            <RadioOption value="MONTHLY" description={t("scheduleMonthlyHint")}>
              {t("scheduleMonthly")}
            </RadioOption>
            <RadioOption value="WEEKLY" description={t("scheduleWeeklyHint")}>
              {t("scheduleWeekly")}
            </RadioOption>
            <RadioOption value="MANUAL" description={t("scheduleManualHint")}>
              {t("scheduleManual")}
            </RadioOption>
          </RadioGroup>

          <Field
            label={t("threshold")}
            description={t("thresholdHint")}
            error={fieldErrors.thresholdMinor}
          >
            <Input
              inputMode="numeric"
              leading={symbol}
              value={thresholdText}
              onChange={onThresholdChange}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{tc("saveChanges")}</Button>
      </div>
    </form>
  );
}
