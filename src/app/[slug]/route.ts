import { notFound } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { clicks, links } from "@/db/schema";

export const runtime = "edge";

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
    if (sanitized.length > MAX_REFERRER_LENGTH) {
      return null;
    }
    return sanitized;
  } catch {
    return null;
  }
};

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const getCountry = (request: NextRequest): string | null => {
  const geoCountry = request.geo?.country?.trim();
  if (geoCountry) {
    return geoCountry;
  }

  const headerCountry =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry");
  const trimmed = headerCountry?.trim();
  return trimmed ? trimmed : null;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  let link:
    | {
        id: string;
        url: string;
        isActive: boolean;
        expiresAt: Date | null;
      }
    | undefined;
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Redirect lookup failed:", message);
    return new Response("Service Unavailable", { status: 503 });
  }

  if (!link || !link.isActive) {
    notFound();
  }

  const now = new Date();
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) {
    notFound();
  }

  const redirectUrl = sanitizeRedirectUrl(link.url);
  if (!redirectUrl) {
    notFound();
  }

  const country = getCountry(request);
  const referrerHeader = request.headers.get("referer");
  const referrer = sanitizeReferrer(referrerHeader);

  const analyticsInsert = db
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

  void analyticsInsert;

  return NextResponse.redirect(redirectUrl, 307);
}
