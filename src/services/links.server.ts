import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import { clicks, links } from "@/db/schema";
import { cache, cacheKeys } from "@/lib/cache";
import { generateSlug, isReservedSlug } from "@/lib/slug";
import {
  CreateLinkSchema,
  LinkIdSchema,
  LinkIdsSchema,
  LinkListSchema,
  ToggleLinksSchema,
  UpdateLinkSchema,
} from "@/lib/validations";
import type { ActionResult, LinkWithClicks } from "@/types";

const MAX_SLUG_GENERATION_ATTEMPTS = 3;

const getActionError = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    console.error(error);
  } else if (error) {
    console.error(error);
  }
  return fallback;
};

const normalizeSearch = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const getLinkStatusConditions = (status: "active" | "inactive" | "expired") => {
  const now = new Date();
  if (status === "active") {
    return and(
      eq(links.isActive, true),
      or(isNull(links.expiresAt), gt(links.expiresAt, now)),
    );
  }
  if (status === "inactive") {
    return and(
      eq(links.isActive, false),
      or(isNull(links.expiresAt), gt(links.expiresAt, now)),
    );
  }
  return and(isNotNull(links.expiresAt), lt(links.expiresAt, now));
};

const slugExists = async (slug: string, excludeId?: string) => {
  const conditions = [eq(links.slug, slug)];
  if (excludeId) {
    conditions.push(sql`${links.id} <> ${excludeId}`);
  }

  const existing = await db
    .select({ id: links.id })
    .from(links)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0;
};

export async function createLink(
  input: unknown,
): Promise<ActionResult<LinkWithClicks>> {
  const parsed = CreateLinkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const { url, slug, expiresAt } = parsed.data;
    let finalSlug = slug?.trim();

    if (finalSlug && isReservedSlug(finalSlug)) {
      return { success: false, error: "This slug is reserved" };
    }

    if (finalSlug) {
      if (await slugExists(finalSlug)) {
        return { success: false, error: "Slug already exists" };
      }
    } else {
      for (
        let attempt = 0;
        attempt < MAX_SLUG_GENERATION_ATTEMPTS;
        attempt += 1
      ) {
        const candidate = generateSlug();
        if (!isReservedSlug(candidate) && !(await slugExists(candidate))) {
          finalSlug = candidate;
          break;
        }
      }
      if (!finalSlug) {
        return {
          success: false,
          error: "Unable to generate a unique slug. Please try again.",
        };
      }
    }

    const inserted = await db
      .insert(links)
      .values({
        slug: finalSlug,
        url: url.trim(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    cache.delete(cacheKeys.link(finalSlug));
    cache.delete(cacheKeys.stats());

    return { success: true, data: { ...inserted[0], clickCount: 0 } };
  } catch (error) {
    return {
      success: false,
      error: getActionError(error, "Failed to create link"),
    };
  }
}

export async function updateLink(
  id: unknown,
  input: unknown,
): Promise<ActionResult<LinkWithClicks>> {
  const idResult = LinkIdSchema.safeParse(id);
  if (!idResult.success) {
    return { success: false, error: "Invalid link id" };
  }

  const parsed = UpdateLinkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const existing = await db
      .select()
      .from(links)
      .where(eq(links.id, idResult.data))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Link not found" };
    }

    const updates: Partial<typeof links.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.url !== undefined) {
      updates.url = parsed.data.url.trim();
    }
    if (parsed.data.slug !== undefined) {
      const trimmed = parsed.data.slug.trim();
      if (isReservedSlug(trimmed)) {
        return { success: false, error: "This slug is reserved" };
      }
      if (
        trimmed !== existing[0].slug &&
        (await slugExists(trimmed, idResult.data))
      ) {
        return { success: false, error: "Slug already exists" };
      }
      updates.slug = trimmed;
    }
    if (parsed.data.expiresAt !== undefined) {
      updates.expiresAt = parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null;
    }
    if (parsed.data.isActive !== undefined) {
      updates.isActive = parsed.data.isActive;
    }

    const updated = await db
      .update(links)
      .set(updates)
      .where(eq(links.id, idResult.data))
      .returning();

    const clickCount = await db
      .select({ count: sql<number>`count(${clicks.id})` })
      .from(clicks)
      .where(eq(clicks.linkId, idResult.data));

    cache.delete(cacheKeys.link(existing[0].slug));
    cache.delete(cacheKeys.qr(existing[0].slug));
    if (updates.slug && updates.slug !== existing[0].slug) {
      cache.delete(cacheKeys.link(updates.slug));
      cache.delete(cacheKeys.qr(updates.slug));
    }
    cache.delete(cacheKeys.stats());

    return {
      success: true,
      data: { ...updated[0], clickCount: clickCount[0]?.count ?? 0 },
    };
  } catch (error) {
    return {
      success: false,
      error: getActionError(error, "Failed to update link"),
    };
  }
}

