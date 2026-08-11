import { z } from "zod";

import type { MessageResolver } from "./resolver";

/**
 * Every schema is a factory taking a message resolver — see the note on
 * `MessageResolver` in ./slug. Nothing here hard-codes a user-facing string.
 */

export const emailSchema = (t: MessageResolver) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .min(1, t("email.required"))
    .email(t("email.invalid"))
    .max(254);

/**
 * Password strength is validated server-side, not just in the browser — the
 * signup Server Action is a public HTTP endpoint like any other.
 */
export const passwordSchema = (t: MessageResolver) =>
  z
    .string()
    .min(10, t("password.tooShort"))
    .max(200, t("password.tooLong"))
    .refine((v) => /[a-z]/.test(v), t("password.needsLowercase"))
    .refine((v) => /[A-Z]/.test(v), t("password.needsUppercase"))
    .refine((v) => /[0-9]/.test(v), t("password.needsNumber"))
    .refine(
      (v) => !/^(password|12345678|qwertyuiop|letmein|գաղտնաբառ)/i.test(v),
      t("password.tooCommon"),
    );

export const signUpSchema = (t: MessageResolver) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t("name.required"))
      .max(80, t("name.tooLong")),
    email: emailSchema(t),
    password: passwordSchema(t),
    /**
     * Honeypot. Deliberately permissive: if the schema rejected a filled
     * honeypot, the caller would get a validation error telling them which
     * field tripped. The action accepts and silently discards instead.
     */
    website: z.string().max(200).optional(),
  });

export const signInSchema = (t: MessageResolver) =>
  z.object({
    email: emailSchema(t),
    password: z.string().min(1, t("password.required")),
  });

export const forgotPasswordSchema = (t: MessageResolver) =>
  z.object({
    email: emailSchema(t),
  });

export const resetPasswordSchema = (t: MessageResolver) =>
  z
    .object({
      token: z.string().min(1),
      password: passwordSchema(t),
      confirmPassword: z.string().min(1, t("password.confirmRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("password.mismatch"),
      path: ["confirmPassword"],
    });

export const profileSchema = (t: MessageResolver) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t("name.required"))
      .max(80, t("name.tooLong")),
    bio: z
      .string()
      .trim()
      .max(300, t("bio.tooLong"))
      .optional()
      .or(z.literal("")),
    image: z.string().url(t("url.invalid")).optional().or(z.literal("")),
  });

export type SignUpInput = z.infer<ReturnType<typeof signUpSchema>>;
export type SignInInput = z.infer<ReturnType<typeof signInSchema>>;
export type ForgotPasswordInput = z.infer<
  ReturnType<typeof forgotPasswordSchema>
>;
export type ResetPasswordInput = z.infer<
  ReturnType<typeof resetPasswordSchema>
>;
export type ProfileInput = z.infer<ReturnType<typeof profileSchema>>;

/**
 * Coarse strength meter for the signup form. Purely presentational — the
 * schema above is what actually gates submission. Returns a key, not a label,
 * so the caller translates it.
 */
export type StrengthKey = "tooShort" | "weak" | "fair" | "good" | "strong";

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  key: StrengthKey;
} {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const keys: StrengthKey[] = ["tooShort", "weak", "fair", "good", "strong"];

  return { score: clamped, key: keys[clamped]! };
}
