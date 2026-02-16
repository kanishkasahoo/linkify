import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
          404
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          Link not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The short URL you requested does not exist or is no longer active.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-muted-foreground"
          >
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
