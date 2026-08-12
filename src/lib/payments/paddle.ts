import "server-only";

import crypto from "node:crypto";

/**
 * Paddle Billing client — the INTERNATIONAL checkout.
 *
 * Paddle is a merchant of record: it takes the card, handles tax, and pays out
 * later. That is why there is no card data and no acquiring relationship on our
 * side, and why the donor's receipt comes from Paddle as well as from us.
 *
 * Flow, all server-to-server except the overlay itself:
 *
 *   1. `createTransaction()` — POST /transactions with an ad-hoc price and
 *      `custom_data.donation_id`. Paddle returns the transaction id (`txn_…`)
 *      and a checkout URL: OUR OWN page with `?_ptxn=txn_…` appended.
 *   2. Send the donor's browser there. That page loads Paddle.js, which opens
 *      the overlay automatically from `_ptxn` — there is no `.open()` call.
 *   3. Paddle POSTs a signed webhook telling us what happened. The signature is
 *      the only reason to believe the body; see `verifyWebhookSignature`.
 *   4. `getTransaction()` — the authoritative read, used by the reconcile sweep
 *      for anything the webhook never delivered. Safe to repeat.
 *
 * Two things differ from a normal Paddle integration, both because donations
 * are not products:
 *
 * - **Ad-hoc prices.** A donation can be any amount, so there is no catalogue
 *   price to charge against. Every transaction builds a one-off price inline
 *   against a single `PADDLE_PRODUCT_ID`. This is also why Paddle's Pricing
 *   Preview API is unusable here — it only accepts catalogue `price_id`s.
 * - **USD only.** Paddle does not support AMD in any form. International
 *   donations are denominated in USD from the per-page ladder the creator
 *   authors; nothing here converts currency.
 *
 * Reference: https://developer.paddle.com/api-reference/transactions
 */

const HOSTS = {
  sandbox: "https://sandbox-api.paddle.com",
  production: "https://api.paddle.com",
} as const;

/**
 * Paddle's transaction statuses.
 *
 * `completed` is the only one that means money has moved. `billed` and `paid`
 * are intermediate states on the way there, and are deliberately NOT treated as
 * success — same discipline as ArCa, where only DEPOSITED counts.
 */
export const PADDLE_STATUS = {
  DRAFT: "draft",
  READY: "ready",
  BILLED: "billed",
  PAID: "paid",
  COMPLETED: "completed",
  CANCELED: "canceled",
  PAST_DUE: "past_due",
} as const;

export type PaddleTransactionStatus =
  (typeof PADDLE_STATUS)[keyof typeof PADDLE_STATUS];

export class PaddleError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
  ) {
    super(message);
    this.name = "PaddleError";
  }
}

/**
 * True once Paddle can actually be called. Every caller must check this first.
 *
 * The product id counts as configuration, not a detail: without it there is
 * nothing to attach an ad-hoc price to, so a checkout would fail at the API.
 */
export function isPaddleConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_PRODUCT_ID);
}

/** The currency Paddle charges in. Paddle cannot settle AMD. */
export const PADDLE_CURRENCY = "usd";

function apiKey(): string {
  const key = process.env.PADDLE_API_KEY;
  if (!key) {
    throw new Error(
      "Paddle is not configured (PADDLE_API_KEY missing). " +
        "Check isPaddleConfigured() before calling into this module.",
    );
  }
  return key;
}

function productId(): string {
  const id = process.env.PADDLE_PRODUCT_ID;
  if (!id) {
    throw new Error(
      "Paddle is not configured (PADDLE_PRODUCT_ID missing). " +
        "Check isPaddleConfigured() before calling into this module.",
    );
  }
  return id;
}

function baseUrl(): string {
  const env =
    process.env.PADDLE_ENV === "production" ? "production" : "sandbox";
  return HOSTS[env];
}

interface PaddleErrorBody {
  error?: { code?: string; detail?: string };
}

/**
 * Paddle uses real HTTP status codes (unlike ArCa, which returns 200 with an
 * error body), and puts the useful detail in `error.detail`.
 */
