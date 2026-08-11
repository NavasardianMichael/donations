"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

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
import { signUpAction } from "@/server/actions/auth";
import {
  passwordStrength,
  signUpSchema,
  type SignUpInput,
} from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

const STRENGTH_STYLES = [
  "bg-strong",
  "bg-danger",
  "bg-warning",
  "bg-success",
  "bg-success",
] as const;

function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const { score, label } = passwordStrength(password);

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
        Password strength: {label}
      </p>
    </div>
  );
}

export function SignUpForm({ callbackUrl }: { callbackUrl?: string }) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", website: "" },
  });

  // `useWatch` rather than `watch()` — the latter returns a fresh function
  // each render, which the React Compiler cannot memoize safely.
  const password = useWatch({ control, name: "password" }) ?? "";

  function onSubmit(values: SignUpInput) {
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
  }

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
          Check your inbox
        </Heading>
        <Text variant="muted" size="sm">
          We sent a confirmation link to{" "}
          <span className="font-medium text-fg">{sentTo}</span>. Click it to
          finish setting up your account.
        </Text>
        <Text variant="faint" size="xs">
          Nothing after a minute or two? Check your spam folder.
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GoogleButton
        callbackUrl={callbackUrl ?? "/dashboard"}
        label="Sign up with Google"
      />

      <SeparatorWithLabel>or</SeparatorWithLabel>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

        <Field label="Name" error={errors.name?.message} required>
          <Input
            autoComplete="name"
            placeholder="Alex Smith"
            {...register("name")}
          />
        </Field>

        <Field label="Email" error={errors.email?.message} required>
          <Input
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            {...register("email")}
          />
        </Field>

        <div>
          <Field
            label="Password"
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
          <StrengthMeter password={password} />
        </div>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Create account
        </Button>
      </form>
    </div>
  );
}
