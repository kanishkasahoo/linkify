import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["total", "active", "clicks", "top"].map((key) => (
          <div
            key={`stat-skeleton-${key}`}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-[260px] w-full" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="space-y-3">
            {["row-1", "row-2", "row-3", "row-4"].map((key) => (
              <Skeleton key={key} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
