"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TopReferrer } from "@/types";

type ReferrerTableProps = {
  data: TopReferrer[];
  className?: string;
};

const formatReferrer = (value: string | null) => {
  if (!value) {
    return "Direct";
  }

  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
};

export function ReferrerTable({ data, className }: ReferrerTableProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referrer</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={2}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No referrer data yet.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const label = formatReferrer(item.referrer);
              return (
                <TableRow key={label}>
                  <TableCell className="max-w-[240px] truncate" title={label}>
                    {label}
                  </TableCell>
                  <TableCell className="text-right text-sm text-foreground">
                    {item.count}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
