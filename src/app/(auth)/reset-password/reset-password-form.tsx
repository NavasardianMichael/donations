"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, Button, Field, Input } from "@/components/ui";
import { resolver } from "@/lib/validations/resolver";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { resetPasswordAction } from "@/server/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tValidation = useTranslations("validation");

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const schema = useMemo(
    () => resetPasswordSchema(resolver(tValidation)),
    [tValidation],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(schema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  function onSubmit(values: ResetPasswordInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await resetPasswordAction(values);

      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            setError(name as keyof ResetPasswordInput, { message });
          }
        }
        // The token died between page load and submit. The server flags this
        // explicitly rather than the client sniffing the message text.
        if (result.tokenInvalid) setExpired(true);
        setFormError(result.message);
        return;
      }

      router.replace("/login?reset=1");
    });
  }

  if (expired) {
    return (
      <div className="space-y-4">
        <Alert variant="warning" title={t("resetPassword.linkInvalidTitle")}>
          {formError}
        </Alert>
        <Button asChild size="lg" fullWidth>
          <Link href="/forgot-password">{t("resetPassword.requestNew")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError ? (
        <Alert variant="danger" icon={false}>
          {formError}
        </Alert>
      ) : null}

      <input type="hidden" {...register("token")} />

      <Field
        label={t("resetPassword.newPassword")}
        error={errors.password?.message}
        description={t("fields.passwordHint")}
        required
      >
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          {...register("password")}
        />
      </Field>

      <Field
        label={t("resetPassword.confirmPassword")}
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
        {t("resetPassword.submit")}
      </Button>
    </form>
  );
}
