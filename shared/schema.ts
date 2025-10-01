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

// AI-generated content for Learn pages
export const aiContent = pgTable("ai_content", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  topic: text("topic").notNull(),
  content: text("content").notNull(), // Markdown content
  summary: text("summary"), // Optional short summary
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAIContentSchema = createInsertSchema(aiContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAIContent = z.infer<typeof insertAIContentSchema>;
export type AIContent = typeof aiContent.$inferSelect;

// Market data snapshots for charts and analysis
export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // 'crypto', 'stocks', 'metals'
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  price: text("price").notNull(), // Store as text to avoid precision issues
  change24h: text("change_24h"),
  changePercent: text("change_percent"),
  marketCap: text("market_cap"),
  volume24h: text("volume_24h"),
  source: text("source").notNull(), // API source used
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  timestamp: true,
});

export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;

// Diagnostic history for health monitoring
export const diagnosticRuns = pgTable("diagnostic_runs", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id").notNull().unique(),
  status: text("status").notNull(), // 'success', 'partial', 'failure'
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: real("duration_ms"),
  checksTotal: real("checks_total").notNull(),
  checksSuccess: real("checks_success").notNull(),
  checksWarning: real("checks_warning").notNull(),
  checksError: real("checks_error").notNull(),
  fixesAttempted: real("fixes_attempted").default(0),
  fixesSucceeded: real("fixes_succeeded").default(0),
  results: jsonb("results").notNull(), // Full DiagnosticResult[] array
  triggeredBy: text("triggered_by").notNull(), // 'manual', 'scheduled', 'auto'
});

export const insertDiagnosticRunSchema = createInsertSchema(diagnosticRuns).omit({
  id: true,
});

export type InsertDiagnosticRun = z.infer<typeof insertDiagnosticRunSchema>;
export type DiagnosticRun = typeof diagnosticRuns.$inferSelect;

// Transactions table for buy/sell tracking with cost basis
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assetId: serial("asset_id").references(() => assets.id, { onDelete: 'set null' }),
  type: text("type").notNull(), // 'buy', 'sell', 'dividend', 'transfer'
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(),
  quantity: real("quantity").notNull(),
  pricePerUnit: real("price_per_unit").notNull(),
  totalAmount: real("total_amount").notNull(),
  fees: real("fees").default(0),
  notes: text("notes"),
  transactionDate: timestamp("transaction_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Wealth alerts for price changes and portfolio thresholds
export const wealthAlerts = pgTable("wealth_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  alertType: text("alert_type").notNull(), // 'price_above', 'price_below', 'portfolio_value', 'percent_change'
  symbol: text("symbol"), // null for portfolio-wide alerts
  assetType: text("asset_type"),
  threshold: real("threshold").notNull(),
  currentValue: real("current_value"),
  isActive: text("is_active").notNull().default('true'),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWealthAlertSchema = createInsertSchema(wealthAlerts).omit({
  id: true,
  createdAt: true,
});

export type InsertWealthAlert = z.infer<typeof insertWealthAlertSchema>;
export type WealthAlert = typeof wealthAlerts.$inferSelect;

// Financial goals for tracking wealth objectives
export const financialGoals = pgTable("financial_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").default(0),
  targetDate: timestamp("target_date"),
  category: text("category").notNull(), // 'retirement', 'property', 'investment', 'emergency_fund', 'other'
  status: text("status").notNull().default('active'), // 'active', 'achieved', 'paused', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFinancialGoalSchema = createInsertSchema(financialGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFinancialGoal = z.infer<typeof insertFinancialGoalSchema>;
export type FinancialGoal = typeof financialGoals.$inferSelect;

// Liabilities for net worth calculation
export const liabilities = pgTable("liabilities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'mortgage', 'loan', 'credit_card', 'other'
  amount: real("amount").notNull(),
  interestRate: real("interest_rate"),
  minimumPayment: real("minimum_payment"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLiabilitySchema = createInsertSchema(liabilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLiability = z.infer<typeof insertLiabilitySchema>;
export type Liability = typeof liabilities.$inferSelect;
