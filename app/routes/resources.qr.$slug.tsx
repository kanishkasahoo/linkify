import { requireUser } from "@/lib/auth.server";
import { generateQRCode } from "@/services/qr.server";
import type { Route } from "./+types/resources.qr.$slug";

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireUser(request);
  return generateQRCode(params.slug);
}
