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

import { cn } from "@/lib/utils";
import type { ClicksByDate } from "@/types";

type ClicksChartProps = {
  data: ClicksByDate[];
  height?: number;
  className?: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export function ClicksChart({ data, height = 260, className }: ClicksChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        No clicks yet for this period.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className,
      )}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={{ stroke: "#3f3f46" }}
          />
          <YAxis
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={{ stroke: "#3f3f46" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "6px",
              color: "#fafafa",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value: number | string) => [value, "Clicks"]}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#clicksFill)"
            dot={{ r: 2, stroke: "#3b82f6", fill: "#0f172a" }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
