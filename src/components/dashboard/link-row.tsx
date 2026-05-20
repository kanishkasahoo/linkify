"use client";

import {
  Copy,
  MoreHorizontal,
  QrCode,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";

import { LinkFormDialog } from "@/components/dashboard/link-form";
import { QrDialog } from "@/components/dashboard/qr-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { UrlDisplay } from "@/components/shared/url-display";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type LinkRowData = {
  id: string;
  slug: string;
  url: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  clickCount: number;
};

type LinkRowProps = {
  link: LinkRowData;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  appUrl: string;
};

type LinkActionsProps = {
  link: LinkRowData;
  appUrl: string;
  className?: string;
};

export function LinkActions({ link, appUrl, className }: LinkActionsProps) {
  const fetcher = useFetcher<{ success: boolean; error?: string }>();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const shortUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/${link.slug}`
    : `/${link.slug}`;

  const handleCopyShortUrl = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      toast.success("Short URL copied");
    } catch {
      toast.error("Unable to copy");
    }
  };

  useEffect(() => {
    if (!fetcher.data) {
      return;
    }
    if (!fetcher.data.success) {
      toast.error(fetcher.data.error ?? "Action failed");
      return;
    }
    toast.success("Link updated");
  }, [fetcher.data]);

  const handleToggle = () => {
    startTransition(() => {
      const data = new FormData();
      data.set("intent", "toggle");
      data.set("isActive", String(!link.isActive));
      fetcher.submit(data, {
        method: "post",
        action: `/dashboard/links/${link.id}`,
      });
    });
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this link? This cannot be undone.")) {
      return;
    }

    startTransition(() => {
      const data = new FormData();
      data.set("intent", "delete");
      fetcher.submit(data, {
        method: "post",
        action: `/dashboard/links/${link.id}`,
      });
    });
  };

  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      <LinkFormDialog
        mode="edit"
        appUrl={appUrl}
        open={editOpen}
        onOpenChange={setEditOpen}
        action={`/dashboard/links/${link.id}`}
        initialValues={{
          id: link.id,
          url: link.url,
          slug: link.slug,
          expiresAt: link.expiresAt,
          isActive: link.isActive,
        }}
      />
      <QrDialog
        slug={link.slug}
        appUrl={appUrl}
        open={qrOpen}
        onOpenChange={setQrOpen}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Link actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Edit link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyShortUrl}>
            <Copy />
            Copy short URL
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setQrOpen(true)}>
            <QrCode />
            QR code
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleToggle}
            disabled={isPending || fetcher.state !== "idle"}
          >
            {link.isActive ? <ToggleLeft /> : <ToggleRight />}
            {link.isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive"
            disabled={isPending || fetcher.state !== "idle"}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function LinkRow({
  link,
  isSelected,
  onSelectChange,
  appUrl,
}: LinkRowProps) {
  const shortUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/${link.slug}`
    : `/${link.slug}`;

  return (
    <TableRow className="border-border">
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(value) => onSelectChange(Boolean(value))}
          aria-label={`Select link ${link.slug}`}
        />
      </TableCell>
      <TableCell className="max-w-[200px]">
        <div className="flex items-center gap-2">
          <div className="font-mono text-sm text-foreground" title={shortUrl}>
            {link.slug}
          </div>
          <CopyButton value={shortUrl} label="Copy short URL" size="sm" />
        </div>
      </TableCell>
      <TableCell className="min-w-[240px]">
        <UrlDisplay value={link.url} maxLength={48} />
      </TableCell>
      <TableCell className="text-right text-sm text-foreground">
        {link.clickCount}
      </TableCell>
      <TableCell>
        <StatusBadge isActive={link.isActive} expiresAt={link.expiresAt} />
      </TableCell>
      <TableCell className="text-right">
        <LinkActions link={link} appUrl={appUrl} />
      </TableCell>
    </TableRow>
  );
}
