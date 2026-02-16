"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import type { ClicksByCountry } from "@/types";

type CountryChartProps = {
  data: ClicksByCountry[];
  height?: number;
  className?: string;
};

const formatCountry = (value: string | null) => value ?? "Unknown";

export function CountryChart({
  data,
  height = 240,
  className,
}: CountryChartProps) {
  const chartData = data.map((item) => ({
    country: formatCountry(item.country),
    count: item.count,
  }));

  if (chartData.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        No country data yet.
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-4", className)}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            type="number"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={{ stroke: "#3f3f46" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="country"
            width={48}
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={{ stroke: "#3f3f46" }}
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
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 4, 4]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
