"use client";

import { useEffect, useMemo, useState } from "react";

import { BulkActionsBar } from "@/components/dashboard/bulk-actions-bar";
import {
  LinkActions,
  LinkRow,
  type LinkRowData,
} from "@/components/dashboard/link-row";
import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { UrlDisplay } from "@/components/shared/url-display";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LinkTableProps = {
  links: LinkRowData[];
  total: number;
  appUrl: string;
};

type MobileLinkCardProps = {
  link: LinkRowData;
  appUrl: string;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
};

function MobileLinkCard({
  link,
  appUrl,
  isSelected,
  onSelectChange,
}: MobileLinkCardProps) {
  const shortUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/${link.slug}`
    : `/${link.slug}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 overflow-hidden">
      {/* Header: Checkbox + Slug + Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(value) => onSelectChange(Boolean(value))}
            aria-label={`Select link ${link.slug}`}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-base font-semibold text-foreground truncate">
              {link.slug}
            </div>
          </div>
        </div>
        <LinkActions link={link} appUrl={appUrl} className="shrink-0" />
      </div>

      {/* Short URL Preview */}
      <div className="mt-2 ml-9 flex items-center gap-2 min-w-0">
        <span
          className="text-xs text-muted-foreground truncate flex-1"
          title={shortUrl}
        >
          {shortUrl}
        </span>
        <div className="shrink-0">
          <CopyButton value={shortUrl} label="Copy short URL" size="sm" />
        </div>
      </div>

      {/* Divider */}
      <div className="my-3 ml-9 border-t border-border/50" />

      {/* Destination URL */}
      <div className="ml-9">
        <div className="text-xs text-muted-foreground mb-1">Destination</div>
        <UrlDisplay value={link.url} className="text-sm" maxLength={60} />
      </div>

      {/* Footer: Status + Clicks */}
      <div className="mt-4 ml-9 flex items-center justify-between">
        <StatusBadge isActive={link.isActive} expiresAt={link.expiresAt} />
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {link.clickCount} {link.clickCount === 1 ? "click" : "clicks"}
        </span>
      </div>
    </div>
  );
}

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

      <div className="space-y-3 md:hidden">
        {links.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {total === 0
              ? "No links yet. Create your first link to get started."
              : "No results match your filters."}
          </div>
        ) : (
          links.map((link) => (
            <MobileLinkCard
              key={link.id}
              link={link}
              appUrl={appUrl}
              isSelected={selectedSet.has(link.id)}
              onSelectChange={(checked) => toggleOne(link.id, checked)}
            />
          ))
        )}
      </div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
        <div className="w-full overflow-x-auto pb-2">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
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
    </div>
  );
}
