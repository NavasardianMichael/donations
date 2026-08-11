import "server-only";

import { Resend } from "resend";

import type { EmailContent } from "./templates";

export * from "./templates";

/**
 * Email delivery.
 *
 * Resend is optional in development: with no `RESEND_API_KEY` the message is
 * printed to the server console instead of being sent, so verification and
 * password-reset flows are fully testable without an account or a domain.
 *
 * Delivery failures never throw into the caller. An email that does not arrive
 * must not roll back the database write that triggered it — the caller decides
 * what to do with the returned `sent` flag.
 */

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export interface SendResult {
  sent: boolean;
  /** Set when delivery failed or was skipped, for logging and DB flags. */
  reason?: string;
}

export async function sendEmail(
  to: string,
  content: EmailContent,
): Promise<SendResult> {
  const from = process.env.EMAIL_FROM ?? "GiveDirect <noreply@example.com>";

  if (!resend) {
    console.info(
      [
        "",
        "──────────────────────────────────────────────────────────",
        " EMAIL NOT SENT — RESEND_API_KEY is not set",
        "──────────────────────────────────────────────────────────",
        ` To:      ${to}`,
        ` Subject: ${content.subject}`,
        "",
        content.text,
        "──────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { sent: false, reason: "no-api-key" };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (error) {
      console.error("Email delivery failed:", error.message);
      return { sent: false, reason: error.message };
    }

    return { sent: true };
  } catch (error) {
    console.error("Email delivery threw:", error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "unknown",
    };
  }
}