export async function deleteLink(
  id: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = LinkIdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid link id" };
  }

  try {
    const deleted = await db
      .delete(links)
      .where(eq(links.id, parsed.data))
      .returning({ id: links.id, slug: links.slug });

    if (deleted.length === 0) {
      return { success: false, error: "Link not found" };
    }

    cache.delete(cacheKeys.link(deleted[0].slug));
    cache.delete(cacheKeys.qr(deleted[0].slug));
    cache.delete(cacheKeys.stats());

    return { success: true, data: { id: deleted[0].id } };
  } catch (error) {
    return {
      success: false,
      error: getActionError(error, "Failed to delete link"),
    };
  }
}

export async function deleteLinks(
  ids: unknown,
): Promise<ActionResult<{ count: number }>> {
  const parsed = LinkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { success: false, error: "Invalid link selection" };
  }

  try {
    const deleted = await db
      .delete(links)
      .where(inArray(links.id, parsed.data))
      .returning({ id: links.id });

    cache.clear();

    return { success: true, data: { count: deleted.length } };
  } catch (error) {
    return {
      success: false,
      error: getActionError(error, "Failed to delete links"),
    };
  }
}

export async function toggleLinks(
  ids: unknown,
  isActive: unknown,
): Promise<ActionResult<{ count: number }>> {
  const parsed = ToggleLinksSchema.safeParse({ ids, isActive });
  if (!parsed.success) {
    return { success: false, error: "Invalid toggle request" };
  }

  try {
    const updated = await db
      .update(links)
      .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(inArray(links.id, parsed.data.ids))
      .returning({ id: links.id });

    cache.clear();

    return { success: true, data: { count: updated.length } };
  } catch (error) {
    return {
      success: false,
      error: getActionError(error, "Failed to update links"),
    };
  }
}

export async function getLinks(input: unknown): Promise<{
  links: LinkWithClicks[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const parsed = LinkListSchema.safeParse(input);
  const params = parsed.success ? parsed.data : LinkListSchema.parse({});
  const page = params.page;
  const pageSize = params.pageSize;
  const offset = (page - 1) * pageSize;
  const search = normalizeSearch(params.search);
  const conditions = [];

  if (search) {
    conditions.push(
      or(ilike(links.slug, `%${search}%`), ilike(links.url, `%${search}%`)),
    );
  }
  if (params.status !== "all") {
    conditions.push(getLinkStatusConditions(params.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const clickCount = sql<number>`count(${clicks.id})`;
  const direction = params.sortOrder === "asc" ? asc : desc;
  const orderBy =
    params.sortBy === "clicks"
      ? direction(clickCount)
      : params.sortBy === "slug"
        ? direction(links.slug)
        : direction(links.createdAt);

  let listQuery = db
    .select({
      id: links.id,
      slug: links.slug,
      url: links.url,
      isActive: links.isActive,
      expiresAt: links.expiresAt,
      createdAt: links.createdAt,
      updatedAt: links.updatedAt,
      clickCount,
    })
    .from(links)
    .leftJoin(clicks, eq(clicks.linkId, links.id))
    .$dynamic();

  if (whereClause) {
    listQuery = listQuery.where(whereClause);
  }

  const list = await listQuery
    .groupBy(links.id)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset);

  let totalQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(links)
    .$dynamic();

  if (whereClause) {
    totalQuery = totalQuery.where(whereClause);
  }

  const totalResult = await totalQuery;

  return {
    links: list,
    total: totalResult[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getLinkById(id: string) {
  const idResult = LinkIdSchema.safeParse(id);
  if (!idResult.success) {
    return null;
  }

  const result = await db
    .select({
      id: links.id,
      slug: links.slug,
      url: links.url,
      isActive: links.isActive,
      expiresAt: links.expiresAt,
      createdAt: links.createdAt,
      updatedAt: links.updatedAt,
    })
    .from(links)
    .where(eq(links.id, idResult.data))
    .limit(1);

  return result[0] ?? null;
}
