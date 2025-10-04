import { sql } from 'drizzle-orm';
import {
  index,
  integer,
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
}, (table) => [index("idx_assets_user_id").on(table.userId)]);

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
}, (table) => [index("idx_events_user_id").on(table.userId)]);

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
}, (table) => [index("idx_routines_user_id").on(table.userId)]);

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
}, (table) => [index("idx_emails_user_id").on(table.userId)]);

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
}, (table) => [index("idx_briefings_user_id").on(table.userId)]);

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
}, (table) => [index("idx_email_templates_user_id").on(table.userId)]);

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
  assetId: integer("asset_id").references(() => assets.id, { onDelete: 'set null' }),
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
}, (table) => [index("idx_transactions_user_id").on(table.userId)]);

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
}).extend({
  assetId: z.number().nullable().optional(),
  transactionDate: z.coerce.date(),
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
}, (table) => [index("idx_wealth_alerts_user_id").on(table.userId)]);

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
}, (table) => [index("idx_financial_goals_user_id").on(table.userId)]);

export const insertFinancialGoalSchema = createInsertSchema(financialGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  targetDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
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
}, (table) => [index("idx_liabilities_user_id").on(table.userId)]);

export const insertLiabilitySchema = createInsertSchema(liabilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export type InsertLiability = z.infer<typeof insertLiabilitySchema>;
export type Liability = typeof liabilities.$inferSelect;

// Calendar events with Google Calendar sync
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  googleEventId: text("google_event_id"), // Google Calendar event ID for sync
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  attendees: text("attendees").array(), // Array of email addresses
  isAllDay: text("is_all_day").notNull().default('false'),
  recurrence: text("recurrence"), // RRULE format
  reminder: integer("reminder"), // Minutes before event
  color: text("color").default('#D4AF37'), // Gold default
  source: text("source").notNull().default('manual'), // 'manual', 'google', 'ai_suggested'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_calendar_events_user_id").on(table.userId)]);

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startTime: z.string().transform(val => new Date(val)),
  endTime: z.string().transform(val => new Date(val)),
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// Tasks and to-do items with AI assistance
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default('pending'), // 'pending', 'in_progress', 'completed', 'cancelled'
  priority: text("priority").notNull().default('medium'), // 'low', 'medium', 'high', 'urgent'
  dueDate: timestamp("due_date"),
  category: text("category"), // 'personal', 'work', 'finance', 'health', 'other'
  aiContext: text("ai_context"), // Context for AI assistance
  aiSuggestions: text("ai_suggestions"), // AI-generated suggestions
  linkedEventId: integer("linked_event_id").references(() => calendarEvents.id, { onDelete: 'set null' }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_tasks_user_id").on(table.userId)]);

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  completedAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Health metrics tracking
export const healthMetrics = pgTable("health_metrics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  metricType: text("metric_type").notNull(), // 'weight', 'blood_pressure', 'heart_rate', 'sleep', 'steps', 'exercise', 'nutrition', 'mood', 'custom'
  value: real("value").notNull(),
  unit: text("unit").notNull(), // 'kg', 'lbs', 'mmHg', 'bpm', 'hours', 'steps', 'minutes', 'calories'
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_health_metrics_user_id").on(table.userId)]);

export const insertHealthMetricSchema = createInsertSchema(healthMetrics).omit({
  id: true,
  createdAt: true,
}).extend({
  recordedAt: z.coerce.date().optional(),
});

export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;
export type HealthMetric = typeof healthMetrics.$inferSelect;

// Wallet connections for Web3 integration
export const walletConnections = pgTable("wallet_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletType: text("wallet_type").notNull(), // 'coinbase', 'hedera', 'metamask', 'walletconnect', 'other'
  walletAddress: text("wallet_address").notNull(),
  walletName: text("wallet_name"),
  chainId: text("chain_id"), // Ethereum chainId, Hedera network ID, etc.
  network: text("network"), // 'mainnet', 'testnet', 'goerli', etc.
  balance: real("balance").default(0),
  currency: text("currency").default('ETH'), // ETH, HBAR, etc.
  isActive: text("is_active").notNull().default('true'),
  lastSynced: timestamp("last_synced"),
  metadata: text("metadata"), // JSON string for additional wallet-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_wallet_connections_user_id").on(table.userId)]);

export const insertWalletConnectionSchema = createInsertSchema(walletConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWalletConnection = z.infer<typeof insertWalletConnectionSchema>;
export type WalletConnection = typeof walletConnections.$inferSelect;

// Voice commands history
export const voiceCommands = pgTable("voice_commands", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  command: text("command").notNull(),
  transcript: text("transcript").notNull(),
  action: text("action"), // Action taken by the system
  success: text("success").notNull().default('true'),
  error: text("error"),
  executedAt: timestamp("executed_at").defaultNow(),
}, (table) => [index("idx_voice_commands_user_id").on(table.userId)]);

export const insertVoiceCommandSchema = createInsertSchema(voiceCommands).omit({
  id: true,
  executedAt: true,
});

export type InsertVoiceCommand = z.infer<typeof insertVoiceCommandSchema>;
export type VoiceCommand = typeof voiceCommands.$inferSelect;

// Notes table for user-created notes
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(), // Array of tags for organization
  folder: text("folder").default('default'), // Folder organization
  isPinned: text("is_pinned").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_notes_user_id").on(table.userId)]);

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// Documents table for uploaded files metadata
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  storageKey: text("storage_key").notNull(), // Key for object storage
  fileUrl: text("file_url"), // Signed URL (temporary)
  tags: text("tags").array(),
  folder: text("folder").default('default'),
  checksum: text("checksum"), // For tamper detection
  isPinned: text("is_pinned").notNull().default('false'),
  linkedEntityType: text("linked_entity_type"), // 'asset', 'goal', 'briefing', etc.
  linkedEntityId: text("linked_entity_id"), // ID of linked entity
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_documents_user_id").on(table.userId)]);

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Document insights from AI analysis
export const documentInsights = pgTable("document_insights", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  summary: text("summary"),
  keyPoints: text("key_points").array(),
  actionItems: text("action_items").array(),
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  categories: text("categories").array(),
  extractedText: text("extracted_text"), // Full text extracted from document
  analysisModel: text("analysis_model").default('gpt-4o'), // Model used for analysis
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_document_insights_user_id").on(table.userId)]);

export const insertDocumentInsightSchema = createInsertSchema(documentInsights).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumentInsight = z.infer<typeof insertDocumentInsightSchema>;
export type DocumentInsight = typeof documentInsights.$inferSelect;

// Portfolio Reports - Auto-generated wealth summaries
export const portfolioReports = pgTable("portfolio_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  reportType: text("report_type").notNull(), // 'daily', 'weekly', 'monthly', 'custom'
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalValue: real("total_value").notNull(),
  totalChange: real("total_change").notNull(),
  totalChangePercent: real("total_change_percent").notNull(),
  assetBreakdown: jsonb("asset_breakdown").notNull(), // {stocks: x, crypto: y, bonds: z, etc}
  topGainers: text("top_gainers").array(),
  topLosers: text("top_losers").array(),
  insights: text("insights").array(), // AI-generated insights
  recommendations: text("recommendations").array(), // AI recommendations
  riskScore: real("risk_score"), // 0-100
  diversificationScore: real("diversification_score"), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_portfolio_reports_user_id").on(table.userId)]);

export const insertPortfolioReportSchema = createInsertSchema(portfolioReports).omit({
  id: true,
  createdAt: true,
}).extend({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export type InsertPortfolioReport = z.infer<typeof insertPortfolioReportSchema>;
export type PortfolioReport = typeof portfolioReports.$inferSelect;

// Trading Recommendations - AI-powered trade suggestions
export const tradingRecommendations = pgTable("trading_recommendations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(),
  action: text("action").notNull(), // 'buy', 'sell', 'hold'
  confidence: real("confidence").notNull(), // 0-100
  reasoning: text("reasoning").notNull(), // AI explanation
  targetPrice: real("target_price"),
  currentPrice: real("current_price").notNull(),
  potentialReturn: real("potential_return"), // Percentage
  riskLevel: text("risk_level").notNull(), // 'low', 'medium', 'high'
  timeHorizon: text("time_horizon"), // 'short', 'medium', 'long'
  technicalIndicators: jsonb("technical_indicators"), // RSI, MACD, etc
  marketSentiment: text("market_sentiment"), // 'bullish', 'bearish', 'neutral'
  status: text("status").notNull().default('active'), // 'active', 'executed', 'expired', 'dismissed'
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_trading_recommendations_user_id").on(table.userId)]);

export const insertTradingRecommendationSchema = createInsertSchema(tradingRecommendations).omit({
  id: true,
  createdAt: true,
}).extend({
  expiresAt: z.coerce.date().optional(),
});

export type InsertTradingRecommendation = z.infer<typeof insertTradingRecommendationSchema>;
export type TradingRecommendation = typeof tradingRecommendations.$inferSelect;

// Tax Events - Track tax implications
export const taxEvents = pgTable("tax_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  eventType: text("event_type").notNull(), // 'capital_gain', 'capital_loss', 'dividend', 'interest', 'wash_sale'
  taxYear: integer("tax_year").notNull(),
  symbol: text("symbol"),
  assetType: text("asset_type"),
  costBasis: real("cost_basis"),
  proceeds: real("proceeds"),
  gainLoss: real("gain_loss"),
  holdingPeriod: text("holding_period"), // 'short_term', 'long_term'
  taxableAmount: real("taxable_amount").notNull(),
  description: text("description").notNull(),
  notes: text("notes"),
  isReviewed: text("is_reviewed").notNull().default('false'),
  eventDate: timestamp("event_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_tax_events_user_id").on(table.userId)]);

export const insertTaxEventSchema = createInsertSchema(taxEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  eventDate: z.coerce.date(),
});

export type InsertTaxEvent = z.infer<typeof insertTaxEventSchema>;
export type TaxEvent = typeof taxEvents.$inferSelect;

// Rebalancing Recommendations - AI portfolio optimization
export const rebalancingRecommendations = pgTable("rebalancing_recommendations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  currentAllocation: jsonb("current_allocation").notNull(), // Current portfolio breakdown
  targetAllocation: jsonb("target_allocation").notNull(), // Recommended allocation
  actions: jsonb("actions").notNull(), // Array of {symbol, action, amount}
  reasoning: text("reasoning").notNull(),
  expectedBenefit: text("expected_benefit"),
  riskReduction: real("risk_reduction"), // Percentage improvement
  diversificationImprovement: real("diversification_improvement"),
  estimatedCost: real("estimated_cost"), // Transaction fees
  priority: text("priority").notNull().default('medium'), // 'low', 'medium', 'high'
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'rejected', 'executed'
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_rebalancing_recommendations_user_id").on(table.userId)]);

export const insertRebalancingRecommendationSchema = createInsertSchema(rebalancingRecommendations).omit({
  id: true,
  createdAt: true,
}).extend({
  expiresAt: z.coerce.date().optional(),
});

export type InsertRebalancingRecommendation = z.infer<typeof insertRebalancingRecommendationSchema>;
export type RebalancingRecommendation = typeof rebalancingRecommendations.$inferSelect;

// Anomaly Detections - AI-powered anomaly tracking
export const anomalyDetections = pgTable("anomaly_detections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  anomalyType: text("anomaly_type").notNull(), // 'unusual_transaction', 'price_spike', 'unusual_email', 'account_activity', 'pattern_break'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  description: text("description").notNull(),
  affectedEntity: text("affected_entity"), // Symbol, email ID, account name, etc
  entityType: text("entity_type"), // 'asset', 'transaction', 'email', 'account'
  detectedValue: real("detected_value"),
  expectedValue: real("expected_value"),
  deviation: real("deviation"), // Percentage deviation
  aiAnalysis: text("ai_analysis"), // AI explanation
  recommendations: text("recommendations").array(),
  status: text("status").notNull().default('new'), // 'new', 'investigating', 'resolved', 'false_positive'
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  notes: text("notes"),
  detectedAt: timestamp("detected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_anomaly_detections_user_id").on(table.userId)]);

export const insertAnomalyDetectionSchema = createInsertSchema(anomalyDetections).omit({
  id: true,
  detectedAt: true,
  createdAt: true,
}).extend({
  resolvedAt: z.coerce.date().optional(),
});

export type InsertAnomalyDetection = z.infer<typeof insertAnomalyDetectionSchema>;
export type AnomalyDetection = typeof anomalyDetections.$inferSelect;

// Receipts - Receipt upload and OCR analysis
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").references(() => crmOrganizations.id, { onDelete: 'set null' }),
  contactId: integer("contact_id").references(() => crmContacts.id, { onDelete: 'set null' }),
  filename: text("filename").notNull().default('receipt'),
  imageUrl: text("image_url"), // URL to stored image (if using Object Storage)
  rawText: text("raw_text"), // OCR extracted text
  merchant: text("merchant"), // AI-extracted merchant name
  amount: real("amount"), // AI-extracted amount
  currency: text("currency").default('USD'),
  receiptDate: timestamp("receipt_date"), // Date on receipt
  category: text("category"), // AI-suggested category (groceries, dining, travel, etc)
  items: text("items").array(), // Individual items from receipt
  aiAnalysis: text("ai_analysis"), // Full AI analysis and insights
  tags: text("tags").array(),
  status: text("status").notNull().default('pending'), // 'pending', 'processed', 'reviewed', 'archived'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_receipts_user_id").on(table.userId),
  index("idx_receipts_org_id").on(table.organizationId),
  index("idx_receipts_contact_id").on(table.contactId),
]);

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  receiptDate: z.coerce.date().optional(),
});

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

// Receipt Reports - AI-generated analysis reports
export const receiptReports = pgTable("receipt_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  reportType: text("report_type").notNull(), // 'monthly', 'category', 'vendor', 'custom'
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  filters: jsonb("filters"), // Category, status, amount range, etc
  aiSummary: text("ai_summary"), // GPT-4o generated summary
  insights: text("insights").array(), // Key insights from AI
  recommendations: text("recommendations").array(), // AI recommendations
  totalReceipts: integer("total_receipts"),
  totalAmount: real("total_amount"),
  categoryBreakdown: jsonb("category_breakdown"), // {groceries: 500, dining: 200, ...}
  merchantBreakdown: jsonb("merchant_breakdown"), // {Walmart: 300, Amazon: 150, ...}
  trends: jsonb("trends"), // Spending trends over time
  metadata: jsonb("metadata"),
  status: text("status").notNull().default('generating'), // 'generating', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_receipt_reports_user_id").on(table.userId),
]);

export const insertReceiptReportSchema = createInsertSchema(receiptReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type InsertReceiptReport = z.infer<typeof insertReceiptReportSchema>;
export type ReceiptReport = typeof receiptReports.$inferSelect;

// Wallet - User's personal wallet/account balance
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  balance: real("balance").notNull().default(0), // Current balance in USD
  availableBalance: real("available_balance").notNull().default(0), // Available to withdraw
  pendingBalance: real("pending_balance").notNull().default(0), // Pending deposits
  totalDeposited: real("total_deposited").notNull().default(0), // Lifetime deposits
  totalWithdrawn: real("total_withdrawn").notNull().default(0), // Lifetime withdrawals
  currency: text("currency").notNull().default('USD'),
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID
  stripeAccountId: text("stripe_account_id"), // Stripe Connect account for payouts
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_wallets_user_id").on(table.userId)]);

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

// Wallet Transactions - Deposits, withdrawals, transfers
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletId: integer("wallet_id").notNull().references(() => wallets.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'deposit', 'withdrawal', 'transfer', 'fee', 'refund'
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default('USD'),
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  paymentMethod: text("payment_method"), // 'card', 'bank_account', 'google_pay', 'apple_pay', 'wire'
  paymentMethodDetails: text("payment_method_details"), // Last 4 digits, bank name, etc
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe payment intent ID
  stripePayoutId: text("stripe_payout_id"), // Stripe payout ID for withdrawals
  bankAccountId: text("bank_account_id"), // Reference to connected bank account
  description: text("description"),
  metadata: jsonb("metadata"), // Additional data (processor response, etc)
  failureReason: text("failure_reason"), // Error message if failed
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wallet_transactions_user_id").on(table.userId),
  index("idx_wallet_transactions_wallet_id").on(table.walletId),
  index("idx_wallet_transactions_status").on(table.status),
]);

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  processedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

// Payment Methods - Saved cards, bank accounts, etc
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'card', 'bank_account', 'google_pay', 'apple_pay'
  provider: text("provider").notNull().default('stripe'), // 'stripe', 'plaid'
  stripePaymentMethodId: text("stripe_payment_method_id"), // Stripe payment method ID
  plaidAccessToken: text("plaid_access_token"), // Plaid access token (encrypted)
  plaidAccountId: text("plaid_account_id"), // Plaid account ID
  last4: text("last4"), // Last 4 digits of card/account
  brand: text("brand"), // 'visa', 'mastercard', 'amex', 'bank'
  bankName: text("bank_name"), // Name of bank
  accountType: text("account_type"), // 'checking', 'savings'
  isDefault: text("is_default").notNull().default('false'),
  isVerified: text("is_verified").notNull().default('false'),
  nickname: text("nickname"), // User-friendly name
  expiryMonth: integer("expiry_month"), // For cards
  expiryYear: integer("expiry_year"), // For cards
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_payment_methods_user_id").on(table.userId)]);

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// Step Records - Comprehensive step tracking
export const stepRecords = pgTable("step_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  steps: integer("steps").notNull(),
  distanceMeters: real("distance_meters"), // Distance in meters
  calories: real("calories"), // Estimated calories burned
  device: text("device"), // 'mobile', 'web', 'fitness_tracker'
  source: text("source").default('manual'), // 'manual', 'healthkit', 'googlefit', 'web_api'
  metadata: jsonb("metadata"), // Additional tracking data
  syncedToAI: text("synced_to_ai").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_step_records_user_id").on(table.userId)]);

export const insertStepRecordSchema = createInsertSchema(stepRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export type InsertStepRecord = z.infer<typeof insertStepRecordSchema>;
export type StepRecord = typeof stepRecords.$inferSelect;

// Cycling/Exercise Records - Detailed exercise tracking
export const exerciseRecords = pgTable("exercise_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityType: text("activity_type").notNull(), // 'cycling', 'running', 'swimming', 'workout', 'yoga', 'other'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  distanceMeters: real("distance_meters"), // Distance covered
  avgSpeedMps: real("avg_speed_mps"), // Average speed in meters per second
  maxSpeedMps: real("max_speed_mps"), // Maximum speed
  calories: real("calories"), // Calories burned
  avgHeartRate: integer("avg_heart_rate"), // Average heart rate
  maxHeartRate: integer("max_heart_rate"), // Maximum heart rate
  elevationGain: real("elevation_gain"), // Meters of elevation gained
  intensity: text("intensity"), // 'low', 'medium', 'high', 'very_high'
  notes: text("notes"),
  route: jsonb("route"), // GPS coordinates if available
  device: text("device"),
  source: text("source").default('manual'),
  metadata: jsonb("metadata"),
  syncedToAI: text("synced_to_ai").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_exercise_records_user_id").on(table.userId)]);

export const insertExerciseRecordSchema = createInsertSchema(exerciseRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  durationMinutes: z.coerce.number().positive().transform(val => Math.round(val)),
  avgHeartRate: z.coerce.number().positive().transform(val => Math.round(val)).optional().nullable(),
  maxHeartRate: z.coerce.number().positive().transform(val => Math.round(val)).optional().nullable(),
});

export type InsertExerciseRecord = z.infer<typeof insertExerciseRecordSchema>;
export type ExerciseRecord = typeof exerciseRecords.$inferSelect;

// Vitals Records - Blood pressure and body composition
export const vitalRecords = pgTable("vital_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  systolic: integer("systolic"), // Systolic blood pressure (mmHg)
  diastolic: integer("diastolic"), // Diastolic blood pressure (mmHg)
  heartRate: integer("heart_rate"), // BPM
  bodyWeightKg: real("body_weight_kg"), // Weight in kg
  bodyFatPercent: real("body_fat_percent"), // Body fat percentage
  muscleMassKg: real("muscle_mass_kg"), // Muscle mass in kg
  bmi: real("bmi"), // Body Mass Index
  bodyTemperature: real("body_temperature"), // Temperature in Celsius
  oxygenSaturation: integer("oxygen_saturation"), // SpO2 percentage
  bloodGlucose: real("blood_glucose"), // Blood glucose in mg/dL
  notes: text("notes"),
  device: text("device"),
  metadata: jsonb("metadata"),
  syncedToAI: text("synced_to_ai").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_vital_records_user_id").on(table.userId)]);

export const insertVitalRecordSchema = createInsertSchema(vitalRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  recordedAt: z.coerce.date().optional(),
});

export type InsertVitalRecord = z.infer<typeof insertVitalRecordSchema>;
export type VitalRecord = typeof vitalRecords.$inferSelect;

// Mindfulness Sessions - Meditation, breathing exercises, check-ins
export const mindfulnessSessions = pgTable("mindfulness_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at").notNull(),
  type: text("type").notNull(), // 'breathing', 'meditation', 'checkin', 'visualization', 'body_scan'
  durationMinutes: integer("duration_minutes").notNull(),
  technique: text("technique"), // Specific technique used
  moodBefore: integer("mood_before"), // 1-10 scale
  moodAfter: integer("mood_after"), // 1-10 scale
  stressLevelBefore: integer("stress_level_before"), // 1-10 scale
  stressLevelAfter: integer("stress_level_after"), // 1-10 scale
  rating: integer("rating"), // Session quality rating 1-5
  notes: text("notes"),
  guidedSession: text("guided_session").notNull().default('false'), // Whether it was guided
  guideSource: text("guide_source"), // App/video/audio used
  metadata: jsonb("metadata"),
  syncedToAI: text("synced_to_ai").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_mindfulness_sessions_user_id").on(table.userId)]);

export const insertMindfulnessSessionSchema = createInsertSchema(mindfulnessSessions).omit({
  id: true,
  createdAt: true,
}).extend({
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
});

export type InsertMindfulnessSession = z.infer<typeof insertMindfulnessSessionSchema>;
export type MindfulnessSession = typeof mindfulnessSessions.$inferSelect;

// Sleep Logs - Sleep tracking
export const sleepLogs = pgTable("sleep_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  bedtime: timestamp("bedtime").notNull(),
  wakeTime: timestamp("wake_time").notNull(),
  totalSleepMinutes: integer("total_sleep_minutes").notNull(),
  deepSleepMinutes: integer("deep_sleep_minutes"),
  lightSleepMinutes: integer("light_sleep_minutes"),
  remSleepMinutes: integer("rem_sleep_minutes"),
  awakeMinutes: integer("awake_minutes"),
  sleepQuality: integer("sleep_quality"), // 1-10 scale
  sleepScore: integer("sleep_score"), // 0-100
  interruptionsCount: integer("interruptions_count"),
  snoringDuration: integer("snoring_duration"), // Minutes
  avgHeartRate: integer("avg_heart_rate"),
  restfulnessScore: integer("restfulness_score"), // 0-100
  notes: text("notes"),
  device: text("device"),
  source: text("source").default('manual'),
  metadata: jsonb("metadata"),
  syncedToAI: text("synced_to_ai").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_sleep_logs_user_id").on(table.userId)]);

export const insertSleepLogSchema = createInsertSchema(sleepLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  bedtime: z.coerce.date(),
  wakeTime: z.coerce.date(),
  totalSleepMinutes: z.number().optional(), // Auto-calculated from bedtime/wakeTime if not provided
});

export type InsertSleepLog = z.infer<typeof insertSleepLogSchema>;
export type SleepLog = typeof sleepLogs.$inferSelect;

// Food Logs - Nutrition tracking
export const foodLogs = pgTable("food_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
  mealType: text("meal_type"), // 'breakfast', 'lunch', 'dinner', 'snack'
  foodName: text("food_name").notNull(),
  description: text("description"),
  calories: real("calories"),
  protein: real("protein"), // Grams
  carbs: real("carbs"), // Grams
  fat: real("fat"), // Grams
  fiber: real("fiber"), // Grams
  sugar: real("sugar"), // Grams
  sodium: real("sodium"), // Milligrams
  servingSize: text("serving_size"),
  servingUnit: text("serving_unit"),
  quantity: real("quantity").default(1),
  brandName: text("brand_name"),
  barcode: text("barcode"),
  notes: text("notes"),
  photoUrl: text("photo_url"), // Meal photo
  metadata: jsonb("metadata"),
  syncedToAI: text("synced_to_ai").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_food_logs_user_id").on(table.userId)]);

export const insertFoodLogSchema = createInsertSchema(foodLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  loggedAt: z.coerce.date().optional(),
});

export type InsertFoodLog = z.infer<typeof insertFoodLogSchema>;
export type FoodLog = typeof foodLogs.$inferSelect;

// AI Sync Logs - Track synchronization with AI analyzer
export const aiSyncLogs = pgTable("ai_sync_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  syncType: text("sync_type").notNull(), // 'steps', 'exercise', 'vitals', 'mindfulness', 'sleep', 'food', 'all'
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordIds: jsonb("record_ids"), // Array of processed record IDs
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  aiModel: text("ai_model").default('gpt-4o'), // AI model used
  insights: text("insights").array(), // AI-generated insights
  recommendations: text("recommendations").array(), // AI recommendations
  healthScore: integer("health_score"), // Overall health score 0-100
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_ai_sync_logs_user_id").on(table.userId)]);

export const insertAISyncLogSchema = createInsertSchema(aiSyncLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

export type InsertAISyncLog = z.infer<typeof insertAISyncLogSchema>;
export type AISyncLog = typeof aiSyncLogs.$inferSelect;

// ===== DIGITAL ACCOUNTANT TABLES =====

// Chart of Accounts
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull(), // 'asset', 'liability', 'equity', 'income', 'expense'
  currency: varchar("currency", { length: 8 }).default('USD'),
  isReconcilable: integer("is_reconcilable").default(0), // 0 = false, 1 = true
  balance: real("balance").default(0), // Running balance
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_accounts_user_id").on(table.userId),
  index("idx_accounts_code").on(table.code)
]);

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Journal Entries (Header)
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  postedAt: timestamp("posted_at").notNull().defaultNow(),
  description: text("description"),
  clientRef: varchar("client_ref", { length: 255 }), // Idempotency key
  status: varchar("status", { length: 50 }).default('posted'), // 'draft', 'posted', 'void'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_journal_entries_user_id").on(table.userId)]);

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  postedAt: z.coerce.date().optional(),
});

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

// Journal Lines (Details - Debits & Credits)
export const journalLines = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  amount: real("amount").notNull(), // Positive number
  isDebit: integer("is_debit").notNull(), // 1 = debit, 0 = credit
  currency: varchar("currency", { length: 8 }).default('USD'),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_journal_lines_entry_id").on(table.entryId),
  index("idx_journal_lines_account_id").on(table.accountId)
]);

