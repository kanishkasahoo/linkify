/**
 * Reserved slugs that cannot be used for short links.
 * These conflict with application routes.
 */
export const RESERVED_SLUGS = [
  "dashboard",
  "api",
  "login",
  "logout",
  "auth",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
] as const

export type ReservedSlug = (typeof RESERVED_SLUGS)[number]

/**
 * Default slug length for auto-generated NanoIDs
 */
export const SLUG_LENGTH = 8

/**
 * Slug validation constraints
 */
export const SLUG_MIN_LENGTH = 3
export const SLUG_MAX_LENGTH = 64

/**
 * URL validation constraints
 */
export const URL_MAX_LENGTH = 2048

/**
 * Dangerous URL protocols that should be blocked
 */
export const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "file:", "vbscript:"] as const

/**
 * Default page size for pagination
 */
export const DEFAULT_PAGE_SIZE = 20

/**
 * Available page size options
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
