import { z } from "zod";

import {
  DEFAULT_PAGE_SIZE,
  DANGEROUS_PROTOCOLS,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  URL_MAX_LENGTH,
} from "@/lib/constants";
import { SLUG_REGEX, isReservedSlug } from "@/lib/slug";

const isSafeUrl = (value: string) => {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (DANGEROUS_PROTOCOLS.some((protocol) => lower.startsWith(protocol))) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidDateString = (value: string) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const isFutureDate = (value: string) => {
  return new Date(value).getTime() > Date.now();
};

const urlSchema = z
  .string()
  .trim()
  .min(1, "Destination URL is required")
  .max(URL_MAX_LENGTH, `URL must be at most ${URL_MAX_LENGTH} characters`)
  .url("Must be a valid URL")
  .refine(isSafeUrl, "Only HTTP and HTTPS URLs are allowed");

const slugSchema = z
  .string()
  .trim()
  .min(SLUG_MIN_LENGTH, `Slug must be at least ${SLUG_MIN_LENGTH} characters`)
  .max(SLUG_MAX_LENGTH, `Slug must be at most ${SLUG_MAX_LENGTH} characters`)
  .regex(
    SLUG_REGEX,
    "Slug may contain only letters, numbers, hyphens, and underscores",
  )
  .refine((value) => !isReservedSlug(value), "This slug is reserved");

const expiresAtSchema = z
  .string()
  .trim()
  .refine(isValidDateString, "Expiration must be a valid datetime")
  .refine(isFutureDate, "Expiration must be in the future");

export const CreateLinkSchema = z.object({
  url: urlSchema,
  slug: slugSchema.optional(),
  expiresAt: expiresAtSchema.optional(),
});

export const UpdateLinkSchema = z.object({
  url: urlSchema.optional(),
  slug: slugSchema.optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.union([expiresAtSchema, z.null()]).optional(),
});

export const LinkIdSchema = z.string().uuid();

export const LinkIdsSchema = z.array(LinkIdSchema).min(1);

export const ToggleLinksSchema = z.object({
  ids: LinkIdsSchema,
  isActive: z.boolean(),
});

export const LinkListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive", "expired"]).default("all"),
  sortBy: z.enum(["created_at", "clicks", "slug"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateLinkInput = z.infer<typeof CreateLinkSchema>;
export type UpdateLinkInput = z.infer<typeof UpdateLinkSchema>;
export type LinkListInput = z.infer<typeof LinkListSchema>;
