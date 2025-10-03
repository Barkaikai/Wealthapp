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
}, (table) => [index("idx_receipts_user_id").on(table.userId)]);

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  receiptDate: z.coerce.date().optional(),
});

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

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
