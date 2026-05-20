import { ArrowLeft } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import { ChartErrorBoundary } from "@/components/analytics/chart-error-boundary";
import { ClicksChart } from "@/components/analytics/clicks-chart";
import { CountryChart } from "@/components/analytics/country-chart";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { ReferrerTable } from "@/components/analytics/referrer-table";
import { LinkDeleteButton } from "@/components/dashboard/link-delete-button";
import { LinkFormDialog } from "@/components/dashboard/link-form";
import { QrDialog } from "@/components/dashboard/qr-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { UrlDisplay } from "@/components/shared/url-display";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth.server";
import { getLinkAnalytics } from "@/services/analytics.server";
import {
  deleteLink,
  getLinkById,
  toggleLinks,
  updateLink,
} from "@/services/links.server";
import type { DateRange } from "@/types";
import type { Route } from "./+types/dashboard.links.$id";

const isDateRange = (value?: string | null): value is DateRange =>
  value === "7d" || value === "30d" || value === "90d" || value === "all";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
};

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range");
  const dateRange: DateRange = isDateRange(rangeParam) ? rangeParam : "30d";
  const link = await getLinkById(params.id);
  if (!link) {
    throw new Response("Not Found", { status: 404 });
  }

  const analytics = await getLinkAnalytics(link.id, dateRange);

  return {
    link: {
      ...link,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    },
    analytics,
    dateRange,
    appUrl: process.env.APP_URL || "",
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update") {
    return updateLink(params.id, {
      url: formData.get("url") || undefined,
      slug: formData.get("slug") || undefined,
      expiresAt: formData.get("expiresAt") || null,
      isActive: formData.get("isActive") === "true",
    });
  }

  if (intent === "delete") {
    return deleteLink(params.id);
  }

  if (intent === "toggle") {
    return toggleLinks([params.id], formData.get("isActive") === "true");
  }

  return { success: false, error: "Invalid action" };
}

export default function LinkDetailPage() {
  const { link, analytics, dateRange, appUrl } = useLoaderData<typeof loader>();
  const shortUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/${link.slug}`
    : `/${link.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/dashboard/links"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to links
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">{link.slug}</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Short URL
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-foreground">
                  {shortUrl}
                </span>
                <CopyButton value={shortUrl} label="Copy short URL" size="sm" />
                <QrDialog
                  slug={link.slug}
                  appUrl={appUrl}
                  trigger={
                    <Button type="button" variant="outline" size="sm">
                      QR code
                    </Button>
                  }
                />
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
              action={`/dashboard/links/${link.id}`}
              initialValues={link}
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
          <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {analytics.totalClicks} clicks in this range.
          </p>
        </div>
        <DateRangePicker value={dateRange} />
      </div>

      <ChartErrorBoundary>
        <ClicksChart data={analytics.clicksByDate} />
      </ChartErrorBoundary>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Clicks by country
          </h3>
          <ChartErrorBoundary height={240}>
            <CountryChart data={analytics.clicksByCountry} />
          </ChartErrorBoundary>
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
