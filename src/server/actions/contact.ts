"use server";

import { getTranslations } from "next-intl/server";

import { BRAND } from "@/lib/brand";
import { contactReceiptEmail, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { contactSchema } from "@/lib/validations/donation";
import { resolver } from "@/lib/validations/resolver";

import {
  fail,
  ok,
  rateLimited,
  zodFieldErrors,
  type ActionResult,
} from "./types";

async function limiterMessage(retryAfter: number): Promise<string> {
  const t = await getTranslations("validation");
  return t("rateLimited", { seconds: retryAfter });
}

/**
 * Public contact form. Stores the submission, emails the team inbox, and
 * always returns success to the honeypot path so bots learn nothing.
 */
export async function contactAction(
  input: unknown,
): Promise<ActionResult<{ sent: boolean }>> {
  const tv = await getTranslations("validation");
  const te = await getTranslations("email");
  const tc = await getTranslations("contact");

  const parsed = contactSchema(resolver(tv)).safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { name, email, message, website } = parsed.data;

  if (website) return ok({ sent: true });

  const ip = await clientIp();
  const limit = await rateLimit("contact", ip);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(await limiterMessage(retryAfter), retryAfter);
  }

  const submission = await prisma.contactSubmission.create({
    data: {
      name,
      email,
      message,
    },
  });

  const to =
    process.env.CONTACT_EMAIL_TO || `support@${BRAND.domain}`;

  const delivery = await sendEmail(
    to,
    contactReceiptEmail({
      name,
      email,
      message,
      t: resolver(te),
    }),
  );

  if (delivery.sent) {
    await prisma.contactSubmission.update({
      where: { id: submission.id },
      data: { emailSent: true },
    });
  }

  return ok({ sent: delivery.sent }, tc("sentTitle"));
}
