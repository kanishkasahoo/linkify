"use client";

import { CopyButton } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";

type UrlDisplayProps = {
  value: string;
  className?: string;
};

export function UrlDisplay({ value, className }: UrlDisplayProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className="truncate font-mono text-sm text-foreground"
        title={value}
      >
        {value}
      </span>
      <CopyButton value={value} label="Copy URL" />
    </div>
  );
}
