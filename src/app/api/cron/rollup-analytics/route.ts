import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { addDays, startOfUtcDay } from "@/lib/utils";
import { rollupDailyStatsForDay } from "@/server/queries/analytics";

/**
 * Nightly rollup of PageView + Donation into PageDailyStat.
 *
 * The live analytics tiles read raw tables; the trend chart reads these
 * daily rows so a 90-day chart does not scan every pageview. Re-rolling the
 * last few days catches donations that the reconcile cron marked SUCCEEDED
 * after the original night's pass.
 *
 * Scheduled via `vercel.json`. Guarded by `CRON_SECRET` the same way as
 * reconcile-donations.
 */

const ROLLUP_LOOKBACK_DAYS = 3;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const today = startOfUtcDay();
  const days: Date[] = [];
  for (let i = 0; i < ROLLUP_LOOKBACK_DAYS; i++) {
    days.push(addDays(today, -i));
  }

  let upserted = 0;
  const errors: string[] = [];

  for (const day of days) {
    try {
      upserted += await rollupDailyStatsForDay(day);
    } catch (error) {
      errors.push(
        `${day.toISOString().slice(0, 10)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return NextResponse.json({
    days: days.map((d) => d.toISOString().slice(0, 10)),
    upserted,
    errors,
  });
}
