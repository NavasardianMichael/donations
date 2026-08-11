/**
 * The shape every Server Action returns.
 *
 * Actions never throw at the client. They return a discriminated result so the
 * form can render field errors inline and a top-level message above the
 * submit button, without a try/catch at every call site.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      message: string;
      /** Keyed by form field name. */
      fieldErrors?: Record<string, string>;
      /** Set when the caller was rate limited, in seconds. */
      retryAfter?: number;
      /**
       * The one-time token backing this form is dead — expired, already used,
       * or never issued. A flag, not a string match: the message is localised
       * and sniffing its text would break the moment it is translated.
       */
      tokenInvalid?: boolean;
    };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

/** A dead one-time token. The form swaps to a "request a new link" state. */
export function failTokenInvalid(message: string): ActionResult<never> {
  return { ok: false, message, tokenInvalid: true };
}

/**
 * The message must be supplied by the caller — it comes from the translation
 * catalogue, and this module has no access to a translator.
 */
export function rateLimited(
  message: string,
  retryAfter: number,
): ActionResult<never> {
  return { ok: false, message, retryAfter };
}

/** Flatten a Zod error into the `fieldErrors` shape. */
export function zodFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "_");
    errors[key] ??= issue.message;
  }
  return errors;
}
