import "server-only";

/**
 * ArCa (Armenian Card) hosted-checkout client.
 *
 * ArCa runs the BPC/RBS "iPay" REST gateway — the same family used by many
 * post-Soviet acquiring banks, just branded per country. Credentials
 * (`userName`/`password`) are issued by the merchant's ACQUIRING BANK
 * (Ameriabank, ACBA, Inecobank, …), not by ArCa itself; there is no public
 * self-serve signup.
 *
 * Flow, all server-to-server except the redirect:
 *
 *   1. `register()` — POST register.do with the order. Get back `orderId`
 *      (ArCa's id) and `formUrl` (where the donor enters card details).
 *   2. Redirect the donor's browser to `formUrl`.
 *   3. ArCa redirects back to our `returnUrl`/`failUrl` — this tells us
 *      NOTHING trustworthy, only that the browser came back. See the return
 *      route for why.
 *   4. `getOrderStatus()` — POST getOrderStatusExtended.do, server-to-server,
 *      to learn what actually happened. This call is the only source of
 *      truth and is safe to repeat (idempotent read).
 *
 * Reference (BPC/RBS REST spec, the family ArCa runs on):
 * https://dev.bpcbt.com/integration/api/scripts.html
 */

const HOSTS = {
  test: "https://ipaytest.arca.am:8445/payment/rest/",
  production: "https://ipay.arca.am/payment/rest/",
} as const;

/** `orderStatus` from getOrderStatusExtended.do. Documented meanings. */
export const ARCA_ORDER_STATUS = {
  /** Registered, not yet paid. */
  CREATED: 0,
  /** Held, awaiting capture (two-stage payments — unused here). */
  APPROVED: 1,
  /** Deposited: the charge succeeded. This is the only "money moved" state. */
  DEPOSITED: 2,
  REVERSED: 3,
  REFUNDED: 4,
  /** 3-D Secure authentication started but not completed. */
  ACS_AUTH_PENDING: 5,
  AUTH_DECLINED: 6,
} as const;

export type ArcaOrderStatus =
  (typeof ARCA_ORDER_STATUS)[keyof typeof ARCA_ORDER_STATUS];

export class ArcaError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
  ) {
    super(message);
    this.name = "ArcaError";
  }
}

/** True once credentials are present. Every caller must check this first. */
export function isArcaConfigured(): boolean {
  return Boolean(process.env.ARCA_USERNAME && process.env.ARCA_PASSWORD);
}

function credentials(): { userName: string; password: string } {
  const userName = process.env.ARCA_USERNAME;
  const password = process.env.ARCA_PASSWORD;
  if (!userName || !password) {
    throw new Error(
      "ArCa is not configured (ARCA_USERNAME / ARCA_PASSWORD missing). " +
        "Check isArcaConfigured() before calling into this module.",
    );
  }
  return { userName, password };
}

function baseUrl(): string {
  const env = process.env.ARCA_ENV === "production" ? "production" : "test";
  return HOSTS[env];
}

/**
 * The gateway responds 200 with `{ errorCode, errorMessage }` even on
 * failure — HTTP status is not the signal. `errorCode === "0"` is success.
 */
async function post<T extends { errorCode?: string; errorMessage?: string }>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...credentials(), ...params })) {
    if (value !== undefined) body.set(key, String(value));
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    // This is a payment call; never let a stale response serve as a decision.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ArcaError(
      `ArCa returned HTTP ${response.status} from ${path}`,
      "http_error",
    );
  }

  const data = (await response.json()) as T;

  // errorCode "0" (or absent, on some gateway builds) is success. Anything
  // else — including "5" (Access denied) — is a real failure to surface.
  if (data.errorCode && data.errorCode !== "0") {
    throw new ArcaError(
      data.errorMessage ?? `ArCa error ${data.errorCode}`,
      data.errorCode,
    );
  }

  return data;
}

