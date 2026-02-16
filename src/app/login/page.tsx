import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import type { Route } from "next";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    callbackUrl?: string | string[];
  }>;
};

function getStringParam(value?: string | string[]) {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

function isSafeCallbackUrl(value?: string) {
  if (!value) {
    return false;
  }

  if (!value.startsWith("/")) {
    return false;
  }

  if (value.startsWith("//") || value.startsWith("/\\")) {
    return false;
  }

  return true;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard" as Route);
  }

  const errorParam = getStringParam(resolvedSearchParams?.error);
  const callbackParam = getStringParam(resolvedSearchParams?.callbackUrl);
  const callbackUrl = isSafeCallbackUrl(callbackParam)
    ? callbackParam
    : "/dashboard";

  const errorMessage =
    errorParam === "AccessDenied"
      ? "This GitHub account is not authorized to access Linkify."
      : errorParam
        ? "Unable to sign in. Please try again."
        : null;

  const handleSignIn = async () => {
    "use server";
    await signIn("github", { redirectTo: callbackUrl });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-foreground">Linkify</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with GitHub to access your dashboard.
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-md border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive-foreground)]">
            {errorMessage}
          </div>
        ) : null}

        <form action={handleSignIn} className="mt-6">
          <Button type="submit" className="w-full">
            Sign in with GitHub
          </Button>
        </form>
      </div>
    </div>
  );
}
