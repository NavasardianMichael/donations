import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .max(254);

/**
 * Password strength is validated server-side, not just in the browser — the
 * signup Server Action is a public HTTP endpoint like any other.
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.")
  .refine((v) => /[a-z]/.test(v), "Include a lowercase letter.")
  .refine((v) => /[A-Z]/.test(v), "Include an uppercase letter.")
  .refine((v) => /[0-9]/.test(v), "Include a number.")
  .refine(
    (v) => !/^(password|12345678|qwertyuiop|letmein)/i.test(v),
    "That password is too common.",
  );

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(80, "That name is too long."),
  email: emailSchema,
  password: passwordSchema,
  /**
   * Honeypot. Real users never fill this; bots usually do.
   *
   * Deliberately permissive: if the schema rejected a filled honeypot, the
   * caller would get a validation error telling them which field tripped.
   * The action accepts the submission and silently discards it instead.
   */
  website: z.string().max(200).optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  bio: z
    .string()
    .trim()
    .max(300, "Keep your bio under 300 characters.")
    .optional()
    .or(z.literal("")),
  image: z
    .string()
    .url("Enter a valid image URL.")
    .optional()
    .or(z.literal("")),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * Coarse strength meter for the signup form. Purely presentational — the
 * schema above is what actually gates submission.
 */
export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return {
    score: clamped,
    label: ["Too short", "Weak", "Fair", "Good", "Strong"][clamped]!,
  };
}
