import { beforeEach, describe, expect, test, vi } from "vitest";

import { cache, cacheKeys } from "@/lib/cache";

const dbMock = vi.hoisted(() => {
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));

  return {
    db: {
      select,
      insert,
    },
    limit,
    returning,
  };
});

vi.mock("@/db", () => ({
  db: dbMock.db,
}));

import { createLink } from "./links.server";

describe("createLink", () => {
  beforeEach(() => {
    cache.clear();
    vi.clearAllMocks();
  });

  test("warms the redirect cache for a newly created link", async () => {
    const inserted = {
      id: "4b6dca6d-5b9a-4ef0-9d03-b65a97b5f3f1",
      slug: "fresh-slug",
      url: "https://example.com/",
      isActive: true,
      expiresAt: null,
      createdAt: new Date("2026-05-21T00:00:00Z"),
      updatedAt: new Date("2026-05-21T00:00:00Z"),
    };

    dbMock.limit.mockResolvedValue([]);
    dbMock.returning.mockResolvedValue([inserted]);

    const result = await createLink({
      url: "https://example.com/",
      slug: "fresh-slug",
    });

    expect(result.success).toBe(true);
    expect(cache.get(cacheKeys.link("fresh-slug"))).toMatchObject({
      id: inserted.id,
      url: inserted.url,
      isActive: true,
      expiresAt: null,
    });
  });
});
