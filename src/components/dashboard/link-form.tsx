"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createLink, updateLink } from "@/actions/links";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { CreateLinkSchema } from "@/lib/validations";

type LinkFormValues = {
  url: string;
  slug: string;
  expiresAt: string;
  isActive: boolean;
};

type LinkFormErrors = Partial<Record<keyof LinkFormValues, string>>;

type LinkFormDialogProps = {
  mode: "create" | "edit";
  trigger?: React.ReactNode;
  appUrl: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialValues?: {
    id: string;
    url: string;
    slug: string;
    expiresAt: string | null;
    isActive: boolean;
  };
  className?: string;
};

const toDatetimeLocal = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
};

const defaultValues: LinkFormValues = {
  url: "",
  slug: "",
  expiresAt: "",
  isActive: true,
};

export function LinkFormDialog({
  mode,
  trigger,
  appUrl,
  open,
  onOpenChange,
  initialValues,
  className,
}: LinkFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formValues, setFormValues] = useState<LinkFormValues>(defaultValues);
  const [errors, setErrors] = useState<LinkFormErrors>({});
  const [isPending, startTransition] = useTransition();
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    if (mode === "edit" && initialValues) {
      setFormValues({
        url: initialValues.url,
        slug: initialValues.slug,
        expiresAt: toDatetimeLocal(initialValues.expiresAt),
        isActive: initialValues.isActive,
      });
    } else {
      setFormValues(defaultValues);
    }
    setErrors({});
  }, [dialogOpen, mode, initialValues]);

  const previewSlug = formValues.slug.trim() || "auto";
  const previewUrl = useMemo(() => {
    if (!appUrl) {
      return `/${previewSlug}`;
    }

    return `${appUrl.replace(/\/$/, "")}/${previewSlug}`;
  }, [appUrl, previewSlug]);

  const validate = () => {
    const nextErrors: LinkFormErrors = {};

    const result = CreateLinkSchema.safeParse({
      url: formValues.url,
      slug: formValues.slug ? formValues.slug : undefined,
      expiresAt: formValues.expiresAt ? formValues.expiresAt : undefined,
    });

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LinkFormValues;
        nextErrors[field] = issue.message;
      });
    }

    if (mode === "edit" && !formValues.slug.trim()) {
      nextErrors.slug = "Slug is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    startTransition(async () => {
      const expiresAtValue = formValues.expiresAt.trim();

      const payload = {
        url: formValues.url.trim(),
        slug: formValues.slug.trim() || undefined,
        expiresAt:
          mode === "create"
            ? expiresAtValue || undefined
            : expiresAtValue || null,
        isActive: formValues.isActive,
      };

      const result =
        mode === "create"
          ? await createLink(payload)
          : await updateLink(initialValues?.id, payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "create" ? "Link created" : "Link updated");
      if (mode === "create") {
        handleOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create new link" : "Edit link"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Shorten a URL and optionally set a custom slug."
              : "Update your destination, slug, and status."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
          <div className="space-y-2 min-w-0 w-full">
            <Label htmlFor="url">Destination URL</Label>
            <Input
              id="url"
              value={formValues.url}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, url: event.target.value }))
              }
              placeholder="https://"
            />
            {errors.url ? (
              <p className="text-xs text-destructive">{errors.url}</p>
            ) : null}
          </div>

          <div className="space-y-2 min-w-0 w-full">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug">Custom slug</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFormValues((prev) => ({ ...prev, slug: generateSlug() }))
                }
              >
                <RotateCw />
                Generate
              </Button>
            </div>
            <Input
              id="slug"
              value={formValues.slug}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, slug: event.target.value }))
              }
              placeholder={mode === "create" ? "Auto-generated" : "custom-slug"}
            />
            <p className="text-xs text-muted-foreground min-w-0 overflow-hidden">
              Preview: <span className="font-mono break-all">{previewUrl}</span>
            </p>
            {errors.slug ? (
              <p className="text-xs text-destructive">{errors.slug}</p>
            ) : null}
          </div>

          <div className="space-y-2 min-w-0 w-full">
            <Label htmlFor="expiresAt">Expiration (UTC)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formValues.expiresAt}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  expiresAt: event.target.value,
                }))
              }
            />
            {errors.expiresAt ? (
              <p className="text-xs text-destructive">{errors.expiresAt}</p>
            ) : null}
          </div>

          {mode === "edit" ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={formValues.isActive}
                onCheckedChange={(value) =>
                  setFormValues((prev) => ({
                    ...prev,
                    isActive: Boolean(value),
                  }))
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {mode === "create" ? "Create link" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
