"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Copy,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";

import { deleteLink, toggleLinks } from "@/actions/links";
import { LinkFormDialog } from "@/components/dashboard/link-form";
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

export function LinkRow({
  link,
  isSelected,
  onSelectChange,
  appUrl,
}: LinkRowProps) {
  const [isPending, startTransition] = useTransition();

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

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleLinks([link.id], !link.isActive);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(!link.isActive ? "Link activated" : "Link deactivated");
    });
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this link? This cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteLink(link.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Link deleted");
    });
  };

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
        <UrlDisplay value={link.url} />
      </TableCell>
      <TableCell className="text-right text-sm text-foreground">
        {link.clickCount}
      </TableCell>
      <TableCell>
        <StatusBadge isActive={link.isActive} expiresAt={link.expiresAt} />
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Link actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <LinkFormDialog
              mode="edit"
              appUrl={appUrl}
              initialValues={{
                id: link.id,
                url: link.url,
                slug: link.slug,
                expiresAt: link.expiresAt,
                isActive: link.isActive,
              }}
              trigger={<DropdownMenuItem>Edit link</DropdownMenuItem>}
            />
            <DropdownMenuItem onClick={handleCopyShortUrl}>
              <Copy />
              Copy short URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggle} disabled={isPending}>
              {link.isActive ? <ToggleLeft /> : <ToggleRight />}
              {link.isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
              disabled={isPending}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
