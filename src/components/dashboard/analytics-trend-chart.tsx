"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDate, formatNumber } from "@/lib/utils";

export interface AnalyticsTrendChartPoint {
  date: string;
  views: number;
  donationCount: number;
  amountMinor: number;
}

export function AnalyticsTrendChart({
  data,
  viewsLabel,
  donationsLabel,
}: {
  data: AnalyticsTrendChartPoint[];
  viewsLabel: string;
  donationsLabel: string;
}) {
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="analyticsViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="analyticsDonations" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border-subtle)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) =>
              formatDate(value, { month: "short", day: "numeric" })
            }
            tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            yAxisId="views"
            tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="donations"
            orientation="right"
            tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border-warm)",
              borderRadius: 4,
              fontSize: 13,
            }}
            labelFormatter={(value) =>
              formatDate(String(value), {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            }
            formatter={(value, name) => {
              const label =
                name === "views" ? viewsLabel : donationsLabel;
              return [formatNumber(Number(value ?? 0)), label];
            }}
          />
          <Area
            yAxisId="views"
            type="monotone"
            dataKey="views"
            name="views"
            stroke="var(--chart-1)"
            fill="url(#analyticsViews)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            yAxisId="donations"
            type="monotone"
            dataKey="donationCount"
            name="donationCount"
            stroke="var(--chart-2)"
            fill="url(#analyticsDonations)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