export const insertJournalLineSchema = createInsertSchema(journalLines).omit({
  id: true,
  entryId: true, // Backend sets this after creating the parent entry
  createdAt: true,
});

export type InsertJournalLine = z.infer<typeof insertJournalLineSchema>;
export type JournalLine = typeof journalLines.$inferSelect;

// Invoices (AR)
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientRef: varchar("client_ref", { length: 255 }),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  customer: varchar("customer", { length: 255 }).notNull(),
  total: real("total").notNull(),
  currency: varchar("currency", { length: 8 }).default('USD'),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  dueAt: timestamp("due_at"),
  status: varchar("status", { length: 50 }).default('draft'), // 'draft', 'issued', 'paid', 'partially_paid', 'overdue'
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_invoices_user_id").on(table.userId)]);

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
}).extend({
  issuedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional(),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientRef: varchar("client_ref", { length: 255 }),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  amount: real("amount").notNull(),
  currency: varchar("currency", { length: 8 }).default('USD'),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
  method: varchar("method", { length: 255 }), // 'wire', 'card', 'cash', 'check'
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_payments_user_id").on(table.userId)]);

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  paidAt: z.coerce.date().optional(),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Bank Transactions (for reconciliation)
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  bankRef: varchar("bank_ref", { length: 255 }), // External reference from bank/Plaid
  amount: real("amount").notNull(),
  currency: varchar("currency", { length: 8 }).default('USD'),
  postedAt: timestamp("posted_at").notNull().defaultNow(),
  description: text("description"),
  matched: integer("matched").default(0), // 0 = unmatched, 1 = matched
  matchedToId: integer("matched_to_id"), // ID of matched payment or journal entry
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_bank_transactions_user_id").on(table.userId)]);

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  postedAt: z.coerce.date().optional(),
});

