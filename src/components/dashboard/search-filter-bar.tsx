"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LinkSortBy, LinkStatusFilter, SortOrder } from "@/types";

type SearchFilterBarProps = {
  search?: string;
  status: LinkStatusFilter;
  sortBy: LinkSortBy;
  sortOrder: SortOrder;
};

export function SearchFilterBar({
  search,
  status,
  sortBy,
  sortOrder,
}: SearchFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search ?? "");

  useEffect(() => {
    setQuery(search ?? "");
  }, [search]);

  const params = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const updateParams = (
    updates: Record<string, string | number | undefined>,
  ) => {
    const nextParams = new URLSearchParams(params.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    nextParams.set("page", "1");
    router.push(`?${nextParams.toString()}`);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateParams({ search: query.trim() || undefined });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <form
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-2 md:max-w-md"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by slug or URL"
            className="pl-9"
            aria-label="Search links"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(value) =>
            updateParams({ status: value as LinkStatusFilter })
          }
        >
          <SelectTrigger className="h-10 w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(value) =>
            updateParams({ sortBy: value as LinkSortBy })
          }
        >
          <SelectTrigger className="h-10 w-[170px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created date</SelectItem>
            <SelectItem value="clicks">Total clicks</SelectItem>
            <SelectItem value="slug">Slug</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateParams({ sortOrder: sortOrder === "asc" ? "desc" : "asc" })
          }
        >
          <ArrowUpDown />
          {sortOrder === "asc" ? "Ascending" : "Descending"}
        </Button>
      </div>
    </div>
  );
}
