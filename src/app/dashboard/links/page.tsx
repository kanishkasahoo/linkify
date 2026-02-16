import { getLinks } from "@/actions/links";
import { LinkFormDialog } from "@/components/dashboard/link-form";
import { LinkTable } from "@/components/dashboard/link-table";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { SearchFilterBar } from "@/components/dashboard/search-filter-bar";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import type { LinkSortBy, LinkStatusFilter, SortOrder } from "@/types";

type LinksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getParam = (value?: string | string[]) => {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const isStatus = (value?: string): value is LinkStatusFilter => {
  return (
    value === "all" ||
    value === "active" ||
    value === "inactive" ||
    value === "expired"
  );
};

const isSortBy = (value?: string): value is LinkSortBy => {
  return value === "created_at" || value === "clicks" || value === "slug";
};

const isSortOrder = (value?: string): value is SortOrder => {
  return value === "asc" || value === "desc";
};

export default async function LinksPage({ searchParams }: LinksPageProps) {
  const resolvedParams = await searchParams;

  const page = toNumber(getParam(resolvedParams?.page), 1);
  const pageSizeValue = toNumber(
    getParam(resolvedParams?.pageSize),
    DEFAULT_PAGE_SIZE,
  );
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    pageSizeValue as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? pageSizeValue
    : DEFAULT_PAGE_SIZE;
  const search = getParam(resolvedParams?.search) ?? undefined;
  const statusParam = getParam(resolvedParams?.status);
  const sortByParam = getParam(resolvedParams?.sortBy);
  const sortOrderParam = getParam(resolvedParams?.sortOrder);

  const status = isStatus(statusParam) ? statusParam : "all";
  const sortBy = isSortBy(sortByParam) ? sortByParam : "created_at";
  const sortOrder = isSortOrder(sortOrderParam) ? sortOrderParam : "desc";

  const {
    links,
    total,
    page: currentPage,
    pageSize: currentPageSize,
  } = await getLinks({
    page,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const serializedLinks = links.map((link) => ({
    ...link,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Links</h1>
          <p className="text-sm text-muted-foreground">
            Manage your short links, status, and expiration settings.
          </p>
        </div>
        <LinkFormDialog
          mode="create"
          appUrl={appUrl}
          trigger={<Button className="w-full sm:w-auto">Create link</Button>}
        />
      </div>

      <SearchFilterBar
        search={search}
        status={status}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />

      <LinkTable links={serializedLinks} total={total} appUrl={appUrl} />

      <PaginationControls
        page={currentPage}
        pageSize={currentPageSize}
        total={total}
      />
    </div>
  );
}
