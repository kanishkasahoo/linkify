import { useLoaderData } from "react-router";
import { LinkFormDialog } from "@/components/dashboard/link-form";
import { LinkTable } from "@/components/dashboard/link-table";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { SearchFilterBar } from "@/components/dashboard/search-filter-bar";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth.server";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import {
  createLink,
  deleteLinks,
  getLinks,
  toggleLinks,
} from "@/services/links.server";
import type { LinkSortBy, LinkStatusFilter, SortOrder } from "@/types";
import type { Route } from "./+types/dashboard.links";

const getParam = (params: URLSearchParams, key: string) =>
  params.get(key) ?? undefined;

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isStatus = (value?: string): value is LinkStatusFilter =>
  value === "all" ||
  value === "active" ||
  value === "inactive" ||
  value === "expired";

const isSortBy = (value?: string): value is LinkSortBy =>
  value === "created_at" || value === "clicks" || value === "slug";

const isSortOrder = (value?: string): value is SortOrder =>
  value === "asc" || value === "desc";

const parseIds = (formData: FormData) => {
  const raw = formData.get("ids");
  if (typeof raw !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const page = toNumber(getParam(url.searchParams, "page"), 1);
  const pageSizeValue = toNumber(
    getParam(url.searchParams, "pageSize"),
    DEFAULT_PAGE_SIZE,
  );
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    pageSizeValue as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? pageSizeValue
    : DEFAULT_PAGE_SIZE;
  const search = getParam(url.searchParams, "search");
  const statusParam = getParam(url.searchParams, "status");
  const sortByParam = getParam(url.searchParams, "sortBy");
  const sortOrderParam = getParam(url.searchParams, "sortOrder");
  const status = isStatus(statusParam) ? statusParam : "all";
  const sortBy = isSortBy(sortByParam) ? sortByParam : "created_at";
  const sortOrder = isSortOrder(sortOrderParam) ? sortOrderParam : "desc";

  const result = await getLinks({
    page,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder,
  });

  return {
    ...result,
    status,
    sortBy,
    sortOrder,
    search,
    appUrl: process.env.APP_URL || "",
    links: result.links.map((link) => ({
      ...link,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    return createLink({
      url: formData.get("url"),
      slug: formData.get("slug") || undefined,
      expiresAt: formData.get("expiresAt") || undefined,
    });
  }

  if (intent === "bulk-delete") {
    return deleteLinks(parseIds(formData));
  }

  if (intent === "bulk-toggle") {
    return toggleLinks(parseIds(formData), formData.get("isActive") === "true");
  }

  return { success: false, error: "Invalid action" };
}

export default function LinksPage() {
  const {
    links,
    total,
    page,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder,
    appUrl,
  } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Links</h1>
          <p className="text-sm text-muted-foreground">
            Manage your short links, status, and expiration settings.
          </p>
        </div>
        <LinkFormDialog
          mode="create"
          appUrl={appUrl}
          action="/dashboard/links"
          trigger={
            <Button className="w-full sm:w-auto sm:shrink-0">
              Create link
            </Button>
          }
        />
      </div>

      <SearchFilterBar
        search={search}
        status={status}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />

      <LinkTable links={links} total={total} appUrl={appUrl} />

      <PaginationControls page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
