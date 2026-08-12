"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  Alert,
  Button,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import { resolver } from "@/lib/validations/resolver";
import {
  contactSchema,
  type ContactInput,
} from "@/lib/validations/donation";
import { contactAction } from "@/server/actions/contact";

export function ContactForm() {
  const t = useTranslations("contact");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");

  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const schema = useMemo(
    () => contactSchema(resolver(tValidation)),
    [tValidation],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      website: "",
    },
  });

  function onSubmit(values: ContactInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await contactAction(values);

      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            setError(name as keyof ContactInput, { message });
          }
        }
        setFormError(result.message);
        return;
      }

      setSent(true);
    });
  }

  if (sent) {
    return (
      <Alert variant="success" title={t("sentTitle")}>
        {t("sentBody")}
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {formError ? <Alert variant="danger">{formError}</Alert> : null}

      <Field label={t("name")} error={errors.name?.message} required>
        <Input
          autoComplete="name"
          disabled={pending}
          {...register("name")}
        />
      </Field>

      <Field label={t("email")} error={errors.email?.message} required>
        <Input
          type="email"
          autoComplete="email"
          disabled={pending}
          {...register("email")}
        />
      </Field>

      <Field
        label={t("subject")}
        error={errors.subject?.message}
        hint={tCommon("optional")}
      >
        <Input disabled={pending} {...register("subject")} />
      </Field>

      <Field label={t("message")} error={errors.message?.message} required>
        <Textarea rows={6} disabled={pending} {...register("message")} />
      </Field>

      {/* Honeypot — hidden from humans, filled by naive bots. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}
