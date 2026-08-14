"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useMemo,
  useState,
  useTransition,
  useCallback,
  type SubmitEventHandler,
} from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";

import { GoogleButton } from "@/components/auth/google-button";
import {
  Alert,
  Button,
  Field,
  Heading,
  Input,
  SeparatorWithLabel,
  Text,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { resolver } from "@/lib/validations/resolver";
import {
  passwordStrength,
  signUpSchema,
  type SignUpInput,
} from "@/lib/validations/auth";
import { signUpAction } from "@/server/actions/auth";

const STRENGTH_STYLES = [
  "bg-strong",
  "bg-danger",
  "bg-warning",
  "bg-success",
  "bg-success",
] as const;

function StrengthMeter({ password }: { password: string }) {
  const t = useTranslations("auth.strength");

  if (!password) return null;

  const { score, key } = passwordStrength(password);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? STRENGTH_STYLES[score] : "bg-surface-active",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {t("label", { level: t(key) })}
      </p>
    </div>
  );
}

export function SignUpForm({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");

  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const schema = useMemo(
    () => signUpSchema(resolver(tValidation)),
    [tValidation],
  );

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      website: "",
    },
  });

  // `useWatch` rather than `watch()` — the latter returns a fresh function
  // each render, which the React Compiler cannot memoize safely.
  const password = useWatch({ control, name: "password" }) ?? "";

  const onSubmit: SubmitHandler<SignUpInput> = useCallback(
    (values) => {
      setFormError(null);

      startTransition(async () => {
        const result = await signUpAction(values);

        if (!result.ok) {
          if (result.fieldErrors) {
            for (const [name, message] of Object.entries(result.fieldErrors)) {
              setError(name as keyof SignUpInput, { message });
            }
          }
          setFormError(result.message);
          return;
        }

        setSentTo(result.data.email);
      });
    },
    [setError],
  );

  const onFormSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      void handleSubmit(onSubmit)(event);
    },
    [handleSubmit, onSubmit],
  );

  /**
   * Success is deliberately identical whether or not the address was already
   * registered — the server decides what mail to send, and the UI must not
   * leak which branch it took.
   */
  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-subtle">
          <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
        </span>
        <Heading level={2} size="md">
          {t("signup.checkInbox")}
        </Heading>
        <Text variant="muted" size="sm">
          {t.rich("signup.confirmationSent", {
            email: () => <span className="font-medium text-fg">{sentTo}</span>,
          })}
        </Text>
        <Text variant="faint" size="xs">
          {t("signup.checkSpam")}
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GoogleButton
        callbackUrl={callbackUrl ?? "/dashboard"}
        label={t("signup.googleLabel")}
      />

      <SeparatorWithLabel>{tCommon("or")}</SeparatorWithLabel>

      <form onSubmit={onFormSubmit} noValidate className="space-y-4">
        {formError ? (
          <Alert variant="danger" icon={false}>
            {formError}
          </Alert>
        ) : null}

        {/* Honeypot. Hidden from sight, from the a11y tree, and from tab order. */}
        <div
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
        >
          <label htmlFor="website">Leave this field empty</label>
          <input
            id="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("website")}
          />
        </div>

        <Field label={t("fields.name")} error={errors.name?.message} required>
          <Input
            autoComplete="name"
            maxLength={80}
            placeholder={t("fields.namePlaceholder")}
            {...register("name")}
          />
        </Field>

        <Field label={t("fields.email")} error={errors.email?.message} required>
          <Input
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder={t("fields.emailPlaceholder")}
            {...register("email")}
          />
        </Field>

        <div>
          <Field
            label={t("fields.password")}
            error={errors.password?.message}
            description={t("fields.passwordHint")}
            required
          >
            <Input
              type="password"
              autoComplete="new-password"
              maxLength={200}
              placeholder="••••••••••"
              {...register("password")}
            />
          </Field>
          <StrengthMeter password={password} />
        </div>

        <Field
          label={t("fields.confirmPassword")}
          error={errors.confirmPassword?.message}
          required
        >
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••••"
            {...register("confirmPassword")}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          {t("signup.submit")}
        </Button>
      </form>
    </div>
  );
}
