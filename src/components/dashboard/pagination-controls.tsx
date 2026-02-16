"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/lib/constants";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
};

type PageItem =
  | { type: "page"; value: number }
  | { type: "ellipsis"; key: string };

const buildPageList = (current: number, total: number): PageItem[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => ({
      type: "page",
      value: index + 1,
    }));
  }

  if (current <= 4) {
    return [
      { type: "page", value: 1 },
      { type: "page", value: 2 },
      { type: "page", value: 3 },
      { type: "page", value: 4 },
      { type: "page", value: 5 },
      { type: "ellipsis", key: "after-start" },
      { type: "page", value: total },
    ];
  }

  if (current >= total - 3) {
    return [
      { type: "page", value: 1 },
      { type: "ellipsis", key: "before-end" },
      { type: "page", value: total - 4 },
      { type: "page", value: total - 3 },
      { type: "page", value: total - 2 },
      { type: "page", value: total - 1 },
      { type: "page", value: total },
    ];
  }

  return [
    { type: "page", value: 1 },
    { type: "ellipsis", key: "before-current" },
    { type: "page", value: current - 1 },
    { type: "page", value: current },
    { type: "page", value: current + 1 },
    { type: "ellipsis", key: "after-current" },
    { type: "page", value: total },
  ];
};

export function PaginationControls({
  page,
  pageSize,
  total,
}: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pages = useMemo(
    () => buildPageList(page, totalPages),
    [page, totalPages],
  );

  const updateParams = (
    updates: Record<string, string | number | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => updateParams({ pageSize: value, page: 1 })}
        >
          <SelectTrigger className="h-8 w-[84px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateParams({ page: Math.max(1, page - 1) })}
          disabled={page <= 1}
        >
          <ChevronLeft />
          Prev
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((item) =>
            item.type === "ellipsis" ? (
              <span
                key={item.key}
                className="px-2 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={item.value}
                type="button"
                variant={item.value === page ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => updateParams({ page: item.value })}
              >
                {item.value}
              </Button>
            ),
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
