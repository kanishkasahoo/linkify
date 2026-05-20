"use client";

import { useEffect, useTransition } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type BulkActionsBarProps = {
  selectedIds: string[];
  onClearSelection: () => void;
};

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
}: BulkActionsBarProps) {
  const fetcher = useFetcher<{ success: boolean; error?: string }>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!fetcher.data) {
      return;
    }
    if (!fetcher.data.success) {
      toast.error(fetcher.data.error ?? "Bulk action failed");
      return;
    }
    toast.success("Selected links updated");
    onClearSelection();
  }, [fetcher.data, onClearSelection]);

  const handleToggle = (isActive: boolean) => {
    startTransition(() => {
      const data = new FormData();
      data.set("intent", "bulk-toggle");
      data.set("ids", JSON.stringify(selectedIds));
      data.set("isActive", String(isActive));
      fetcher.submit(data, { method: "post", action: "/dashboard/links" });
    });
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        `Delete ${selectedIds.length} link${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }

    startTransition(() => {
      const data = new FormData();
      data.set("intent", "bulk-delete");
      data.set("ids", JSON.stringify(selectedIds));
      fetcher.submit(data, { method: "post", action: "/dashboard/links" });
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">
        {selectedIds.length} selected
      </span>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => handleToggle(true)}
          disabled={isPending}
        >
          Activate
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => handleToggle(false)}
          disabled={isPending}
        >
          Deactivate
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="w-full sm:w-auto"
          onClick={handleDelete}
          disabled={isPending}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
