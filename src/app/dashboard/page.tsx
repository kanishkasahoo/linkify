import Link from "next/link";
import { asc, desc, eq, gte, sql } from "drizzle-orm";

import { getDashboardStats } from "@/actions/analytics";
import { ChartErrorBoundary } from "@/components/analytics/chart-error-boundary";
import { ClicksChart } from "@/components/analytics/clicks-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { clicks, links } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { truncateUrl } from "@/lib/utils";

const toIsoDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

export default async function DashboardPage() {
  await requireAuth();

  const stats = await getDashboardStats();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const dateBucket = sql<Date>`date_trunc('day', ${clicks.clickedAt})`;
  const clickCount = sql<number>`count(${clicks.id})`;

  const [recentClicks, recentLinks] = await Promise.all([
    db
      .select({
        date: dateBucket,
        count: sql<number>`count(${clicks.id})`,
      })
      .from(clicks)
      .where(gte(clicks.clickedAt, since))
      .groupBy(dateBucket)
      .orderBy(asc(dateBucket)),
    db
      .select({
        id: links.id,
        slug: links.slug,
        url: links.url,
        isActive: links.isActive,
        expiresAt: links.expiresAt,
        createdAt: links.createdAt,
        clickCount,
      })
      .from(links)
      .leftJoin(clicks, eq(clicks.linkId, links.id))
      .groupBy(links.id)
      .orderBy(desc(links.createdAt))
      .limit(10),
  ]);

  const recentClicksSeries = recentClicks.map((item) => ({
    date: toIsoDate(item.date),
    count: item.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your links and recent performance.
        </p>
      </div>

      <StatsCards stats={stats} />

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Recent clicks
          </h2>
          <p className="text-sm text-muted-foreground">
            Click activity over the last 30 days.
          </p>
        </div>
        <ChartErrorBoundary>
          <ClicksChart data={recentClicksSeries} />
        </ChartErrorBoundary>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Recent links
            </h2>
            <p className="text-sm text-muted-foreground">
              Your 10 most recently created links.
            </p>
          </div>
          <Link
            href="/dashboard/links"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-card">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLinks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No links yet. Create a link to see analytics.
                  </TableCell>
                </TableRow>
              ) : (
                recentLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-mono text-sm text-foreground">
                      <Link
                        href={`/dashboard/links/${link.id}`}
                        className="hover:underline"
                      >
                        {link.slug}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[320px] text-sm text-foreground">
                      <span className="block truncate" title={link.url}>
                        {truncateUrl(link.url, 48)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground">
                      {link.clickCount}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        isActive={link.isActive}
                        expiresAt={link.expiresAt}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
