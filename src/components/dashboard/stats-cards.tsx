import { Activity, Link2, MousePointerClick, Trophy } from "lucide-react";

import type { DashboardStats } from "@/types";

type StatsCardsProps = {
  stats: DashboardStats;
};

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total links",
      value: stats.totalLinks,
      icon: <Link2 className="h-4 w-4 text-primary" />,
    },
    {
      label: "Active links",
      value: stats.activeLinks,
      icon: <Activity className="h-4 w-4 text-[var(--success)]" />,
    },
    {
      label: "Total clicks",
      value: stats.totalClicks,
      icon: <MousePointerClick className="h-4 w-4 text-primary" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            {card.icon}
          </div>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {card.value}
          </p>
        </div>
      ))}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Top link</p>
          <Trophy className="h-4 w-4 text-[var(--warning)]" />
        </div>
        {stats.topLink ? (
          <div className="mt-3 space-y-1">
            <p className="font-mono text-sm text-foreground">
              {stats.topLink.slug}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.topLink.clicks} clicks
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No data yet</p>
        )}
      </div>
    </div>
  );
}
