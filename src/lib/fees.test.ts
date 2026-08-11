import { describe, expect, it } from "vitest";

import { formatMoney, parseMoneyToMinor, toMinor } from "./currency";
import { feeBreakdown, PLATFORM_FEE_PERCENT, platformFeeMinor } from "./fees";

/** Drams expressed in minor units (luma). */
const AMD = (drams: number) => drams * 100;

/**
 * ICU separates groups and the currency sign with U+00A0. Asserting on
 * invisible characters makes failures unreadable, so normalise them to plain
 * spaces — the test still pins the digits, the sign and its position.
 */
const money = (value: string) => value.replace(/[  ]/g, " ");

describe("platformFeeMinor", () => {
  it("takes 5% of round amounts", () => {
    expect(platformFeeMinor(AMD(10_000))).toBe(AMD(500));
    expect(platformFeeMinor(AMD(5_000))).toBe(AMD(250));
    expect(platformFeeMinor(AMD(1_000))).toBe(AMD(50));
  });

  it("rounds half up rather than truncating", () => {
    // 19 ֏ * 5% = 95 luma exactly.
    expect(platformFeeMinor(1900)).toBe(95);
    // 1 ֏ (100 luma) * 5% = 5 luma.
    expect(platformFeeMinor(100)).toBe(5);
    // 10 luma * 5% = 0.5 luma -> rounds up, never truncated away.
    expect(platformFeeMinor(10)).toBe(1);
  });

  it("never returns a fractional minor unit", () => {
    for (let amount = 100; amount <= 1_000_000; amount += 777) {
      expect(Number.isInteger(platformFeeMinor(amount))).toBe(true);
    }
  });

  it("never exceeds the donation", () => {
    for (let amount = 100; amount <= 10_000_000; amount += 33_331) {
      expect(platformFeeMinor(amount)).toBeLessThan(amount);
    }
  });

  it("is zero for a zero donation", () => {
    expect(platformFeeMinor(0)).toBe(0);
  });

  it("rejects non-integer and negative amounts", () => {
    expect(() => platformFeeMinor(100.5)).toThrow();
    expect(() => platformFeeMinor(-100)).toThrow();
    expect(() => platformFeeMinor(Number.NaN)).toThrow();
  });

  it("tracks the configured percentage", () => {
    expect(platformFeeMinor(AMD(100_000))).toBe(
      Math.round((AMD(100_000) * PLATFORM_FEE_PERCENT) / 100),
    );
  });
});

describe("feeBreakdown", () => {
  it("splits a 10 000 ֏ donation", () => {
    const b = feeBreakdown(AMD(10_000));
    expect(b.grossMinor).toBe(AMD(10_000));
    expect(b.platformFeeMinor).toBe(AMD(500));
    expect(b.netToCreatorMinor).toBe(AMD(9_500));
  });

  it("always conserves money — nothing is created or lost", () => {
    for (const drams of [100, 999, 1_000, 5_000, 9_999, 10_000, 123_456]) {
      const b = feeBreakdown(AMD(drams));
      expect(b.platformFeeMinor + b.netToCreatorMinor).toBe(b.grossMinor);
    }
  });

  it("returns integers everywhere", () => {
    for (const drams of [101, 333, 777, 1_234, 56_789]) {
      for (const value of Object.values(feeBreakdown(AMD(drams)))) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });
});

describe("AMD formatting", () => {
  it("renders whole drams with the ֏ sign and no decimals", () => {
    expect(money(formatMoney(AMD(5_000)))).toBe("5000 ֏");
    expect(money(formatMoney(AMD(1_245_000)))).toBe("1 245 000 ֏");
    expect(money(formatMoney(AMD(100)))).toBe("100 ֏");
  });

  it("never shows luma, even when the amount has them", () => {
    // 5 000,37 ֏ — a fee remainder. Donors see whole drams.
    expect(money(formatMoney(500_037))).toBe("5000 ֏");
  });

  it("still shows cents for USD", () => {
    expect(money(formatMoney(2500, "usd"))).toBe("25,00 $");
  });
});

describe("parseMoneyToMinor", () => {
  it("accepts what an Armenian keyboard produces", () => {
    expect(parseMoneyToMinor("5000")).toBe(AMD(5_000));
    expect(parseMoneyToMinor("5 000")).toBe(AMD(5_000));
    expect(parseMoneyToMinor("5000 ֏")).toBe(AMD(5_000));
    // Non-breaking space, which is what hy-AM grouping actually emits.
    expect(parseMoneyToMinor("1 245 000")).toBe(AMD(1_245_000));
  });

  it("rejects fractional drams", () => {
    // Nobody donates 5 000,50 ֏.
    expect(parseMoneyToMinor("5000,50")).toBeNull();
    expect(parseMoneyToMinor("5000.50")).toBeNull();
  });

  it("accepts cents for USD", () => {
    expect(parseMoneyToMinor("25.50", "usd")).toBe(2550);
    expect(parseMoneyToMinor("25,50", "usd")).toBe(2550);
  });

  it("rejects junk", () => {
    expect(parseMoneyToMinor("")).toBeNull();
    expect(parseMoneyToMinor("abc")).toBeNull();
    expect(parseMoneyToMinor("-100")).toBeNull();
    expect(parseMoneyToMinor("1e5")).toBeNull();
  });

  it("round-trips through toMinor", () => {
    expect(parseMoneyToMinor("5000")).toBe(toMinor(5_000));
  });
});
