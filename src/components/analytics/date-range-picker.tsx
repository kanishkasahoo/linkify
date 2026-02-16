"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types";

type RangeOption = {
  value: DateRange;
  label: string;
};

const ranges: RangeOption[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All time" },
];

type DateRangePickerProps = {
  value: DateRange;
  className?: string;
};

export function DateRangePicker({ value, className }: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const handleSelect = (range: DateRange) => {
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("range", range);
    router.push(`?${nextParams.toString()}`);
  };

  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-md border border-border bg-card",
        className,
      )}
    >
      {ranges.map((range) => {
        const isActive = range.value === value;
        return (
          <Button
            key={range.value}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "h-9 rounded-none border-r border-border px-3 text-sm last:border-r-0",
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={isActive}
            onClick={() => handleSelect(range.value)}
          >
            {range.label}
          </Button>
        );
      })}
    </div>
  );
}
