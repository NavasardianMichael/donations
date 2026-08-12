import crypto from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { amountBounds } from "../fees";
import {
  PADDLE_STATUS,
  readTransaction,
  verifyWebhookSignature,
} from "./paddle";

/**
 * The webhook signature is the ONLY thing standing between a stranger's POST
 * and a donation being marked paid, so it gets the most attention here. It is
 * also the one piece of this integration that is a pure function, which makes it
 * the cheapest possible thing to pin down.
 */

const SECRET = "pdl_ntfset_01hxyz_secret";
const OTHER_SECRET = "pdl_ntfset_01hxyz_rotated";

/** A fixed instant, so the freshness check is deterministic. */
const NOW_MS = 1_770_000_000_000;
const NOW_SECONDS = Math.floor(NOW_MS / 1000);

/** Builds a header exactly the way Paddle does. */
function sign(
  body: string | Buffer,
  secret = SECRET,
  ts = NOW_SECONDS,
): string {
  const raw = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  const hash = crypto
    .createHmac("sha256", secret)
    .update(Buffer.concat([Buffer.from(`${ts}:`, "utf8"), raw]))
    .digest("hex");
  return `ts=${ts};h1=${hash}`;
}

const BODY = JSON.stringify({
  event_type: "transaction.completed",
  data: { id: "txn_01hxyz", custom_data: { donation_id: "clx123" } },
});

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.PADDLE_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.PADDLE_WEBHOOK_SECRET;
  });

  it("accepts a signature Paddle would have produced", () => {
    const raw = Buffer.from(BODY, "utf8");
    expect(verifyWebhookSignature(raw, sign(raw), NOW_MS).valid).toBe(true);
  });

  it("rejects a body altered by a single byte", () => {
    const raw = Buffer.from(BODY, "utf8");
    const signature = sign(raw);
    // Same length, different content — the kind of tamper a length check alone
    // would wave through.
    const tampered = Buffer.from(BODY.replace("clx123", "clx124"), "utf8");

    expect(tampered.length).toBe(raw.length);
    expect(verifyWebhookSignature(tampered, signature, NOW_MS).valid).toBe(
      false,
    );
  });

  it("rejects a signature made with a different secret", () => {
    const raw = Buffer.from(BODY, "utf8");
    expect(
      verifyWebhookSignature(raw, sign(raw, OTHER_SECRET), NOW_MS).valid,
    ).toBe(false);
  });

  it("accepts any one of several h1 values, for secret rotation", () => {
    const raw = Buffer.from(BODY, "utf8");
    const good = sign(raw).split(";h1=")[1]!;
    const stale = sign(raw, OTHER_SECRET).split(";h1=")[1]!;

    // Paddle sends both while a secret is being rotated, in either order.
    expect(
      verifyWebhookSignature(
        raw,
        `ts=${NOW_SECONDS};h1=${stale};h1=${good}`,
        NOW_MS,
      ).valid,
    ).toBe(true);
    expect(
      verifyWebhookSignature(
        raw,
        `ts=${NOW_SECONDS};h1=${good};h1=${stale}`,
        NOW_MS,
      ).valid,
    ).toBe(true);
  });

  it("rejects a replay of a signature that was valid hours ago", () => {
    const raw = Buffer.from(BODY, "utf8");
    // Correctly signed — just old. Without a freshness check a captured
    // request would stay valid forever.
    const signature = sign(raw, SECRET, NOW_SECONDS - 6 * 60 * 60);

    const result = verifyWebhookSignature(raw, signature, NOW_MS);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/old/);
  });

  it("accepts a signature a few seconds old, and one slightly ahead", () => {
    const raw = Buffer.from(BODY, "utf8");
    expect(
      verifyWebhookSignature(raw, sign(raw, SECRET, NOW_SECONDS - 30), NOW_MS)
        .valid,
    ).toBe(true);
    // Clock skew between Paddle and us must not reject a real delivery.
    expect(
      verifyWebhookSignature(raw, sign(raw, SECRET, NOW_SECONDS + 30), NOW_MS)
        .valid,
    ).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["no h1", `ts=${NOW_SECONDS}`],
    ["no ts", "h1=deadbeef"],
    ["non-numeric ts", "ts=not-a-number;h1=deadbeef"],
    ["garbage", "hello"],
  ])("rejects a malformed header (%s)", (_label, signature) => {
    const raw = Buffer.from(BODY, "utf8");
    expect(verifyWebhookSignature(raw, signature, NOW_MS).valid).toBe(false);
  });

  it("rejects a truncated h1 rather than throwing", () => {
    // `crypto.timingSafeEqual` throws on a length mismatch, so the length must
    // be compared first. A short hash is the easy way to trip that.
    const raw = Buffer.from(BODY, "utf8");
    expect(() =>
      verifyWebhookSignature(raw, `ts=${NOW_SECONDS};h1=abc`, NOW_MS),
    ).not.toThrow();
    expect(
      verifyWebhookSignature(raw, `ts=${NOW_SECONDS};h1=abc`, NOW_MS).valid,
    ).toBe(false);
  });

  it("refuses everything when no secret is configured", () => {
    // Failing closed matters more here than anywhere else: an unconfigured
    // secret must not mean "accept all".
    delete process.env.PADDLE_WEBHOOK_SECRET;
    const raw = Buffer.from(BODY, "utf8");
    expect(verifyWebhookSignature(raw, sign(raw), NOW_MS).valid).toBe(false);
  });

  it("verifies bodies that are not valid UTF-8 by treating them as bytes", () => {
    // A lone surrogate survives a byte-wise HMAC but not a string round-trip,
    // which is why the implementation concatenates buffers.
    const raw = Buffer.from([0x7b, 0xed, 0xa0, 0x80, 0x7d]);
    expect(verifyWebhookSignature(raw, sign(raw), NOW_MS).valid).toBe(true);
  });
});

