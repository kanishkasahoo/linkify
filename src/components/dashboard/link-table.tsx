"use client";

import { useEffect, useMemo, useState } from "react";

import { BulkActionsBar } from "@/components/dashboard/bulk-actions-bar";
import { LinkRow, type LinkRowData } from "@/components/dashboard/link-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

type LinkTableProps = {
  links: LinkRowData[];
  total: number;
  appUrl: string;
};

export function LinkTable({ links, total, appUrl }: LinkTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected = links.length > 0 && selectedIds.length === links.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < links.length;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => links.some((link) => link.id === id)),
    );
  }, [links]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(links.map((link) => link.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 ? (
        <BulkActionsBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
        />
      ) : null}

      <div className="rounded-lg border border-border bg-card">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={(value) => toggleAll(Boolean(value))}
                  aria-label="Select all links"
                />
              </TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {total === 0
                    ? "No links yet. Create your first link to get started."
                    : "No results match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  appUrl={appUrl}
                  isSelected={selectedSet.has(link.id)}
                  onSelectChange={(checked) => toggleOne(link.id, checked)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
