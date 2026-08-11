/**
 * Plain HTML email templates.
 *
 * Deliberately hand-written rather than component-rendered: email clients
 * support a 1998 subset of HTML, so tables and inline styles are the reliable
 * path, and there is nothing here complex enough to justify a render pipeline.
 */

const ACCENT = "#ff5722";
const FG = "#1a1c1c";
const MUTED = "#5d5f5f";
const BORDER = "#e0e0e0";
const CANVAS = "#f9f9f9";

function layout(options: {
  preheader: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const { preheader, heading, body, cta, footerNote } = options;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:4px;">
          <tr>
            <td style="padding:28px 32px 0;">
              <span style="font-size:20px;font-weight:700;color:#b02f00;letter-spacing:-0.01em;">GiveDirect</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <h1 style="margin:0;font-size:22px;line-height:30px;font-weight:700;color:${FG};letter-spacing:-0.01em;">${escapeHtml(heading)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0;font-size:15px;line-height:24px;color:${MUTED};">
              ${body}
            </td>
          </tr>
          ${
            cta
              ? `<tr>
            <td style="padding:24px 32px 0;">
              <a href="${cta.url}" style="display:inline-block;background:${ACCENT};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:4px;">${escapeHtml(cta.label)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;font-size:12px;line-height:18px;color:${MUTED};word-break:break-all;">
              Or paste this link into your browser:<br>
              <span style="color:#b02f00;">${cta.url}</span>
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:28px 32px 28px;">
              <div style="border-top:1px solid ${BORDER};padding-top:16px;font-size:12px;line-height:18px;color:${MUTED};">
                ${footerNote ? `${escapeHtml(footerNote)}<br><br>` : ""}
                You are receiving this because someone used this address on GiveDirect.
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function verificationEmail(options: {
  name: string | null;
  url: string;
}): EmailContent {
  const greeting = options.name ? `Hi ${escapeHtml(options.name)},` : "Hi,";

  return {
    subject: "Confirm your email address",
    html: layout({
      preheader: "One click and your GiveDirect account is ready.",
      heading: "Confirm your email",
      body: `<p style="margin:0 0 12px;">${greeting}</p>
             <p style="margin:0;">Confirm this address to finish setting up your GiveDirect account. The link expires in 24 hours.</p>`,
      cta: { label: "Confirm email", url: options.url },
      footerNote: "If you did not create an account, ignore this email.",
    }),
    text: `Confirm your email\n\nConfirm this address to finish setting up your GiveDirect account:\n${options.url}\n\nThe link expires in 24 hours. If you did not create an account, ignore this email.`,
  };
}

export function passwordResetEmail(options: {
  name: string | null;
  url: string;
}): EmailContent {
  const greeting = options.name ? `Hi ${escapeHtml(options.name)},` : "Hi,";

  return {
    subject: "Reset your password",
    html: layout({
      preheader: "Reset your GiveDirect password.",
      heading: "Reset your password",
      body: `<p style="margin:0 0 12px;">${greeting}</p>
             <p style="margin:0;">Use the link below to choose a new password. It expires in one hour and can only be used once.</p>`,
      cta: { label: "Choose a new password", url: options.url },
      footerNote:
        "If you did not request this, no action is needed — your password has not changed.",
    }),
    text: `Reset your password\n\nUse this link to choose a new password:\n${options.url}\n\nIt expires in one hour and can only be used once. If you did not request this, your password has not changed.`,
  };
}

export function contactReceiptEmail(options: {
  name: string;
  email: string;
  subject: string | null;
  message: string;
}): EmailContent {
  return {
    subject: `Contact form: ${options.subject || "No subject"}`,
    html: layout({
      preheader: `New message from ${options.name}`,
      heading: "New contact form submission",
      body: `<p style="margin:0 0 8px;"><strong style="color:${FG};">From:</strong> ${escapeHtml(options.name)} &lt;${escapeHtml(options.email)}&gt;</p>
             <p style="margin:0 0 16px;"><strong style="color:${FG};">Subject:</strong> ${escapeHtml(options.subject || "—")}</p>
             <p style="margin:0;white-space:pre-wrap;">${escapeHtml(options.message)}</p>`,
    }),
    text: `New contact form submission\n\nFrom: ${options.name} <${options.email}>\nSubject: ${options.subject || "—"}\n\n${options.message}`,
  };
}
