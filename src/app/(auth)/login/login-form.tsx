"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { GoogleButton } from "@/components/auth/google-button";
import {
  Alert,
  Button,
  Field,
  Input,
  SeparatorWithLabel,
} from "@/components/ui";
import { signInAction } from "@/server/actions/auth";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
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

      <SeparatorWithLabel>or</SeparatorWithLabel>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError ? (
          <Alert variant="danger" icon={false}>
            {formError}
          </Alert>
        ) : null}

        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            {...register("email")}
          />
        </Field>

        <Field
          label="Password"
          error={errors.password?.message}
          hint={
            <Link
              href="/forgot-password"
              className="font-medium text-brand hover:underline"
            >
              Forgot password?
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
          Log in
        </Button>
      </form>
    </div>
  );
}
