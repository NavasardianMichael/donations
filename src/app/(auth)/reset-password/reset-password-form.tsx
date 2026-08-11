"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, Button, Field, Input } from "@/components/ui";
import { resetPasswordAction } from "@/server/actions/auth";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
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
        // The token died between page load and submit.
        if (/expired|no longer valid|already been used/.test(result.message)) {
          setExpired(true);
        }
        setFormError(result.message);
        return;
      }

      router.replace("/login?reset=1");
    });
  }

  if (expired) {
    return (
      <div className="space-y-4">
        <Alert variant="warning" title="This link is no longer valid">
          {formError}
        </Alert>
        <Button asChild size="lg" fullWidth>
          <Link href="/forgot-password">Request a new link</Link>
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
        label="New password"
        error={errors.password?.message}
        description="At least 10 characters, with upper and lower case and a number."
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
        label="Confirm new password"
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
        Change password
      </Button>
    </form>
  );
}
