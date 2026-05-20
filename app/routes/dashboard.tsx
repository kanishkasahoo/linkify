import { BarChart3, Link2, LogOut } from "lucide-react";
import { Form, Link, Outlet, useLoaderData } from "react-router";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth.server";
import type { Route } from "./+types/dashboard";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export default function DashboardLayout() {
  const { user } = useLoaderData<typeof loader>();
  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Links",
      href: "/dashboard/links",
      icon: <Link2 className="h-4 w-4" />,
    },
  ];
  const userInitial = user.name?.[0] || user.email?.[0] || "U";

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-background">
      <div className="flex min-h-screen max-w-full">
        <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <Link2 className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">
              Linkify
            </span>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex items-center gap-3">
              <MobileNav items={navItems} />
              <span className="text-sm text-muted-foreground">Dashboard</span>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:w-auto">
              <div className="flex min-w-0 items-center gap-3 rounded-full border border-border bg-background px-3 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground">
                  {userInitial}
                </div>
                <span className="truncate text-sm text-foreground">
                  {user.name ?? user.email ?? "Admin"}
                </span>
              </div>
              <Form action="/logout" method="post">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <LogOut />
                  Logout
                </Button>
              </Form>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
