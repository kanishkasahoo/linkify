import { and, eq, gt, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { links } from "@/db/schema";
import { cache, cacheKeys, cacheTTL } from "@/lib/cache";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { SlugSchema } from "@/lib/validations";
import type { ActionResult } from "@/types";

const getAppUrl = () => {
  const value = process.env.APP_URL;
  if (!value) {
    return null;
  }
  return value.replace(/\/$/, "");
};

export async function generateQRCode(
  slug: unknown,
): Promise<ActionResult<{ dataUrl: string; shortUrl: string }>> {
  const parsed = SlugSchema.safeParse(slug);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid slug",
    };
  }

  const appUrl = getAppUrl();
  if (!appUrl) {
    return { success: false, error: "App URL is not configured" };
  }

  try {
    const cacheKey = cacheKeys.qr(parsed.data);
    const cached = cache.get<{ dataUrl: string; shortUrl: string }>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const now = new Date();
    const result = await db
      .select({ slug: links.slug })
      .from(links)
      .where(
        and(
          eq(links.slug, parsed.data),
          eq(links.isActive, true),
          or(isNull(links.expiresAt), gt(links.expiresAt, now)),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Link not found or inactive" };
    }

    const shortUrl = `${appUrl}/${parsed.data}`;
    const dataUrl = await generateQrCodeDataUrl(shortUrl);
    const qrData = { dataUrl, shortUrl };
    cache.set(cacheKey, qrData, cacheTTL.qr);
    return { success: true, data: qrData };
  } catch (error) {
    if (error) {
      console.error(error);
    }
    return { success: false, error: "Failed to generate QR code" };
  }
}
