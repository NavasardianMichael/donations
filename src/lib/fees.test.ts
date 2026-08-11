import { describe, expect, it } from "vitest";

import { feeBreakdown, PLATFORM_FEE_PERCENT, platformFeeCents } from "./fees";

describe("platformFeeCents", () => {
  it("takes 5% of round amounts", () => {
    expect(platformFeeCents(10_000)).toBe(500); // $100.00 -> $5.00
    expect(platformFeeCents(2_500)).toBe(125); // $25.00 -> $1.25
    expect(platformFeeCents(1_000)).toBe(50); // $10.00 -> $0.50
  });

  it("rounds half up rather than truncating", () => {
    // $1.90 * 5% = 9.5 cents. Truncation would lose us a cent on every one.
    expect(platformFeeCents(190)).toBe(10);
    // $0.10 * 5% = 0.5 cents.
    expect(platformFeeCents(10)).toBe(1);
    // $1.00 * 5% = 5 cents exactly.
    expect(platformFeeCents(100)).toBe(5);
  });

  it("never returns a fractional cent", () => {
    for (let amount = 100; amount <= 10_000; amount += 7) {
      expect(Number.isInteger(platformFeeCents(amount))).toBe(true);
    }
  });

  it("never exceeds the donation", () => {
    for (let amount = 100; amount <= 100_000; amount += 331) {
      expect(platformFeeCents(amount)).toBeLessThan(amount);
    }
  });

  it("is zero for a zero donation", () => {
    expect(platformFeeCents(0)).toBe(0);
  });

  it("rejects non-integer and negative amounts", () => {
    expect(() => platformFeeCents(100.5)).toThrow();
    expect(() => platformFeeCents(-100)).toThrow();
    expect(() => platformFeeCents(Number.NaN)).toThrow();
  });

  it("tracks the configured percentage", () => {
    expect(platformFeeCents(100_000)).toBe(
      Math.round((100_000 * PLATFORM_FEE_PERCENT) / 100),
    );
  });
});

describe("feeBreakdown", () => {
  it("splits a $100 donation", () => {
    const b = feeBreakdown(10_000);
    expect(b.grossCents).toBe(10_000);
    expect(b.platformFeeCents).toBe(500);
    expect(b.netToCreatorCents).toBe(9_500);
  });

  it("always conserves money — nothing is created or lost", () => {
    for (const amount of [100, 999, 1_000, 2_500, 9_999, 10_000, 123_456]) {
      const b = feeBreakdown(amount);
      expect(b.platformFeeCents + b.netToCreatorCents).toBe(b.grossCents);
    }
  });

  it("returns integers everywhere", () => {
    for (const amount of [101, 333, 777, 1_234, 56_789]) {
      for (const value of Object.values(feeBreakdown(amount))) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });
});
