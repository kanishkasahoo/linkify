import { Link, useLoaderData } from "react-router";
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
import { requireUser } from "@/lib/auth.server";
import { truncateUrl } from "@/lib/utils";
import {
  getDashboardStats,
  getRecentDashboardData,
} from "@/services/analytics.server";
import type { Route } from "./+types/dashboard._index";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const [stats, recent] = await Promise.all([
    getDashboardStats(),
    getRecentDashboardData(),
  ]);

  return {
    stats,
    recentClicks: recent.recentClicks,
    recentLinks: recent.recentLinks.map((link) => ({
      ...link,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      createdAt: link.createdAt.toISOString(),
    })),
  };
}

export default function DashboardPage() {
  const { stats, recentClicks, recentLinks } = useLoaderData<typeof loader>();

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
          <ClicksChart data={recentClicks} />
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
            to="/dashboard/links"
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
                        to={`/dashboard/links/${link.id}`}
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
