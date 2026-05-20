"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useTransition } from "react";
import { useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type LinkDeleteButtonProps = {
  linkId: string;
  redirectTo?: string;
  className?: string;
};

export function LinkDeleteButton({
  linkId,
  redirectTo = "/dashboard/links",
  className,
}: LinkDeleteButtonProps) {
  const fetcher = useFetcher<{ success: boolean; error?: string }>();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!fetcher.data) {
      return;
    }
    if (!fetcher.data.success) {
      toast.error(fetcher.data.error ?? "Unable to delete link");
      return;
    }
    toast.success("Link deleted");
    navigate(redirectTo);
  }, [fetcher.data, navigate, redirectTo]);

  const handleDelete = () => {
    if (!window.confirm("Delete this link? This cannot be undone.")) {
      return;
    }

    startTransition(() => {
      const data = new FormData();
      data.set("intent", "delete");
      fetcher.submit(data, {
        method: "post",
        action: `/dashboard/links/${linkId}`,
      });
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending || fetcher.state !== "idle"}
      className={className}
    >
      <Trash2 />
      Delete
    </Button>
  );
}
