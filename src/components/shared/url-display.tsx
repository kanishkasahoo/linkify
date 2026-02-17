"use client";

import { CopyButton } from "@/components/shared/copy-button";
import { cn, truncateUrl } from "@/lib/utils";

type UrlDisplayProps = {
  value: string;
  className?: string;
  maxLength?: number;
};

export function UrlDisplay({ value, className, maxLength }: UrlDisplayProps) {
  const displayValue = truncateUrl(value, maxLength ?? 48);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className="truncate font-mono text-sm text-foreground"
        title={value}
      >
        {displayValue}
      </span>
      <CopyButton value={value} label="Copy URL" />
    </div>
  );
}
