"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useMemo,
  useState,
  useTransition,
  useCallback,
  type SubmitEventHandler,
} from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Alert, Button, Field, Heading, Input, Text } from "@/components/ui";
import { resolver } from "@/lib/validations/resolver";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { requestPasswordResetAction } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tValidation = useTranslations("validation");

  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const schema = useMemo(
    () => forgotPasswordSchema(resolver(tValidation)),
    [tValidation],
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit: SubmitHandler<ForgotPasswordInput> = useCallback((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setSent(true);
    });
  }, []);

  const onFormSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      void handleSubmit(onSubmit)(event);
    },
    [handleSubmit, onSubmit],
  );

  // Same confirmation regardless of whether the address exists.
  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-subtle">
          <MailCheck className="size-6 text-success" aria-hidden="true" />
        </span>
        <Heading level={2} size="md">
          {t("forgotPassword.checkInbox")}
        </Heading>
        <Text variant="muted" size="sm">
          {t.rich("forgotPassword.sentIfExists", {
            email: () => (
              <span className="font-medium text-fg">{getValues("email")}</span>
            ),
          })}
        </Text>
      </div>
    );
  }

  return (
    <form onSubmit={onFormSubmit} noValidate className="space-y-4">
      {formError ? (
        <Alert variant="danger" icon={false}>
          {formError}
        </Alert>
      ) : null}

      <Field
        label={t("fields.email")}
        error={errors.email?.message}
        description={t("forgotPassword.description")}
      >
        <Input
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder={t("fields.emailPlaceholder")}
          {...register("email")}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {t("forgotPassword.submit")}
      </Button>
    </form>
  );
}
