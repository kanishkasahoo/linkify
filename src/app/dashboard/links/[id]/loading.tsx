import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-5 w-56" />
            </div>
            <div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-5 w-72" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-[260px] w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-4 h-[240px] w-full" />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 space-y-3">
            {["ref-1", "ref-2", "ref-3", "ref-4"].map((key) => (
              <Skeleton key={key} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
