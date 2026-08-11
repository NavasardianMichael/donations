"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, Button, Field, Heading, Input, Text } from "@/components/ui";
import { requestPasswordResetAction } from "@/server/actions/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setSent(true);
    });
  }

  // Same confirmation regardless of whether the address exists.
  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-subtle">
          <MailCheck className="size-6 text-success" aria-hidden="true" />
        </span>
        <Heading level={2} size="md">
          Check your inbox
        </Heading>
        <Text variant="muted" size="sm">
          If <span className="font-medium text-fg">{getValues("email")}</span>{" "}
          has an account, a reset link is on its way. It expires in one hour.
        </Text>
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

      <Field
        label="Email"
        error={errors.email?.message}
        description="We'll send a link to choose a new password."
      >
        <Input
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          {...register("email")}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}
