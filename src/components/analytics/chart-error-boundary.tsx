"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ChartErrorBoundaryProps = {
  children: React.ReactNode;
  className?: string;
  height?: number;
  message?: string;
};

type ChartErrorBoundaryState = {
  hasError: boolean;
};

export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Chart render failed", error);
  }

  render() {
    const { hasError } = this.state;
    const {
      children,
      className,
      height = 260,
      message = "Chart unavailable. Try refreshing.",
    } = this.props;

    if (hasError) {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground",
            className,
          )}
          style={{ height }}
        >
          {message}
        </div>
      );
    }

    return children;
  }
}
