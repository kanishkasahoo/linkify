import { completeGitHubLogin } from "@/lib/auth.server";
import type { Route } from "./+types/auth.github.callback";

export async function loader({ request }: Route.LoaderArgs) {
  return completeGitHubLogin(request);
}
