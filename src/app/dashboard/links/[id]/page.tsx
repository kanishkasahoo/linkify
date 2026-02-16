import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { getLinkAnalytics } from "@/actions/analytics";
import { ClicksChart } from "@/components/analytics/clicks-chart";
import { CountryChart } from "@/components/analytics/country-chart";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { ReferrerTable } from "@/components/analytics/referrer-table";
import { LinkDeleteButton } from "@/components/dashboard/link-delete-button";
import { LinkFormDialog } from "@/components/dashboard/link-form";
import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { UrlDisplay } from "@/components/shared/url-display";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { links } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { LinkIdSchema } from "@/lib/validations";
import type { DateRange } from "@/types";

type LinkDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getParam = (value?: string | string[]) => {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
};

const isDateRange = (value?: string): value is DateRange => {
  return value === "7d" || value === "30d" || value === "90d" || value === "all";
};

const formatDateTime = (value: Date | null) => {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
};

export default async function LinkDetailPage({
  params,
  searchParams,
}: LinkDetailPageProps) {
  await requireAuth();

  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const idResult = LinkIdSchema.safeParse(resolvedParams.id);

  if (!idResult.success) {
    notFound();
  }

  const rangeParam = getParam(resolvedSearch?.range);
  const dateRange: DateRange = isDateRange(rangeParam) ? rangeParam : "30d";

  const linkResult = await db
    .select({
      id: links.id,
      slug: links.slug,
      url: links.url,
      isActive: links.isActive,
      expiresAt: links.expiresAt,
      createdAt: links.createdAt,
      updatedAt: links.updatedAt,
    })
    .from(links)
    .where(eq(links.id, idResult.data))
    .limit(1);

  if (linkResult.length === 0) {
    notFound();
  }

  const link = linkResult[0];
  const analytics = await getLinkAnalytics(link.id, dateRange);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const shortUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/${link.slug}`
    : `/${link.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/links"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to links
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          {link.slug}
        </h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Short URL</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-foreground">
                  {shortUrl}
                </span>
                <CopyButton value={shortUrl} label="Copy short URL" size="sm" />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Destination
              </p>
              <div className="mt-2">
                <UrlDisplay value={link.url} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge
                  isActive={link.isActive}
                  expiresAt={link.expiresAt}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">
                  {formatDateTime(link.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Expires</span>
                <span className="text-foreground">
                  {formatDateTime(link.expiresAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LinkFormDialog
              mode="edit"
              appUrl={appUrl}
              initialValues={{
                id: link.id,
                url: link.url,
                slug: link.slug,
                expiresAt: link.expiresAt
                  ? link.expiresAt.toISOString()
                  : null,
                isActive: link.isActive,
              }}
              trigger={
                <Button type="button" variant="outline" size="sm">
                  Edit link
                </Button>
              }
            />
            <LinkDeleteButton linkId={link.id} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            {analytics.totalClicks} clicks in this range.
          </p>
        </div>
        <DateRangePicker value={dateRange} />
      </div>

      <ClicksChart data={analytics.clicksByDate} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Clicks by country
          </h3>
          <CountryChart data={analytics.clicksByCountry} />
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Top referrers
          </h3>
          <ReferrerTable data={analytics.topReferrers} />
        </div>
      </div>
    </div>
  );
}
