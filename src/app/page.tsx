import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <main className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Linkify
          </h1>
          <p className="text-base text-muted-foreground">
            Manage and track your short links in one place.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/login">Go to login</Link>
        </Button>
      </main>
    </div>
  );
}
