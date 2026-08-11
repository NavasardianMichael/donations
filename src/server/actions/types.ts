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

export function rateLimited(retryAfter: number): ActionResult<never> {
  return {
    ok: false,
    message: `Too many attempts. Try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`,
    retryAfter,
  };
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
