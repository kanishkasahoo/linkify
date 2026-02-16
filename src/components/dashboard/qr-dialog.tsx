"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Download, QrCode } from "lucide-react";
import { toast } from "sonner";

import { generateQRCode } from "@/actions/qr";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type QrDialogProps = {
  slug: string;
  appUrl: string;
  trigger?: ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function QrDialog({
  slug,
  appUrl,
  trigger,
  className,
  open,
  onOpenChange,
}: QrDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const shortUrl = useMemo(() => {
    if (!appUrl) {
      return `/${slug}`;
    }
    return `${appUrl.replace(/\/$/, "")}/${slug}`;
  }, [appUrl, slug]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    let active = true;
    setDataUrl(null);

    startTransition(async () => {
      const result = await generateQRCode(slug);
      if (!active) {
        return;
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setDataUrl(result.data.dataUrl);
    });

    return () => {
      active = false;
    };
  }, [dialogOpen, slug]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const handleDownload = () => {
    if (!dataUrl) {
      toast.error("QR code is still loading");
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `linkify-${slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code: {slug}
          </DialogTitle>
          <DialogDescription>
            Scan to open the short URL instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center rounded-lg border border-border bg-card p-4">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR code for ${slug}`}
                className="h-60 w-60 rounded-md"
              />
            ) : (
              <Skeleton className="h-60 w-60 rounded-md" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-foreground">
              {shortUrl}
            </span>
            <CopyButton value={shortUrl} label="Copy short URL" size="sm" />
          </div>

          <Button type="button" onClick={handleDownload} disabled={!dataUrl || isPending}>
            <Download />
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
