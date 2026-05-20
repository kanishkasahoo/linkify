import { getRedirectResponse } from "@/services/redirect.server";
import type { Route } from "./+types/$";

export async function loader({ params, request }: Route.LoaderArgs) {
  return getRedirectResponse(params.slug, request);
}
