import { eq } from "drizzle-orm";

import { db } from "@/db";
import { clicks, links } from "@/db/schema";
import { cache, cacheKeys, cacheTTL } from "@/lib/cache";

const MAX_URL_LENGTH = 2048;
const MAX_REFERRER_LENGTH = 1024;

const sanitizeRedirectUrl = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const sanitizeReferrer = (input: string | null): string | null => {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const sanitized = `${parsed.origin}${parsed.pathname}`;
    return sanitized.length > MAX_REFERRER_LENGTH ? null : sanitized;
  } catch {
    return null;
  }
};

const getCountry = (request: Request): string | null => {
  const headerCountry =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry");
  const trimmed = headerCountry?.trim();
  return trimmed ? trimmed : null;
};

export async function getRedirectResponse(slug: string, request: Request) {
  const cacheKey = cacheKeys.link(slug);
  let link = cache.get<{
    id: string;
    url: string;
    isActive: boolean;
    expiresAt: Date | null;
  }>(cacheKey);

  if (!link) {
    const results = await db
      .select({
        id: links.id,
        url: links.url,
        isActive: links.isActive,
        expiresAt: links.expiresAt,
      })
      .from(links)
      .where(eq(links.slug, slug))
      .limit(1);

    link = results[0];
    if (link) {
      cache.set(cacheKey, link, cacheTTL.link);
    }
  }

  if (!link || !link.isActive) {
    return new Response("Not Found", { status: 404 });
  }

  const now = new Date();
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) {
    return new Response("Not Found", { status: 404 });
  }

  const redirectUrl = sanitizeRedirectUrl(link.url);
  if (!redirectUrl) {
    return new Response("Not Found", { status: 404 });
  }

  const country = getCountry(request);
  const referrer = sanitizeReferrer(request.headers.get("referer"));

  void db
    .insert(clicks)
    .values({
      linkId: link.id,
      country,
      referrer,
      clickedAt: now,
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("Analytics insert failed:", message);
    });

  return Response.redirect(redirectUrl, 307);
}
