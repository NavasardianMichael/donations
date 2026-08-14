import { BRAND } from "@/lib/brand";
import { escapeHtml } from "@/lib/utils";
import type { MessageResolver } from "@/lib/validations/resolver";

/**
 * Plain HTML email templates.
 *
 * Deliberately hand-written rather than component-rendered: email clients
 * support a 1998 subset of HTML, so tables and inline styles are the reliable
 * path, and there is nothing here complex enough to justify a render pipeline.
 *
 * Every template takes a translator. Nothing in this file is a user-facing
 * string, so a second language needs no changes here.
 */

export type EmailTranslator = MessageResolver;

const ACCENT = "#ff5722";
const FG = "#1a1c1c";
const MUTED = "#5d5f5f";
const BORDER = "#e0e0e0";
const CANVAS = "#f9f9f9";

/**
 * A serif stack, to echo GHEA Grapalat. Custom web fonts are unreliable in
 * mail clients, so we do not try — Armenian renders fine in the system serif.
 */
const FONT_STACK = "Georgia, 'Times New Roman', Times, serif";

function layout(options: {
  preheader: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
  footerNote?: string;
  orPasteLabel: string;
  whyReceiving: string;
}): string {
  const {
    preheader,
    heading,
    body,
    cta,
    footerNote,
    orPasteLabel,
    whyReceiving,
  } = options;

  return `<!doctype html>
<html lang="hy" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:${FONT_STACK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:4px;">
          <tr>
            <td style="padding:28px 32px 0;">
              <span style="font-size:22px;font-weight:700;color:#b02f00;letter-spacing:-0.01em;">${escapeHtml(BRAND.name)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <h1 style="margin:0;font-size:22px;line-height:32px;font-weight:700;color:${FG};">${escapeHtml(heading)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0;font-size:15px;line-height:26px;color:${MUTED};">
              ${body}
            </td>
          </tr>
          ${
            cta
              ? `<tr>
            <td style="padding:24px 32px 0;">
              <a href="${escapeHtml(cta.url)}" style="display:inline-block;background:${ACCENT};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:4px;">${escapeHtml(cta.label)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;font-size:12px;line-height:20px;color:${MUTED};word-break:break-all;">
              ${escapeHtml(orPasteLabel)}<br>
              <span style="color:#b02f00;">${escapeHtml(cta.url)}</span>
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:28px 32px 28px;">
              <div style="border-top:1px solid ${BORDER};padding-top:16px;font-size:12px;line-height:20px;color:${MUTED};">
                ${footerNote ? `${escapeHtml(footerNote)}<br><br>` : ""}
                ${escapeHtml(whyReceiving)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface TemplateOptions {
  name: string | null;
  url: string;
  t: EmailTranslator;
}

function greeting(t: EmailTranslator, name: string | null): string {
  return name ? t("greetingNamed", { name }) : t("greetingAnonymous");
}

export function verificationEmail({
  name,
  url,
  t,
}: TemplateOptions): EmailContent {
  const heading = t("verify.heading");
  const body = t("verify.body", { brand: BRAND.name });
  const hello = greeting(t, name);

  return {
    subject: t("verify.subject"),
    html: layout({
      preheader: t("verify.preheader"),
      heading,
      body: `<p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
             <p style="margin:0;">${escapeHtml(body)}</p>`,
      cta: { label: t("verify.cta"), url },
      footerNote: t("verify.footer"),
      orPasteLabel: t("orPasteLink"),
      whyReceiving: t("whyReceiving", { brand: BRAND.name }),
    }),
    text: `${heading}\n\n${hello}\n${body}\n\n${url}\n\n${t("verify.footer")}`,
  };
}

export function passwordResetEmail({
  name,
  url,
  t,
}: TemplateOptions): EmailContent {
  const heading = t("reset.heading");
  const body = t("reset.body");
  const hello = greeting(t, name);

  return {
    subject: t("reset.subject"),
    html: layout({
      preheader: t("reset.preheader", { brand: BRAND.name }),
      heading,
      body: `<p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
             <p style="margin:0;">${escapeHtml(body)}</p>`,
      cta: { label: t("reset.cta"), url },
      footerNote: t("reset.footer"),
      orPasteLabel: t("orPasteLink"),
      whyReceiving: t("whyReceiving", { brand: BRAND.name }),
    }),
    text: `${heading}\n\n${hello}\n${body}\n\n${url}\n\n${t("reset.footer")}`,
  };
}

export function contactReceiptEmail(options: {
  name: string;
  email: string;
  message: string;
  t: EmailTranslator;
}): EmailContent {
  const { name, email, message, t } = options;
  const heading = t("contactReceipt.heading");

  return {
    subject: t("contactReceipt.subject", { name }),
    html: layout({
      preheader: `${name} <${email}>`,
      heading,
      body: `<p style="margin:0 0 16px;"><strong style="color:${FG};">${escapeHtml(t("contactReceipt.from"))}:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
             <p style="margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>`,
      orPasteLabel: t("orPasteLink"),
      whyReceiving: t("whyReceiving", { brand: BRAND.name }),
    }),
    text: `${heading}\n\n${t("contactReceipt.from")}: ${name} <${email}>\n\n${message}`,
  };
}

export function donationReceiptEmail(options: {
  donorName: string | null;
  amountFormatted: string;
  pageTitle: string;
  pageUrl: string;
  cardMask: string | null;
  t: EmailTranslator;
}): EmailContent {
  const { donorName, amountFormatted, pageTitle, pageUrl, cardMask, t } =
    options;
  const hello = donorName
    ? t("greetingNamed", { name: donorName })
    : t("greetingAnonymous");
  const heading = t("receipt.heading");
  const body = t("receipt.body", { amount: amountFormatted, title: pageTitle });

  return {
    subject: t("receipt.subject", { amount: amountFormatted }),
    html: layout({
      preheader: t("receipt.preheader", { brand: BRAND.name }),
      heading,
      body: `<p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
             <p style="margin:0 0 16px;">${escapeHtml(body)}</p>
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};">
               <tr>
                 <td style="padding:10px 0;color:${MUTED};">${escapeHtml(t("receipt.amountLabel"))}</td>
                 <td style="padding:10px 0;text-align:right;font-weight:700;color:${FG};">${escapeHtml(amountFormatted)}</td>
               </tr>
               ${
                 cardMask
                   ? `<tr>
                 <td style="padding:10px 0;color:${MUTED};">${escapeHtml(t("receipt.cardLabel"))}</td>
                 <td style="padding:10px 0;text-align:right;color:${FG};">${escapeHtml(cardMask)}</td>
               </tr>`
                   : ""
               }
             </table>`,
      cta: { label: t("receipt.cta"), url: pageUrl },
      orPasteLabel: t("orPasteLink"),
      whyReceiving: t("whyReceiving", { brand: BRAND.name }),
    }),
    text: `${heading}\n\n${hello}\n${body}\n\n${t("receipt.amountLabel")}: ${amountFormatted}\n\n${pageUrl}`,
  };
}

export function creatorNotificationEmail(options: {
  creatorName: string | null;
  donorLabel: string;
  amountFormatted: string;
  pageTitle: string;
  dashboardUrl: string;
  message: string | null;
  t: EmailTranslator;
}): EmailContent {
  const {
    creatorName,
    donorLabel,
    amountFormatted,
    pageTitle,
    dashboardUrl,
    message,
    t,
  } = options;
  const hello = creatorName
    ? t("greetingNamed", { name: creatorName })
    : t("greetingAnonymous");
  const heading = t("creatorNotification.heading", { amount: amountFormatted });
  const body = t("creatorNotification.body", {
    donor: donorLabel,
    amount: amountFormatted,
    title: pageTitle,
  });

  return {
    subject: t("creatorNotification.subject", { amount: amountFormatted }),
    html: layout({
      preheader: t("creatorNotification.preheader", { brand: BRAND.name }),
      heading,
      body: `<p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
             <p style="margin:0 0 16px;">${escapeHtml(body)}</p>
             ${
               message
                 ? `<blockquote style="margin:0;padding:12px 16px;border-left:3px solid ${ACCENT};background:${CANVAS};color:${FG};font-style:italic;">${escapeHtml(message)}</blockquote>`
                 : ""
             }`,
      cta: { label: t("creatorNotification.cta"), url: dashboardUrl },
      orPasteLabel: t("orPasteLink"),
      whyReceiving: t("whyReceiving", { brand: BRAND.name }),
    }),
    text: `${heading}\n\n${hello}\n${body}${message ? `\n\n"${message}"` : ""}\n\n${dashboardUrl}`,
  };
}
