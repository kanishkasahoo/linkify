"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteLink } from "@/actions/links";
import { Button } from "@/components/ui/button";

type LinkDeleteButtonProps = {
  linkId: string;
  redirectTo?: Route;
  className?: string;
};

export function LinkDeleteButton({
  linkId,
  redirectTo = "/dashboard/links" as Route,
  className,
}: LinkDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm("Delete this link? This cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteLink(linkId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Link deleted");
      router.push(redirectTo);
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className={className}
    >
      <Trash2 />
      Delete
    </Button>
  );
}
