import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Links table - Short URL definitions
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 64 }).notNull(),
    url: text("url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("links_slug_unique").on(table.slug),
    index("links_is_active_idx").on(table.isActive),
    index("links_created_at_idx").on(table.createdAt),
  ],
);

// Clicks table - Analytics events (one per redirect)
export const clicks = pgTable(
  "clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2 country code
    referrer: text("referrer"),
    clickedAt: timestamp("clicked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("clicks_link_id_idx").on(table.linkId),
    index("clicks_clicked_at_idx").on(table.clickedAt),
    index("clicks_country_idx").on(table.country),
    index("clicks_link_id_clicked_at_idx").on(table.linkId, table.clickedAt),
  ],
);

// Relations
export const linksRelations = relations(links, ({ many }) => ({
  clicks: many(clicks),
}));

export const clicksRelations = relations(clicks, ({ one }) => ({
  link: one(links, {
    fields: [clicks.linkId],
    references: [links.id],
  }),
}));

// Type exports
export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Click = typeof clicks.$inferSelect;
export type NewClick = typeof clicks.$inferInsert;
