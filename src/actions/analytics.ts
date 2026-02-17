"use server";

import { and, asc, desc, eq, gt, gte, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { clicks, links } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { cache, cacheKeys, cacheTTL } from "@/lib/cache";
import { DateRangeSchema, LinkIdSchema } from "@/lib/validations";
import type { DashboardStats, DateRange, LinkAnalytics } from "@/types";

const toIsoDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const getSinceDate = (range: DateRange) => {
  if (range === "all") {
    return null;
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since;
};

const normalizeReferrer = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    const url =
      value.startsWith("http://") || value.startsWith("https://")
        ? new URL(value)
        : new URL(`https://${value}`);
    return url.hostname || null;
  } catch {
    return null;
  }
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAuth();

  // Check cache first
  const cacheKey = cacheKeys.stats();
  const cached = cache.get<DashboardStats>(cacheKey);

  if (cached) {
    return cached;
  }

  const now = new Date();
  const clickCount = sql<number>`count(${clicks.id})`;

  const [
    totalLinksResult,
    activeLinksResult,
    totalClicksResult,
    topLinkResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(links),
    db
      .select({ count: sql<number>`count(*)` })
      .from(links)
      .where(
        and(
          eq(links.isActive, true),
          or(isNull(links.expiresAt), gt(links.expiresAt, now)),
        ),
      ),
    db.select({ count: sql<number>`count(*)` }).from(clicks),
    db
      .select({
        slug: links.slug,
        url: links.url,
        clicks: clickCount,
      })
      .from(links)
      .leftJoin(clicks, eq(clicks.linkId, links.id))
      .groupBy(links.id)
      .orderBy(desc(clickCount))
      .limit(1),
  ]);

  const stats = {
    totalLinks: totalLinksResult[0]?.count ?? 0,
    activeLinks: activeLinksResult[0]?.count ?? 0,
    totalClicks: totalClicksResult[0]?.count ?? 0,
    topLink: topLinkResult[0]
      ? {
          slug: topLinkResult[0].slug,
          url: topLinkResult[0].url,
          clicks: topLinkResult[0].clicks ?? 0,
        }
      : null,
  };

  // Cache for 1 minute
  cache.set(cacheKey, stats, cacheTTL.stats);

  return stats;
}

export async function getLinkAnalytics(
  linkId: unknown,
  dateRange: unknown,
): Promise<LinkAnalytics> {
  await requireAuth();

  const idResult = LinkIdSchema.safeParse(linkId);
  const rangeResult = DateRangeSchema.safeParse(dateRange);

  if (!idResult.success || !rangeResult.success) {
    return {
      totalClicks: 0,
      clicksByDate: [],
      clicksByCountry: [],
      topReferrers: [],
    };
  }

  const since = getSinceDate(rangeResult.data);
  const conditions = [eq(clicks.linkId, idResult.data)];

  if (since) {
    conditions.push(gte(clicks.clickedAt, since));
  }

  const whereClause = and(...conditions);
  const dateBucket = sql<Date>`date_trunc('day', ${clicks.clickedAt})`;

  const [totalClicksResult, clicksByDateResult, countryResult, referrerResult] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(${clicks.id})` })
        .from(clicks)
        .where(whereClause),
      db
        .select({
          date: dateBucket,
          count: sql<number>`count(${clicks.id})`,
        })
        .from(clicks)
        .where(whereClause)
        .groupBy(dateBucket)
        .orderBy(asc(dateBucket)),
      db
        .select({
          country: clicks.country,
          count: sql<number>`count(${clicks.id})`,
        })
        .from(clicks)
        .where(whereClause)
        .groupBy(clicks.country)
        .orderBy(desc(sql<number>`count(${clicks.id})`))
        .limit(10),
      db
        .select({
          referrer: clicks.referrer,
          count: sql<number>`count(${clicks.id})`,
        })
        .from(clicks)
        .where(whereClause)
        .groupBy(clicks.referrer)
        .orderBy(desc(sql<number>`count(${clicks.id})`))
        .limit(10),
    ]);

  return {
    totalClicks: totalClicksResult[0]?.count ?? 0,
    clicksByDate: clicksByDateResult.map((item) => ({
      date: toIsoDate(item.date),
      count: item.count ?? 0,
    })),
    clicksByCountry: countryResult.map((item) => ({
      country: item.country ?? null,
      count: item.count ?? 0,
    })),
    topReferrers: referrerResult.map((item) => ({
      referrer: normalizeReferrer(item.referrer ?? null),
      count: item.count ?? 0,
    })),
  };
}
