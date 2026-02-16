/**
 * Link status types
 */
export type LinkStatus = "active" | "inactive" | "expired";

/**
 * Date range options for analytics filtering
 */
export type DateRange = "7d" | "30d" | "90d" | "all";

/**
 * Sort options for links
 */
export type LinkSortBy = "created_at" | "clicks" | "slug";

/**
 * Sort order
 */
export type SortOrder = "asc" | "desc";

/**
 * Link filter options
 */
export type LinkStatusFilter = "all" | "active" | "inactive" | "expired";

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Link list query parameters
 */
export interface LinkListParams extends PaginationParams {
  search?: string;
  status: LinkStatusFilter;
  sortBy: LinkSortBy;
  sortOrder: SortOrder;
}

/**
 * Server action result type
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Click analytics by date
 */
export interface ClicksByDate {
  date: string;
  count: number;
}

/**
 * Click analytics by country
 */
export interface ClicksByCountry {
  country: string | null;
  count: number;
}

/**
 * Top referrer data
 */
export interface TopReferrer {
  referrer: string | null;
  count: number;
}

/**
 * Link analytics data
 */
export interface LinkAnalytics {
  totalClicks: number;
  clicksByDate: ClicksByDate[];
  clicksByCountry: ClicksByCountry[];
  topReferrers: TopReferrer[];
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  topLink: {
    slug: string;
    url: string;
    clicks: number;
  } | null;
}

/**
 * Link with click count (for list display)
 */
export interface LinkWithClicks {
  id: string;
  slug: string;
  url: string;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clickCount: number;
}
