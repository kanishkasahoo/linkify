"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CopyButtonProps = {
  value: string;
  label?: string;
  size?: "icon" | "sm" | "default";
};

export function CopyButton({
  value,
  label = "Copy",
  size = "icon",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopy = async () => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={size}
            onClick={handleCopy}
            aria-label={label}
          >
            {copied ? <Check className="text-[var(--success)]" /> : <Copy />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied" : label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