async function request<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers: {
      authorization: `Bearer ${apiKey()}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    // This is a payment call; never let a stale response serve as a decision.
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as PaddleErrorBody;
    throw new PaddleError(
      body.error?.detail ?? `Paddle returned HTTP ${response.status}`,
      body.error?.code ?? `http_${response.status}`,
    );
  }

  return (await response.json()) as T;
}

export interface CreateTransactionInput {
  /** Our Donation.id. Comes back to us in the webhook as `custom_data`. */
  donationId: string;
  /** Integer minor units — USD cents. Never a float. */
  amountMinor: number;
  /** Shown as the line item on Paddle's checkout and receipt. */
  description: string;
  /**
   * Page on OUR domain that loads Paddle.js. Paddle appends `?_ptxn=txn_…` to
   * it, and its origin must be approved in the Paddle dashboard first.
   */
  checkoutUrl: string;
  /** Prefills the overlay so the donor does not retype it. Optional. */
  donorEmail?: string | null;
}

export interface CreateTransactionResult {
  /** Paddle's `txn_…` id — store this, it is what getTransaction needs. */
  transactionId: string;
  /** Send the donor's browser here. Already carries `?_ptxn=`. */
  checkoutUrl: string;
}

/**
 * Create a transaction and get the URL that opens its checkout.
 *
 * `custom_data.donation_id` is the ONLY link between Paddle's world and ours.
 * The webhook carries it back; without it a completed payment cannot be
 * attributed to a donation.
 */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<CreateTransactionResult> {
  assertWholeMinor(input.amountMinor);

  const result = await request<{
    data?: {
      id?: string;
      checkout?: { url?: string | null };
    };
  }>("/transactions", {
    method: "POST",
    body: {
      items: [
        {
          quantity: 1,
          // An ad-hoc (non-catalogue) price: created with the transaction and
          // never reused, because no two donations need the same amount.
          price: {
            product_id: productId(),
            description: input.description.slice(0, 200),
            unit_price: {
              // Paddle takes minor units as a STRING, not a number.
              amount: String(input.amountMinor),
              currency_code: "USD",
            },
            quantity: { minimum: 1, maximum: 1 },
          },
        },
      ],
      custom_data: { donation_id: input.donationId },
      checkout: { url: input.checkoutUrl },
      ...(input.donorEmail
        ? { customer: { email: input.donorEmail } }
        : {}),
    },
  });

  const transactionId = result.data?.id;
  const checkoutUrl = result.data?.checkout?.url;

  if (!transactionId) {
    throw new PaddleError(
      "Paddle did not return a transaction id",
      "missing_transaction_id",
    );
  }
  if (!checkoutUrl) {
    // Almost always a dashboard problem rather than a code one: no approved
    // domain, or no default payment link configured.
    throw new PaddleError(
      "Paddle did not return a checkout URL — check that the checkout domain " +
        "is approved and a default payment link is set",
      "missing_checkout_url",
    );
  }

  return { transactionId, checkoutUrl };
}

export interface TransactionResult {
  status: PaddleTransactionStatus;
  /** Our Donation.id, echoed back from `custom_data`. */
  donationId?: string;
  /** Integer minor units actually charged, in `currency`. */
  amountMinor?: number;
  currency?: string;
  /** Last four digits and card type, when Paddle reports them. */
  cardLast4?: string;
  cardType?: string;
}

/**
 * The authoritative answer to "did this donation succeed".
 *
 * A verified webhook is trustworthy, but it can be missed entirely — Paddle
 * gives up retrying eventually, and a deploy can drop one. This read is what
 * the reconcile sweep uses to resolve anything left in AUTHORIZING, and it is
 * the direct analogue of ArCa's `getOrderStatus`.
 *
 * Safe to call repeatedly — it is a read, not a mutation on Paddle's side.
 */
export async function getTransaction(
  transactionId: string,
): Promise<TransactionResult> {
  const result = await request<{ data?: PaddleTransactionData }>(
    `/transactions/${encodeURIComponent(transactionId)}?include=payments`,
    { method: "GET" },
  );

  if (!result.data) {
    throw new PaddleError(
      `Paddle returned no data for transaction ${transactionId}`,
      "missing_data",
    );
  }

  return readTransaction(result.data);
}

/** The subset of Paddle's transaction object this app reads. */
export interface PaddleTransactionData {
  id?: string;
  status?: string;
  custom_data?: { donation_id?: string } | null;
  currency_code?: string;
  details?: {
    totals?: { total?: string; grand_total?: string };
  } | null;
  payments?: Array<{
    method_details?: {
      type?: string;
      card?: { last4?: string; type?: string } | null;
    } | null;
  }> | null;
}

/**
 * Normalise a Paddle transaction object — from either a webhook body or a
 * `getTransaction` read, which share the same shape.
 */
export function readTransaction(
  data: PaddleTransactionData,
): TransactionResult {
  const total = data.details?.totals?.grand_total ?? data.details?.totals?.total;
  const parsed = total === undefined ? Number.NaN : Number(total);
  const card = data.payments?.[0]?.method_details?.card ?? null;

  return {
    status: (data.status ?? PADDLE_STATUS.DRAFT) as PaddleTransactionStatus,
    donationId: data.custom_data?.donation_id,
    amountMinor: Number.isInteger(parsed) ? parsed : undefined,
    currency: data.currency_code?.toLowerCase(),
    cardLast4: card?.last4 ?? undefined,
    cardType: card?.type ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/** How old a signature may be before it is treated as a replay. */
const SIGNATURE_MAX_AGE_SECONDS = 5 * 60;

export interface WebhookVerification {
  valid: boolean;
  /** Why it failed, for the log. Never returned to the caller of the route. */
  reason?: string;
}

/**
 * Verify the `Paddle-Signature` header against the RAW request body.
 *
 * Header format: `ts=1671552777;h1=<hex>` — and possibly several `h1=` values
 * while a secret is being rotated, so every one is checked.
 *
 * Three details that are easy to get wrong and silently fatal:
 *
 * 1. The signed payload is the bytes `{ts}:{body}`. The body must be the exact
 *    bytes Paddle sent — parsing and re-serialising the JSON first changes them
 *    and every signature fails.
 * 2. `timingSafeEqual` throws when the two buffers differ in length, so the
 *    length is compared first.
 * 3. A valid signature is valid forever unless the timestamp is checked. Paddle
 *    does not do this for you; without the age check below, a captured request
 *    can be replayed indefinitely.
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  nowMs: number = Date.now(),
): WebhookVerification {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return { valid: false, reason: "PADDLE_WEBHOOK_SECRET is not configured" };
  }
  if (!signature) {
    return { valid: false, reason: "missing Paddle-Signature header" };
  }

  const parts = signature.split(";");
  const ts = parts.find((part) => part.startsWith("ts="))?.slice(3);
  const hashes = parts
    .filter((part) => part.startsWith("h1="))
    .map((part) => part.slice(3));

  if (!ts || hashes.length === 0) {
    return { valid: false, reason: "malformed Paddle-Signature header" };
  }

  const tsSeconds = Number(ts);
  if (!Number.isFinite(tsSeconds)) {
    return { valid: false, reason: "non-numeric signature timestamp" };
  }

  const ageSeconds = Math.abs(nowMs / 1000 - tsSeconds);
  if (ageSeconds > SIGNATURE_MAX_AGE_SECONDS) {
    return {
      valid: false,
      reason: `signature timestamp is ${Math.round(ageSeconds)}s old`,
    };
  }

  // Concatenate as BYTES. Coercing rawBody to a string would normalise any
  // invalid UTF-8 and change the hash.
  const signedPayload = Buffer.concat([
    Buffer.from(`${ts}:`, "utf8"),
    rawBody,
  ]);
  const computed = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  const computedBuffer = Buffer.from(computed, "utf8");

  const matched = hashes.some((hash) => {
    const candidate = Buffer.from(hash, "utf8");
    return (
      candidate.length === computedBuffer.length &&
      crypto.timingSafeEqual(candidate, computedBuffer)
    );
  });

  return matched ? { valid: true } : { valid: false, reason: "signature mismatch" };
}

/** The Paddle events this app subscribes to. */
export const PADDLE_EVENT = {
  TRANSACTION_COMPLETED: "transaction.completed",
  TRANSACTION_PAYMENT_FAILED: "transaction.payment_failed",
  TRANSACTION_CANCELED: "transaction.canceled",
} as const;

export interface PaddleWebhookEvent {
  event_id?: string;
  event_type?: string;
  data?: PaddleTransactionData;
}

function assertWholeMinor(amountMinor: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error(
      `Amounts must be positive integer minor units, received: ${amountMinor}`,
    );
  }
}
