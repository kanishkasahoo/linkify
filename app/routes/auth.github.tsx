import { startGitHubLogin } from "@/lib/auth.server";
import type { Route } from "./+types/auth.github";

export async function loader({ request }: Route.LoaderArgs) {
  return startGitHubLogin(request);
}
