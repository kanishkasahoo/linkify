import { Form, redirect, useLoaderData } from "react-router";
import { Button } from "@/components/ui/button";
import { getUser, isSafeCallbackUrl } from "@/lib/auth.server";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  if (user) {
    throw redirect("/dashboard");
  }

  const url = new URL(request.url);
  const callbackParam = url.searchParams.get("callbackUrl");
  const callbackUrl =
    isSafeCallbackUrl(callbackParam) && callbackParam
      ? callbackParam
      : "/dashboard";
  const error = url.searchParams.get("error");

  return {
    callbackUrl,
    errorMessage:
      error === "AccessDenied"
        ? "This GitHub account is not authorized to access Linkify."
        : error === "Configuration"
          ? "GitHub OAuth is not configured. Set AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, and AUTHORIZED_GITHUB_ID."
          : error
            ? "Unable to sign in. Please try again."
            : null,
  };
}

export default function LoginPage() {
  const { callbackUrl, errorMessage } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-foreground">Linkify</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with GitHub to access your dashboard.
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            {errorMessage}
          </div>
        ) : null}

        <Form action="/auth/github" method="get" className="mt-6">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Button type="submit" className="w-full">
            Sign in with GitHub
          </Button>
        </Form>
      </div>
    </div>
  );
}
