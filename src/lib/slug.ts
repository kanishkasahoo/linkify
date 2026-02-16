import {
  RESERVED_SLUGS,
  SLUG_LENGTH,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
} from "@/lib/constants";
import { customAlphabet } from "nanoid";

const SLUG_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const SLUG_REGEX = /^[a-zA-Z0-9_-]+$/;

const slugGenerator = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);

export function generateSlug() {
  return slugGenerator();
}

export function isReservedSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  return RESERVED_SLUGS.some((slug) => slug.toLowerCase() === normalized);
}

export function validateSlug(value: string) {
  const trimmed = value.trim();

  if (trimmed.length < SLUG_MIN_LENGTH) {
    return {
      valid: false,
      error: `Slug must be at least ${SLUG_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > SLUG_MAX_LENGTH) {
    return {
      valid: false,
      error: `Slug must be at most ${SLUG_MAX_LENGTH} characters`,
    };
  }

  if (!SLUG_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Slug may contain only letters, numbers, hyphens, and underscores",
    };
  }

  if (isReservedSlug(trimmed)) {
    return {
      valid: false,
      error: "This slug is reserved",
    };
  }

  return { valid: true };
}