describe("readTransaction", () => {
  it("pulls out the donation id, amount and card details", () => {
    const result = readTransaction({
      id: "txn_01hxyz",
      status: "completed",
      custom_data: { donation_id: "clx123" },
      currency_code: "USD",
      details: { totals: { grand_total: "2500" } },
      payments: [{ method_details: { card: { last4: "4242", type: "visa" } } }],
    });

    expect(result).toEqual({
      status: PADDLE_STATUS.COMPLETED,
      donationId: "clx123",
      // Paddle reports minor units as a string; we store integers.
      amountMinor: 2500,
      currency: "usd",
      cardLast4: "4242",
      cardType: "visa",
    });
  });

  it("survives a payload with nothing optional present", () => {
    const result = readTransaction({ id: "txn_01hxyz", status: "billed" });

    expect(result.status).toBe(PADDLE_STATUS.BILLED);
    expect(result.donationId).toBeUndefined();
    expect(result.amountMinor).toBeUndefined();
    expect(result.cardLast4).toBeUndefined();
  });

  it("drops a non-integer total rather than storing a float", () => {
    // Money is integer minor units everywhere. A fractional total is a bug in
    // the payload, and silently rounding it would hide that.
    expect(
      readTransaction({ details: { totals: { total: "25.50" } } }).amountMinor,
    ).toBeUndefined();
  });

  it("prefers grand_total, which is what the donor was actually charged", () => {
    const result = readTransaction({
      details: { totals: { total: "2500", grand_total: "3000" } },
    });
    expect(result.amountMinor).toBe(3000);
  });
});

describe("amountBounds", () => {
  it("keeps the AMD floor in drams and the USD floor in dollars", () => {
    // The whole reason this function exists: 100_00 minor units is 100 ֏ but
    // $100, so one shared constant would reject every real USD donation.
    expect(amountBounds("amd").minMinor).toBe(100_00);
    expect(amountBounds("usd").minMinor).toBe(1_00);
  });

  it("is case-insensitive and falls back to AMD, matching currencyMeta", () => {
    expect(amountBounds("USD")).toEqual(amountBounds("usd"));
    expect(amountBounds("zzz")).toEqual(amountBounds("amd"));
  });

  it("puts every floor below its ceiling", () => {
    for (const currency of ["amd", "usd", "eur"]) {
      const bounds = amountBounds(currency);
      expect(bounds.minMinor).toBeLessThan(bounds.maxMinor);
      expect(Number.isInteger(bounds.minMinor)).toBe(true);
      expect(Number.isInteger(bounds.maxMinor)).toBe(true);
    }
  });
});