export interface RegisterOrderInput {
  /** Our Donation.id. Must be unique per attempt — see the retry note below. */
  orderNumber: string;
  /** Integer minor units (luma for AMD) — never a float. */
  amountMinor: number;
  /** ISO 4217 numeric currency code as a string, e.g. "051" for AMD. */
  currency: string;
  returnUrl: string;
  failUrl: string;
  description: string;
  /** ISO 639-1. ArCa's hosted page localizes its own chrome from this. */
  language?: "hy" | "ru" | "en";
  /** Surfaced back to us in webhooks/lookups; we set it to the Donation id. */
  clientId?: string;
}

export interface RegisterOrderResult {
  /** ArCa's own order id — store this, it is what getOrderStatus needs. */
  orderId: string;
  /** Send the donor's browser here. */
  formUrl: string;
}

/**
 * Register a new order and get the hosted checkout URL.
 *
 * `orderNumber` must be unique per ATTEMPT, not per donation — if a donor's
 * card is declined and they retry, that is a new `orderNumber` with a fresh
 * Donation row, never a re-registration of the same one. ArCa rejects a
 * reused `orderNumber` outright, which is a feature: it stops a network retry
 * from silently registering the same donation twice.
 */
export async function registerOrder(
  input: RegisterOrderInput,
): Promise<RegisterOrderResult> {
  const result = await post<{
    errorCode?: string;
    errorMessage?: string;
    orderId: string;
    formUrl: string;
  }>("register.do", {
    orderNumber: input.orderNumber,
    amount: input.amountMinor,
    currency: input.currency,
    returnUrl: input.returnUrl,
    failUrl: input.failUrl,
    description: input.description.slice(0, 598),
    language: input.language ?? "hy",
    clientId: input.clientId,
    // Skip ArCa's own intermediate confirmation page — take the donor
    // straight to card entry, then straight back to us.
    pageView: "DESKTOP",
  });

  return { orderId: result.orderId, formUrl: result.formUrl };
}

export interface OrderStatusResult {
  orderStatus: ArcaOrderStatus;
  /** "00" on an approved authorization. */
  actionCode?: string;
  actionCodeDescription?: string;
  amountMinor: number;
  currency?: string;
  /** Masked PAN, e.g. "428731**1234" — safe to store and display. */
  cardMask?: string;
  approvalCode?: string;
  authDateTime?: string;
}

/**
 * The ONLY trustworthy source for "did this donation succeed". Called from
 * the return route (best-effort, fast path) and from the reconcile sweep
 * (authoritative, catches everything the return route missed).
 *
 * Safe to call repeatedly — it is a read, not a mutation on ArCa's side.
 */
export async function getOrderStatus(
  orderId: string,
): Promise<OrderStatusResult> {
  const result = await post<{
    errorCode?: string;
    errorMessage?: string;
    orderStatus: number;
    actionCode?: string;
    actionCodeDescription?: string;
    amount: number;
    currency?: string;
    cardAuthInfo?: {
      maskedPan?: string;
      approvalCode?: string;
    };
    authDateTime?: string;
  }>("getOrderStatusExtended.do", { orderId });

  return {
    orderStatus: result.orderStatus as ArcaOrderStatus,
    actionCode: result.actionCode,
    actionCodeDescription: result.actionCodeDescription,
    amountMinor: result.amount,
    currency: result.currency,
    cardMask: result.cardAuthInfo?.maskedPan,
    approvalCode: result.cardAuthInfo?.approvalCode,
    authDateTime: result.authDateTime,
  };
}

/** ISO 4217 numeric codes ArCa expects, as strings — never the alpha code. */
export const ARCA_CURRENCY_CODE: Record<string, string> = {
  amd: "051",
  usd: "840",
  eur: "978",
  rub: "643",
};

export function toArcaCurrencyCode(currency: string): string {
  const code = ARCA_CURRENCY_CODE[currency.toLowerCase()];
  if (!code) {
    throw new Error(`No ArCa currency code mapped for "${currency}"`);
  }
  return code;
}
