import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  real,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Assets table for wealth tracking
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // stocks, crypto, bonds, cash, real_estate
  value: real("value").notNull(),
  quantity: real("quantity").default(1), // Amount of shares/coins held
  allocation: real("allocation"),
  change24h: real("change_24h"),
  changePercent: real("change_percent"),
  source: text("source").default('manual'), // manual, alpha_vantage, coingecko, plaid
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Events table for financial events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // dividend, trade, alert, etc.
  details: text("details").notNull(),
  amount: real("amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Routines table for daily schedule
export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  time: text("time").notNull(), // e.g., "05:00"
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // health, wealth, productivity, personal
  duration: text("duration").notNull(), // e.g., "60 min"
  order: serial("order"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoutineSchema = createInsertSchema(routines).omit({
  id: true,
  createdAt: true,
  order: true,
});

export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type Routine = typeof routines.$inferSelect;

// Emails table (cached from Gmail)
export const emails = pgTable("emails", {
  id: text("id").primaryKey(), // Gmail message ID
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  from: text("from").notNull(),
  subject: text("subject").notNull(),
  preview: text("preview"),
  body: text("body"),
  category: text("category").notNull(), // personal, finance, investments
  draftReply: text("draft_reply"), // AI-generated draft reply (for finance/investments)
  isStarred: text("is_starred").notNull().default('false'),
  isRead: text("is_read").notNull().default('false'),
  threadId: text("thread_id"),
  receivedAt: timestamp("received_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  createdAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

// AI-generated briefings
export const briefings = pgTable("briefings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  highlights: text("highlights").array(),
  risks: text("risks").array(),
  actions: text("actions").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBriefingSchema = createInsertSchema(briefings).omit({
  id: true,
  createdAt: true,
});

export type InsertBriefing = z.infer<typeof insertBriefingSchema>;
export type Briefing = typeof briefings.$inferSelect;

// Email templates for automated replies
export const emailTemplates = pgTable("email_templates", {
  id: text("id").primaryKey(), // e.g., "INVESTMENTS_REPLY"
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  subject: text("subject").notNull(), // Can include {subject}, {name}, {topic} placeholders
  body: text("body").notNull(), // Can include {subject}, {name}, {topic} placeholders
  category: text("category"), // Which email category to use this for (finance, investments, personal)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  createdAt: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
