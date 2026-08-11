"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { GoogleButton } from "@/components/auth/google-button";
import {
  Alert,
  Button,
  Field,
  Input,
  SeparatorWithLabel,
} from "@/components/ui";
import { resolver } from "@/lib/validations/resolver";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { signInAction } from "@/server/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // The schema is a factory over the translator, so validation messages are
  // localised without a single hard-coded string in lib/validations.
  const schema = useMemo(
    () => signInSchema(resolver(tValidation)),
    [tValidation],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignInInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await signInAction(values, callbackUrl);

      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            setError(name as keyof SignInInput, { message });
          }
        }
        setFormError(result.message);
        return;
      }

      // Server Action set the cookie; refresh so the RSC tree sees the session.
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <GoogleButton callbackUrl={callbackUrl ?? "/dashboard"} />

      <SeparatorWithLabel>{tCommon("or")}</SeparatorWithLabel>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError ? (
          <Alert variant="danger" icon={false}>
            {formError}
          </Alert>
        ) : null}

        <Field label={t("fields.email")} error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder={t("fields.emailPlaceholder")}
            {...register("email")}
          />
        </Field>

        <Field
          label={t("fields.password")}
          error={errors.password?.message}
          hint={
            <Link
              href="/forgot-password"
              className="font-medium text-brand hover:underline"
            >
              {t("login.forgotPassword")}
            </Link>
          }
        >
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          {t("login.submit")}
        </Button>
      </form>
    </div>
  );
}