export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;

// Reconciliations
export const reconciliations = pgTable("reconciliations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  status: varchar("status", { length: 50 }).default('in_progress'), // 'in_progress', 'completed'
  statementBalance: real("statement_balance"),
  bookBalance: real("book_balance"),
  difference: real("difference"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_reconciliations_user_id").on(table.userId)]);

export const insertReconciliationSchema = createInsertSchema(reconciliations).omit({
  id: true,
  createdAt: true,
}).extend({
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
});

export type InsertReconciliation = z.infer<typeof insertReconciliationSchema>;
export type Reconciliation = typeof reconciliations.$inferSelect;

// Audit Logs for accounting actions
export const accountingAuditLogs = pgTable("accounting_audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  action: varchar("action", { length: 255 }).notNull(), // 'create_account', 'post_journal', 'create_invoice', etc.
  entityType: varchar("entity_type", { length: 100 }), // 'account', 'journal_entry', 'invoice', etc.
  entityId: integer("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_accounting_audit_logs_user_id").on(table.userId)]);

export const insertAccountingAuditLogSchema = createInsertSchema(accountingAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAccountingAuditLog = z.infer<typeof insertAccountingAuditLogSchema>;
export type AccountingAuditLog = typeof accountingAuditLogs.$inferSelect;

// CRM System Tables

// CRM Organizations
export const crmOrganizations = pgTable("crm_organizations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 400 }),
  industry: varchar("industry", { length: 100 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_crm_orgs_user_id").on(table.userId)]);

export const insertCrmOrganizationSchema = createInsertSchema(crmOrganizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCrmOrganization = z.infer<typeof insertCrmOrganizationSchema>;
export type CrmOrganization = typeof crmOrganizations.$inferSelect;

// CRM Contacts
export const crmContacts = pgTable("crm_contacts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgId: integer("org_id").references(() => crmOrganizations.id, { onDelete: 'set null' }),
  firstName: varchar("first_name", { length: 120 }),
  lastName: varchar("last_name", { length: 120 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 80 }),
  role: varchar("role", { length: 120 }), // e.g., CFO, Investor
  kycStatus: varchar("kyc_status", { length: 50 }).default('unknown'), // unknown/pending/verified
  portfolioId: varchar("portfolio_id", { length: 255 }), // link to wealth account
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_crm_contacts_user_id").on(table.userId)]);

export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>;
export type CrmContact = typeof crmContacts.$inferSelect;

// CRM Leads
export const crmLeads = pgTable("crm_leads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").references(() => crmContacts.id, { onDelete: 'set null' }),
  source: varchar("source", { length: 255 }), // e.g., "website", "referral", "email"
  status: varchar("status", { length: 50 }).default('new'), // new, contacted, qualified, lost
  notes: text("notes").default(''),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_crm_leads_user_id").on(table.userId)]);

export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmLead = typeof crmLeads.$inferSelect;

// CRM Deals
export const crmDeals = pgTable("crm_deals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  contactId: integer("contact_id").references(() => crmContacts.id, { onDelete: 'set null' }),
  orgId: integer("org_id").references(() => crmOrganizations.id, { onDelete: 'set null' }),
  amount: real("amount").default(0),
  currency: varchar("currency", { length: 8 }).default('USD'),
  stage: varchar("stage", { length: 100 }).default('prospect'), // prospect, proposal, negotiation, won, lost
  probability: real("probability").default(0.1), // 0-1
  closeDate: timestamp("close_date"),
  accountingJournalId: integer("accounting_journal_id").references(() => journalEntries.id, { onDelete: 'set null' }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_crm_deals_user_id").on(table.userId)]);

export const insertCrmDealSchema = createInsertSchema(crmDeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  closeDate: z.coerce.date().optional(),
});

export type InsertCrmDeal = z.infer<typeof insertCrmDealSchema>;
export type CrmDeal = typeof crmDeals.$inferSelect;

// CRM Activities
export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").references(() => crmContacts.id, { onDelete: 'cascade' }),
  dealId: integer("deal_id").references(() => crmDeals.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // call, email, meeting, task
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body"),
  dueAt: timestamp("due_at"),
  completed: integer("completed").default(0), // 0 or 1 for boolean
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_crm_activities_user_id").on(table.userId)]);

export const insertCrmActivitySchema = createInsertSchema(crmActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueAt: z.coerce.date().optional(),
});

export type InsertCrmActivity = z.infer<typeof insertCrmActivitySchema>;
export type CrmActivity = typeof crmActivities.$inferSelect;

// CRM Audit Logs
export const crmAuditLogs = pgTable("crm_audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: integer("entity_id"),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_crm_audit_logs_user_id").on(table.userId)]);

export const insertCrmAuditLogSchema = createInsertSchema(crmAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertCrmAuditLog = z.infer<typeof insertCrmAuditLogSchema>;
export type CrmAuditLog = typeof crmAuditLogs.$inferSelect;

// ============================================
// NFT MANAGEMENT (extends existing walletConnections table)
// ============================================

// NFT Collections - Store collection metadata
export const nftCollections = pgTable("nft_collections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  chain: varchar("chain", { length: 50 }).notNull(), // ethereum, polygon, solana, hedera
  contractAddress: varchar("contract_address", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  symbol: varchar("symbol", { length: 50 }),
  description: text("description"),
  imageUrl: text("image_url"),
  externalUrl: text("external_url"),
  floorPrice: real("floor_price"),
  totalSupply: integer("total_supply"),
  metadata: jsonb("metadata").default({}), // Additional collection data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_nft_collections_user_id").on(table.userId),
  index("idx_nft_collections_contract").on(table.contractAddress)
]);

export const insertNftCollectionSchema = createInsertSchema(nftCollections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNftCollection = z.infer<typeof insertNftCollectionSchema>;
export type NftCollection = typeof nftCollections.$inferSelect;

// NFT Assets - Store individual NFTs
export const nftAssets = pgTable("nft_assets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletId: integer("wallet_id").references(() => walletConnections.id, { onDelete: 'cascade' }),
  collectionId: integer("collection_id").references(() => nftCollections.id, { onDelete: 'set null' }),
  chain: varchar("chain", { length: 50 }).notNull(),
  contractAddress: varchar("contract_address", { length: 255 }).notNull(),
  tokenId: varchar("token_id", { length: 255 }).notNull(),
  tokenStandard: varchar("token_standard", { length: 50 }), // ERC721, ERC1155, SPL, HTS
  name: varchar("name", { length: 255 }),
  description: text("description"),
  imageUrl: text("image_url"),
  animationUrl: text("animation_url"),
  externalUrl: text("external_url"),
  attributes: jsonb("attributes").default([]), // NFT traits/attributes
  metadata: jsonb("metadata").default({}), // Full metadata object
  balance: varchar("balance", { length: 100 }).default('1'), // For ERC1155
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_nft_assets_user_id").on(table.userId),
  index("idx_nft_assets_wallet_id").on(table.walletId),
  index("idx_nft_assets_token").on(table.contractAddress, table.tokenId)
]);

export const insertNftAssetSchema = createInsertSchema(nftAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNftAsset = z.infer<typeof insertNftAssetSchema>;
export type NftAsset = typeof nftAssets.$inferSelect;

// NFT Activities - Store transfer and activity history
export const nftActivities = pgTable("nft_activities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  nftId: integer("nft_id").references(() => nftAssets.id, { onDelete: 'cascade' }),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // transfer, mint, burn, list, sale
  fromAddress: varchar("from_address", { length: 255 }),
  toAddress: varchar("to_address", { length: 255 }),
  chain: varchar("chain", { length: 50 }).notNull(),
  transactionHash: varchar("transaction_hash", { length: 255 }),
  price: real("price"),
  currency: varchar("currency", { length: 20 }),
  metadata: jsonb("metadata").default({}), // Additional activity data
  activityAt: timestamp("activity_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_nft_activities_user_id").on(table.userId),
  index("idx_nft_activities_nft_id").on(table.nftId),
  index("idx_nft_activities_tx").on(table.transactionHash)
]);

export const insertNftActivitySchema = createInsertSchema(nftActivities).omit({
  id: true,
  createdAt: true,
}).extend({
  activityAt: z.coerce.date(),
});

export type InsertNftActivity = z.infer<typeof insertNftActivitySchema>;
export type NftActivity = typeof nftActivities.$inferSelect;

// ============================================
// DISCORD INTEGRATION
// ============================================

// Discord Servers - Store connected servers
export const discordServers = pgTable("discord_servers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: varchar("server_id", { length: 255 }).notNull(),
  serverName: varchar("server_name", { length: 255 }).notNull(),
  iconUrl: text("icon_url"),
  isActive: varchar("is_active", { length: 5 }).default('true'),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_discord_servers_user_id").on(table.userId),
  index("idx_discord_servers_server_id").on(table.serverId)
]);

export const insertDiscordServerSchema = createInsertSchema(discordServers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDiscordServer = z.infer<typeof insertDiscordServerSchema>;
export type DiscordServer = typeof discordServers.$inferSelect;

// Discord Scheduled Messages - Store scheduled AI messages
export const discordScheduledMessages = pgTable("discord_scheduled_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: varchar("server_id", { length: 255 }).notNull(),
  channelId: varchar("channel_id", { length: 255 }).notNull(),
  channelName: varchar("channel_name", { length: 255 }),
  prompt: text("prompt").notNull(),
  cronTime: varchar("cron_time", { length: 100 }).notNull(), // cron expression
  isActive: varchar("is_active", { length: 5 }).default('true'),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_discord_scheduled_user_id").on(table.userId),
  index("idx_discord_scheduled_channel_id").on(table.channelId)
]);

export const insertDiscordScheduledMessageSchema = createInsertSchema(discordScheduledMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDiscordScheduledMessage = z.infer<typeof insertDiscordScheduledMessageSchema>;
export type DiscordScheduledMessage = typeof discordScheduledMessages.$inferSelect;

// ============================================
// WEALTH FORGE - SOLANA MINING COIN
// ============================================

// Wealth Forge User Progress - Track XP, level, streaks, and token balance
export const wealthForgeProgress = pgTable("wealth_forge_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  solanaWallet: varchar("solana_wallet", { length: 255 }), // User's Phantom wallet address
  nickname: varchar("nickname", { length: 100 }),
  tokens: real("tokens").default(0).notNull(), // WFG token balance
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastActiveDate: timestamp("last_active_date"),
  totalMined: real("total_mined").default(0).notNull(), // Total tokens ever mined
  totalSpent: real("total_spent").default(0).notNull(), // Total tokens spent on redemptions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wf_progress_user_id").on(table.userId),
  index("idx_wf_progress_wallet").on(table.solanaWallet)
]);

export const insertWealthForgeProgressSchema = createInsertSchema(wealthForgeProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWealthForgeProgress = z.infer<typeof insertWealthForgeProgressSchema>;
export type WealthForgeProgress = typeof wealthForgeProgress.$inferSelect;

// Wealth Forge Transactions - Track all token movements
export const wealthForgeTransactions = pgTable("wealth_forge_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // mine_free, mine_paid, purchase, redeem, bonus
  amount: real("amount").notNull(), // Positive for credits, negative for debits
  description: text("description").notNull(),
  solTxSignature: varchar("sol_tx_signature", { length: 255 }), // Solana transaction signature if paid
  mintTxSignature: varchar("mint_tx_signature", { length: 255 }), // SPL token mint signature
  metadata: jsonb("metadata").default({}), // Additional data (task completed, item redeemed, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_wf_txns_user_id").on(table.userId),
  index("idx_wf_txns_type").on(table.type),
  index("idx_wf_txns_sol_sig").on(table.solTxSignature)
]);

export const insertWealthForgeTransactionSchema = createInsertSchema(wealthForgeTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertWealthForgeTransaction = z.infer<typeof insertWealthForgeTransactionSchema>;
export type WealthForgeTransaction = typeof wealthForgeTransactions.$inferSelect;

// Wealth Forge Vault Items - Items available for redemption
export const wealthForgeVaultItems = pgTable("wealth_forge_vault_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cost: real("cost").notNull(), // Token cost to redeem
  category: varchar("category", { length: 50 }).notNull(), // template, lesson, mentor_time, premium_content
  itemType: varchar("item_type", { length: 50 }).notNull(), // pdf, video, call, access
  itemData: jsonb("item_data").default({}), // URL, file path, or access credentials
  isActive: varchar("is_active", { length: 5 }).default('true'),
  sortOrder: integer("sort_order").default(0),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wf_vault_category").on(table.category),
  index("idx_wf_vault_active").on(table.isActive)
]);

export const insertWealthForgeVaultItemSchema = createInsertSchema(wealthForgeVaultItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWealthForgeVaultItem = z.infer<typeof insertWealthForgeVaultItemSchema>;
export type WealthForgeVaultItem = typeof wealthForgeVaultItems.$inferSelect;

// Wealth Forge Redemptions - Track user redemptions
export const wealthForgeRedemptions = pgTable("wealth_forge_redemptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  vaultItemId: integer("vault_item_id").references(() => wealthForgeVaultItems.id, { onDelete: 'set null' }),
  itemName: varchar("item_name", { length: 255 }).notNull(), // Denormalized for history
  tokensCost: real("tokens_cost").notNull(),
  status: varchar("status", { length: 50 }).default('pending'), // pending, delivered, cancelled
  deliveryData: jsonb("delivery_data").default({}), // Download link, access code, etc.
  createdAt: timestamp("created_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
}, (table) => [
  index("idx_wf_redemptions_user_id").on(table.userId),
  index("idx_wf_redemptions_vault_item").on(table.vaultItemId),
  index("idx_wf_redemptions_status").on(table.status)
]);

export const insertWealthForgeRedemptionSchema = createInsertSchema(wealthForgeRedemptions).omit({
  id: true,
  createdAt: true,
});

export type InsertWealthForgeRedemption = z.infer<typeof insertWealthForgeRedemptionSchema>;
export type WealthForgeRedemption = typeof wealthForgeRedemptions.$inferSelect;

// Wealth Forge Mining History - Track individual mining sessions
export const wealthForgeMiningHistory = pgTable("wealth_forge_mining_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  miningType: varchar("mining_type", { length: 50 }).notNull(), // mini_game, quiz, task, daily_bonus
  tokensEarned: real("tokens_earned").notNull(),
  xpGained: integer("xp_gained").default(0).notNull(),
  gameScore: integer("game_score"), // For mini-games
  gameData: jsonb("game_data").default({}), // Game-specific data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_wf_mining_user_id").on(table.userId),
  index("idx_wf_mining_type").on(table.miningType),
  index("idx_wf_mining_created").on(table.createdAt)
]);

export const insertWealthForgeMiningHistorySchema = createInsertSchema(wealthForgeMiningHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertWealthForgeMiningHistory = z.infer<typeof insertWealthForgeMiningHistorySchema>;
export type WealthForgeMiningHistory = typeof wealthForgeMiningHistory.$inferSelect;

// Wealth Forge Ownership Contracts - Store ownership/legal agreements
export const wealthForgeContracts = pgTable("wealth_forge_contracts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  contractType: varchar("contract_type", { length: 100 }).default('ownership_assignment').notNull(),
  contractText: text("contract_text").notNull(),
  signedDate: timestamp("signed_date"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wf_contracts_user_id").on(table.userId),
  index("idx_wf_contracts_type").on(table.contractType)
]);

export const insertWealthForgeContractSchema = createInsertSchema(wealthForgeContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWealthForgeContract = z.infer<typeof insertWealthForgeContractSchema>;
export type WealthForgeContract = typeof wealthForgeContracts.$inferSelect;

// Wealth Forge Stripe Payments - Track bonding curve purchases via Stripe
export const wealthForgeStripePayments = pgTable("wealth_forge_stripe_payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentIntentId: varchar("payment_intent_id").unique().notNull(),
  amount: real("amount").notNull(), // Token amount purchased
  pricePerToken: real("price_per_token").notNull(), // Price at time of purchase
  totalUsd: real("total_usd").notNull(), // Total USD paid
  amountCents: integer("amount_cents").notNull(), // Stripe amount in cents
  status: varchar("status", { length: 50 }).notNull(), // pending, succeeded, failed
  currentSupply: real("current_supply").default(0).notNull(), // Supply at time of purchase
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wf_stripe_user_id").on(table.userId),
  index("idx_wf_stripe_intent_id").on(table.paymentIntentId),
  index("idx_wf_stripe_status").on(table.status)
]);

export const insertWealthForgeStripePaymentSchema = createInsertSchema(wealthForgeStripePayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWealthForgeStripePayment = z.infer<typeof insertWealthForgeStripePaymentSchema>;
export type WealthForgeStripePayment = typeof wealthForgeStripePayments.$inferSelect;

// Subscription Plans - Define available subscription tiers
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Free, Premium, Enterprise
  description: text("description"),
  tier: varchar("tier", { length: 50 }).notNull(), // free, premium, enterprise
  monthlyPrice: real("monthly_price").notNull(), // Price in USD
  annualPrice: real("annual_price"), // Annual price in USD (with discount)
  currency: varchar("currency", { length: 10 }).default('USD'),
  stripePriceIdMonthly: varchar("stripe_price_id_monthly"), // Stripe Price ID for monthly
  stripePriceIdAnnual: varchar("stripe_price_id_annual"), // Stripe Price ID for annual
  stripeProductId: varchar("stripe_product_id"), // Stripe Product ID
  features: jsonb("features").default('[]'), // Array of feature codes
  maxAssets: integer("max_assets"), // Asset limit
  maxEmails: integer("max_emails"), // Email storage limit
  aiCredits: integer("ai_credits"), // Monthly AI generation credits
  isActive: varchar("is_active", { length: 5 }).default('true'),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subscription_plans_tier").on(table.tier),
  index("idx_subscription_plans_active").on(table.isActive)
]);

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// User Subscriptions - Track user's active subscription
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").references(() => subscriptionPlans.id, { onDelete: 'set null' }),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
  status: varchar("status", { length: 50 }).notNull(), // active, trialing, past_due, canceled, incomplete
  billingInterval: varchar("billing_interval", { length: 20 }), // monthly, annual
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAt: timestamp("cancel_at"),
  canceledAt: timestamp("canceled_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  latestInvoiceId: varchar("latest_invoice_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_subscriptions_user_id").on(table.userId),
  index("idx_user_subscriptions_status").on(table.status),
  index("idx_user_subscriptions_stripe_customer").on(table.stripeCustomerId)
]);

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

// Subscription Events - Webhook audit trail
export const subscriptionEvents = pgTable("subscription_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  subscriptionId: integer("subscription_id").references(() => userSubscriptions.id, { onDelete: 'set null' }),
  eventType: varchar("event_type", { length: 100 }).notNull(), // customer.subscription.created, etc.
  stripeEventId: varchar("stripe_event_id").unique(),
  eventData: jsonb("event_data").default('{}'),
  processed: varchar("processed", { length: 5 }).default('false'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_subscription_events_user_id").on(table.userId),
  index("idx_subscription_events_type").on(table.eventType),
  index("idx_subscription_events_processed").on(table.processed)
]);

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;

// Revenue Entries - Multi-currency revenue logging
export const revenueEntries = pgTable("revenue_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  source: varchar("source", { length: 50 }).notNull(), // subscription, donation, affiliate, ads
  amount: real("amount").notNull(), // Original amount in source currency
  currency: varchar("currency", { length: 10 }).notNull(), // Original currency code
  usdValue: real("usd_value").notNull(), // Converted amount in USD
  exchangeRate: real("exchange_rate"), // Exchange rate used for conversion
  referenceId: varchar("reference_id"), // Stripe invoice ID, transaction ID, etc.
  description: text("description"),
  metadata: jsonb("metadata").default('{}'), // Additional data
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_revenue_entries_user_id").on(table.userId),
  index("idx_revenue_entries_source").on(table.source),
  index("idx_revenue_entries_occurred").on(table.occurredAt)
]);

export const insertRevenueEntrySchema = createInsertSchema(revenueEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertRevenueEntry = z.infer<typeof insertRevenueEntrySchema>;
export type RevenueEntry = typeof revenueEntries.$inferSelect;

// Revenue Reports - Email report delivery log
export const revenueReports = pgTable("revenue_reports", {
  id: serial("id").primaryKey(),
  reportType: varchar("report_type", { length: 50 }).notNull(), // daily, midday, weekly, monthly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalUsd: real("total_usd").notNull(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  reportData: jsonb("report_data").default('{}'), // Summary stats, charts data, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_revenue_reports_type").on(table.reportType),
  index("idx_revenue_reports_period").on(table.periodStart, table.periodEnd)
]);

export const insertRevenueReportSchema = createInsertSchema(revenueReports).omit({
  id: true,
  createdAt: true,
});

export type InsertRevenueReport = z.infer<typeof insertRevenueReportSchema>;
export type RevenueReport = typeof revenueReports.$inferSelect;

// Subscription Config - Flexible subscription pricing configuration
export const subscriptionConfig = pgTable("subscription_config", {
  id: serial("id").primaryKey(),
  stripePriceId: varchar("stripe_price_id"),
  priceCents: integer("price_cents").notNull().default(2499),
  currency: varchar("currency", { length: 10 }).notNull().default('usd'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionConfigSchema = createInsertSchema(subscriptionConfig).omit({
  id: true,
  updatedAt: true,
});

export type InsertSubscriptionConfig = z.infer<typeof insertSubscriptionConfigSchema>;
export type SubscriptionConfig = typeof subscriptionConfig.$inferSelect;

// Free Passes - Admin-created promotional pass codes
export const freePasses = pgTable("free_passes", {
  id: serial("id").primaryKey(),
  code: varchar("code").unique().notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  redeemedBy: varchar("redeemed_by").references(() => users.id, { onDelete: 'set null' }),
  redeemedAt: timestamp("redeemed_at"),
  note: text("note"),
}, (table) => [
  index("idx_free_passes_code").on(table.code),
  index("idx_free_passes_created_by").on(table.createdBy),
  index("idx_free_passes_redeemed_by").on(table.redeemedBy)
]);

export const insertFreePassSchema = createInsertSchema(freePasses).omit({
  id: true,
  createdAt: true,
});

export type InsertFreePass = z.infer<typeof insertFreePassSchema>;
export type FreePass = typeof freePasses.$inferSelect;

// Tax Rates - Regional tax configuration for Stripe
export const taxRates = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  regionCode: varchar("region_code").unique().notNull(), // e.g. "US-CA", "US", "DE"
  stripeTaxRateId: varchar("stripe_tax_rate_id"),
  percent: real("percent"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tax_rates_region").on(table.regionCode)
]);

export const insertTaxRateSchema = createInsertSchema(taxRates).omit({
  id: true,
  updatedAt: true,
});

export type InsertTaxRate = z.infer<typeof insertTaxRateSchema>;
export type TaxRate = typeof taxRates.$inferSelect;
