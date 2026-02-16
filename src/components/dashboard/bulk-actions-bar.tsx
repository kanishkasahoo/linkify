"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { deleteLinks, toggleLinks } from "@/actions/links";
import { Button } from "@/components/ui/button";

type BulkActionsBarProps = {
  selectedIds: string[];
  onClearSelection: () => void;
};

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
}: BulkActionsBarProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (isActive: boolean) => {
    startTransition(async () => {
      const result = await toggleLinks(selectedIds, isActive);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isActive
          ? "Selected links are now active"
          : "Selected links are now inactive",
      );
      onClearSelection();
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

    startTransition(async () => {
      const result = await deleteLinks(selectedIds);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Links deleted");
      onClearSelection();
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
