"use server";

import { and, eq, gt, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { links } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { SlugSchema } from "@/lib/validations";
import type { ActionResult } from "@/types";

const getActionError = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    console.error(error);
  } else if (error) {
    console.error(error);
  }

  return fallback;
};

export async function generateQRCode(
  slug: unknown,
): Promise<ActionResult<{ dataUrl: string; shortUrl: string }>> {
  try {
    await requireAuth();
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = SlugSchema.safeParse(slug);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, error: issue?.message ?? "Invalid slug" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { success: false, error: "App URL is not configured" };
  }

  try {
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

    const baseUrl = appUrl.replace(/\/$/, "");
    const shortUrl = `${baseUrl}/${parsed.data}`;
    const dataUrl = await generateQrCodeDataUrl(shortUrl);

    return { success: true, data: { dataUrl, shortUrl } };
  } catch (error) {
    return {
      success: false,
      error: getActionError(error, "Failed to generate QR code"),
    };
  }
}
