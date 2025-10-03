import {
  users,
  assets,
  events,
  routines,
  emails,
  briefings,
  aiContent,
  transactions,
  wealthAlerts,
  financialGoals,
  liabilities,
  calendarEvents,
  tasks,
  healthMetrics,
  walletConnections,
  voiceCommands,
  notes,
  documents,
  documentInsights,
  portfolioReports,
  tradingRecommendations,
  taxEvents,
  rebalancingRecommendations,
  anomalyDetections,
  receipts,
  wallets,
  walletTransactions,
  paymentMethods,
  stepRecords,
  exerciseRecords,
  vitalRecords,
  mindfulnessSessions,
  sleepLogs,
  foodLogs,
  aiSyncLogs,
  type User,
  type UpsertUser,
  type Asset,
  type InsertAsset,
  type Event,
  type InsertEvent,
  type Routine,
  type InsertRoutine,
  type Email,
  type InsertEmail,
  type Briefing,
  type InsertBriefing,
  type AIContent,
  type InsertAIContent,
  type Transaction,
  type InsertTransaction,
  type WealthAlert,
  type InsertWealthAlert,
  type FinancialGoal,
  type InsertFinancialGoal,
  type Liability,
  type InsertLiability,
  type CalendarEvent,
  type InsertCalendarEvent,
  type Task,
  type InsertTask,
  type HealthMetric,
  type InsertHealthMetric,
  type WalletConnection,
  type InsertWalletConnection,
  type VoiceCommand,
  type InsertVoiceCommand,
  type Note,
  type InsertNote,
  type Document,
  type InsertDocument,
  type DocumentInsight,
  type InsertDocumentInsight,
  type PortfolioReport,
  type InsertPortfolioReport,
  type TradingRecommendation,
  type InsertTradingRecommendation,
  type TaxEvent,
  type InsertTaxEvent,
  type RebalancingRecommendation,
  type InsertRebalancingRecommendation,
  type AnomalyDetection,
  type InsertAnomalyDetection,
  type Receipt,
  type InsertReceipt,
  type Wallet,
  type InsertWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type PaymentMethod,
  type InsertPaymentMethod,
  type StepRecord,
  type InsertStepRecord,
  type ExerciseRecord,
  type InsertExerciseRecord,
  type VitalRecord,
  type InsertVitalRecord,
  type MindfulnessSession,
  type InsertMindfulnessSession,
  type SleepLog,
  type InsertSleepLog,
  type FoodLog,
  type InsertFoodLog,
  type AISyncLog,
  type InsertAISyncLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Asset operations
  getAssets(userId: string): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, userId: string, asset: Partial<InsertAsset>): Promise<Asset>;
  deleteAsset(id: number, userId: string): Promise<void>;
  
  // Event operations
  getEvents(userId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  
  // Routine operations
  getRoutines(userId: string): Promise<Routine[]>;
  createRoutine(routine: InsertRoutine): Promise<Routine>;
  updateRoutine(id: number, userId: string, routine: Partial<InsertRoutine>): Promise<Routine>;
  deleteRoutine(id: number, userId: string): Promise<void>;
  
  // Email operations
  getEmails(userId: string): Promise<Email[]>;
  upsertEmail(email: InsertEmail): Promise<Email>;
  updateEmailStatus(id: string, userId: string, updates: { isStarred?: string; isRead?: string }): Promise<Email>;
  
  // Briefing operations
  getLatestBriefing(userId: string): Promise<Briefing | undefined>;
  createBriefing(briefing: InsertBriefing): Promise<Briefing>;
  
  // AI Content operations
  getContentBySlug(slug: string): Promise<AIContent | undefined>;
  createContent(content: InsertAIContent): Promise<AIContent>;
  
  // Transaction operations
  getTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: number, userId: string): Promise<void>;
  
  // Wealth Alert operations
  getWealthAlerts(userId: string): Promise<WealthAlert[]>;
  createWealthAlert(alert: InsertWealthAlert): Promise<WealthAlert>;
  updateWealthAlert(id: number, userId: string, alert: Partial<InsertWealthAlert>): Promise<WealthAlert>;
  deleteWealthAlert(id: number, userId: string): Promise<void>;
  
  // Financial Goal operations
  getFinancialGoals(userId: string): Promise<FinancialGoal[]>;
  createFinancialGoal(goal: InsertFinancialGoal): Promise<FinancialGoal>;
  updateFinancialGoal(id: number, userId: string, goal: Partial<InsertFinancialGoal>): Promise<FinancialGoal>;
  deleteFinancialGoal(id: number, userId: string): Promise<void>;
  
  // Liability operations
  getLiabilities(userId: string): Promise<Liability[]>;
  createLiability(liability: InsertLiability): Promise<Liability>;
  updateLiability(id: number, userId: string, liability: Partial<InsertLiability>): Promise<Liability>;
  deleteLiability(id: number, userId: string): Promise<void>;
  
  // Calendar Event operations
  getCalendarEvents(userId: string): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, userId: string, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number, userId: string): Promise<void>;
  
  // Task operations
  getTasks(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, userId: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number, userId: string): Promise<void>;
  
  // Health Metric operations
  getHealthMetrics(userId: string): Promise<HealthMetric[]>;
  createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric>;
  deleteHealthMetric(id: number, userId: string): Promise<void>;
  
  // Wallet Connection operations
  getWalletConnections(userId: string): Promise<WalletConnection[]>;
  createWalletConnection(wallet: InsertWalletConnection): Promise<WalletConnection>;
  updateWalletConnection(id: number, userId: string, wallet: Partial<InsertWalletConnection>): Promise<WalletConnection>;
  deleteWalletConnection(id: number, userId: string): Promise<void>;
  
  // Voice Command operations
  getVoiceCommands(userId: string, limit?: number): Promise<VoiceCommand[]>;
  createVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand>;
  
  // Note operations
  getNotes(userId: string, folder?: string): Promise<Note[]>;
  getNote(id: number, userId: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, userId: string, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number, userId: string): Promise<void>;
  
  // Document operations
  getDocuments(userId: string, folder?: string): Promise<Document[]>;
  getDocument(id: number, userId: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, userId: string, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number, userId: string): Promise<void>;
  
  // Document Insight operations
  getDocumentInsight(documentId: number, userId: string): Promise<DocumentInsight | undefined>;
  createDocumentInsight(insight: InsertDocumentInsight): Promise<DocumentInsight>;
  
  // Portfolio Report operations
  getPortfolioReports(userId: string): Promise<PortfolioReport[]>;
  getLatestPortfolioReport(userId: string): Promise<PortfolioReport | undefined>;
  createPortfolioReport(report: InsertPortfolioReport): Promise<PortfolioReport>;
  
  // Trading Recommendation operations
  getTradingRecommendations(userId: string): Promise<TradingRecommendation[]>;
  createTradingRecommendation(recommendation: InsertTradingRecommendation): Promise<TradingRecommendation>;
  updateTradingRecommendation(id: number, userId: string, recommendation: Partial<InsertTradingRecommendation>): Promise<TradingRecommendation>;
  
  // Tax Event operations
  getTaxEvents(userId: string, year?: number): Promise<TaxEvent[]>;
  createTaxEvent(event: InsertTaxEvent): Promise<TaxEvent>;
  updateTaxEvent(id: number, userId: string, event: Partial<InsertTaxEvent>): Promise<TaxEvent>;
  
  // Rebalancing Recommendation operations
  getRebalancingRecommendations(userId: string): Promise<RebalancingRecommendation[]>;
  createRebalancingRecommendation(recommendation: InsertRebalancingRecommendation): Promise<RebalancingRecommendation>;
  updateRebalancingRecommendation(id: number, userId: string, recommendation: Partial<InsertRebalancingRecommendation>): Promise<RebalancingRecommendation>;
  
  // Anomaly Detection operations
  getAnomalyDetections(userId: string, status?: string): Promise<AnomalyDetection[]>;
  createAnomalyDetection(anomaly: InsertAnomalyDetection): Promise<AnomalyDetection>;
  updateAnomalyDetection(id: number, userId: string, anomaly: Partial<InsertAnomalyDetection>): Promise<AnomalyDetection>;

  // Receipt operations
  getReceipts(userId: string, status?: string): Promise<Receipt[]>;
  getReceipt(id: number, userId: string): Promise<Receipt | undefined>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: number, userId: string, receipt: Partial<InsertReceipt>): Promise<Receipt>;
  deleteReceipt(id: number, userId: string): Promise<void>;

  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: number, wallet: Partial<InsertWallet>): Promise<Wallet>;

  // Wallet Transaction operations
  getWalletTransactions(userId: string, status?: string): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  updateWalletTransaction(id: number, transaction: Partial<InsertWalletTransaction>): Promise<WalletTransaction>;

  // Payment Method operations
  getPaymentMethods(userId: string): Promise<PaymentMethod[]>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, userId: string, method: Partial<InsertPaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by ID
    if (userData.id) {
      const existingUserById = await this.getUser(userData.id);
      
      if (existingUserById) {
        // Update existing user by ID
        const [updatedUser] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return updatedUser;
      }
    }
    
    // Check if email already exists
    if (userData.email) {
      const [existingUserByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingUserByEmail) {
        // Update existing user with new ID (Replit Auth sub changed)
        const [updatedUser] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return updatedUser;
      }
    }
    
    // No existing user, create new one
    const [newUser] = await db
      .insert(users)
      .values(userData)
      .returning();
    return newUser;
  }

  // Asset operations
  async getAssets(userId: string): Promise<Asset[]> {
    return await db.select().from(assets).where(eq(assets.userId, userId)).orderBy(desc(assets.createdAt));
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: number, userId: string, assetData: Partial<InsertAsset>): Promise<Asset> {
    const [updatedAsset] = await db
      .update(assets)
      .set({ ...assetData, updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.userId, userId)))
      .returning();
    
    if (!updatedAsset) {
      throw new Error("Asset not found or you don't have permission to update it");
    }
    
    return updatedAsset;
  }

  async deleteAsset(id: number, userId: string): Promise<void> {
    const result = await db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Asset not found or you don't have permission to delete it");
    }
  }

  // Event operations
  async getEvents(userId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.userId, userId)).orderBy(desc(events.createdAt)).limit(50);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  // Routine operations
  async getRoutines(userId: string): Promise<Routine[]> {
    return await db.select().from(routines).where(eq(routines.userId, userId)).orderBy(routines.order);
  }

  async createRoutine(routine: InsertRoutine): Promise<Routine> {
    const [newRoutine] = await db.insert(routines).values(routine).returning();
    return newRoutine;
  }

  async updateRoutine(id: number, userId: string, routineData: Partial<InsertRoutine>): Promise<Routine> {
    const [updatedRoutine] = await db
      .update(routines)
      .set(routineData)
      .where(and(eq(routines.id, id), eq(routines.userId, userId)))
      .returning();
    
    if (!updatedRoutine) {
      throw new Error("Routine not found or you don't have permission to update it");
    }
    
    return updatedRoutine;
  }

  async deleteRoutine(id: number, userId: string): Promise<void> {
    const result = await db
      .delete(routines)
      .where(and(eq(routines.id, id), eq(routines.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Routine not found or you don't have permission to delete it");
    }
  }

  // Email operations
  async getEmails(userId: string): Promise<Email[]> {
    return await db.select().from(emails).where(eq(emails.userId, userId)).orderBy(desc(emails.receivedAt)).limit(100);
  }

  async upsertEmail(emailData: InsertEmail): Promise<Email> {
    const [email] = await db
      .insert(emails)
      .values(emailData)
      .onConflictDoUpdate({
        target: emails.id,
        set: emailData,
      })
      .returning();
    return email;
  }

  async updateEmailStatus(id: string, userId: string, updates: { isStarred?: string; isRead?: string }): Promise<Email> {
    const [updatedEmail] = await db
      .update(emails)
      .set(updates)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    
    if (!updatedEmail) {
      throw new Error("Email not found or you don't have permission to update it");
    }
    
    return updatedEmail;
  }

  // Briefing operations
  async getLatestBriefing(userId: string): Promise<Briefing | undefined> {
    const [briefing] = await db
      .select()
      .from(briefings)
      .where(eq(briefings.userId, userId))
      .orderBy(desc(briefings.date))
      .limit(1);
    return briefing;
  }

  async createBriefing(briefing: InsertBriefing): Promise<Briefing> {
    const [newBriefing] = await db.insert(briefings).values(briefing).returning();
    return newBriefing;
  }

  // AI Content operations
  async getContentBySlug(slug: string): Promise<AIContent | undefined> {
    const [content] = await db
      .select()
      .from(aiContent)
      .where(eq(aiContent.slug, slug));
    return content;
  }

  async createContent(contentData: InsertAIContent): Promise<AIContent> {
    const [newContent] = await db.insert(aiContent).values(contentData).returning();
    return newContent;
  }

  // Transaction operations
  async getTransactions(userId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.transactionDate)).limit(100);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async deleteTransaction(id: number, userId: string): Promise<void> {
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  }

  // Wealth Alert operations
  async getWealthAlerts(userId: string): Promise<WealthAlert[]> {
    return await db.select().from(wealthAlerts).where(eq(wealthAlerts.userId, userId)).orderBy(desc(wealthAlerts.createdAt));
  }

  async createWealthAlert(alert: InsertWealthAlert): Promise<WealthAlert> {
    const [newAlert] = await db.insert(wealthAlerts).values(alert).returning();
    return newAlert;
  }

  async updateWealthAlert(id: number, userId: string, alert: Partial<InsertWealthAlert>): Promise<WealthAlert> {
    const [updatedAlert] = await db
      .update(wealthAlerts)
      .set({ ...alert })
      .where(and(eq(wealthAlerts.id, id), eq(wealthAlerts.userId, userId)))
      .returning();
    
    if (!updatedAlert) {
      throw new Error("Alert not found");
    }
    return updatedAlert;
  }

  async deleteWealthAlert(id: number, userId: string): Promise<void> {
    await db.delete(wealthAlerts).where(and(eq(wealthAlerts.id, id), eq(wealthAlerts.userId, userId)));
  }

  // Financial Goal operations
  async getFinancialGoals(userId: string): Promise<FinancialGoal[]> {
    return await db.select().from(financialGoals).where(eq(financialGoals.userId, userId)).orderBy(desc(financialGoals.createdAt));
  }

  async createFinancialGoal(goal: InsertFinancialGoal): Promise<FinancialGoal> {
    const [newGoal] = await db.insert(financialGoals).values(goal).returning();
    return newGoal;
  }

  async updateFinancialGoal(id: number, userId: string, goal: Partial<InsertFinancialGoal>): Promise<FinancialGoal> {
    const [updatedGoal] = await db
      .update(financialGoals)
      .set({ ...goal, updatedAt: new Date() })
      .where(and(eq(financialGoals.id, id), eq(financialGoals.userId, userId)))
      .returning();
    
    if (!updatedGoal) {
      throw new Error("Goal not found");
    }
    return updatedGoal;
  }

  async deleteFinancialGoal(id: number, userId: string): Promise<void> {
    await db.delete(financialGoals).where(and(eq(financialGoals.id, id), eq(financialGoals.userId, userId)));
  }

  // Liability operations
  async getLiabilities(userId: string): Promise<Liability[]> {
    return await db.select().from(liabilities).where(eq(liabilities.userId, userId)).orderBy(desc(liabilities.createdAt));
  }

  async createLiability(liability: InsertLiability): Promise<Liability> {
    const [newLiability] = await db.insert(liabilities).values(liability).returning();
    return newLiability;
  }

  async updateLiability(id: number, userId: string, liability: Partial<InsertLiability>): Promise<Liability> {
    const [updatedLiability] = await db
      .update(liabilities)
      .set({ ...liability, updatedAt: new Date() })
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, userId)))
      .returning();
    
    if (!updatedLiability) {
      throw new Error("Liability not found");
    }
    return updatedLiability;
  }

  async deleteLiability(id: number, userId: string): Promise<void> {
    await db.delete(liabilities).where(and(eq(liabilities.id, id), eq(liabilities.userId, userId)));
  }

  // Calendar Event operations
  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return await db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(calendarEvents.startTime);
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db.insert(calendarEvents).values(event).returning();
    return newEvent;
  }

  async updateCalendarEvent(id: number, userId: string, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [updatedEvent] = await db
      .update(calendarEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning();
    
    if (!updatedEvent) {
      throw new Error("Event not found");
    }
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number, userId: string): Promise<void> {
    await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
  }

  // Task operations
  async getTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, userId: string, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    
    if (!updatedTask) {
      throw new Error("Task not found");
    }
    return updatedTask;
  }

  async deleteTask(id: number, userId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  }

  // Health Metric operations
  async getHealthMetrics(userId: string): Promise<HealthMetric[]> {
    return await db.select().from(healthMetrics).where(eq(healthMetrics.userId, userId)).orderBy(desc(healthMetrics.recordedAt));
  }

  async createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric> {
    const [newMetric] = await db.insert(healthMetrics).values(metric).returning();
    return newMetric;
  }

  async deleteHealthMetric(id: number, userId: string): Promise<void> {
    await db.delete(healthMetrics).where(and(eq(healthMetrics.id, id), eq(healthMetrics.userId, userId)));
  }

  // Wallet Connection operations
  async getWalletConnections(userId: string): Promise<WalletConnection[]> {
    return await db.select().from(walletConnections).where(eq(walletConnections.userId, userId)).orderBy(desc(walletConnections.createdAt));
  }

  async createWalletConnection(wallet: InsertWalletConnection): Promise<WalletConnection> {
    const [newWallet] = await db.insert(walletConnections).values(wallet).returning();
    return newWallet;
  }

  async updateWalletConnection(id: number, userId: string, wallet: Partial<InsertWalletConnection>): Promise<WalletConnection> {
    const [updatedWallet] = await db
      .update(walletConnections)
      .set({ ...wallet, updatedAt: new Date() })
      .where(and(eq(walletConnections.id, id), eq(walletConnections.userId, userId)))
      .returning();
    
    if (!updatedWallet) {
      throw new Error("Wallet not found");
    }
    return updatedWallet;
  }

  async deleteWalletConnection(id: number, userId: string): Promise<void> {
    await db.delete(walletConnections).where(and(eq(walletConnections.id, id), eq(walletConnections.userId, userId)));
  }

  // Voice Command operations
  async getVoiceCommands(userId: string, limit: number = 50): Promise<VoiceCommand[]> {
    return await db.select().from(voiceCommands).where(eq(voiceCommands.userId, userId)).orderBy(desc(voiceCommands.executedAt)).limit(limit);
  }

  async createVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand> {
    const [newCommand] = await db.insert(voiceCommands).values(command).returning();
    return newCommand;
  }

  // Note operations
  async getNotes(userId: string, folder?: string): Promise<Note[]> {
    const conditions = folder 
      ? and(eq(notes.userId, userId), eq(notes.folder, folder))
      : eq(notes.userId, userId);
    return await db.select().from(notes).where(conditions).orderBy(desc(notes.updatedAt));
  }

  async getNote(id: number, userId: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return note;
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  async updateNote(id: number, userId: string, note: Partial<InsertNote>): Promise<Note> {
    const [updatedNote] = await db
      .update(notes)
      .set({ ...note, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    
    if (!updatedNote) {
      throw new Error("Note not found");
    }
    return updatedNote;
  }

  async deleteNote(id: number, userId: string): Promise<void> {
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  }

  // Document operations
  async getDocuments(userId: string, folder?: string): Promise<Document[]> {
    const conditions = folder 
      ? and(eq(documents.userId, userId), eq(documents.folder, folder))
      : eq(documents.userId, userId);
    return await db.select().from(documents).where(conditions).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number, userId: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
    return document;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async updateDocument(id: number, userId: string, document: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();
    
    if (!updatedDocument) {
      throw new Error("Document not found");
    }
    return updatedDocument;
  }

  async deleteDocument(id: number, userId: string): Promise<void> {
    await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
  }

  // Document Insight operations
  async getDocumentInsight(documentId: number, userId: string): Promise<DocumentInsight | undefined> {
    const [insight] = await db.select().from(documentInsights)
      .where(and(eq(documentInsights.documentId, documentId), eq(documentInsights.userId, userId)));
    return insight;
  }

  async createDocumentInsight(insight: InsertDocumentInsight): Promise<DocumentInsight> {
    const [newInsight] = await db.insert(documentInsights).values(insight).returning();
    return newInsight;
  }

  // Portfolio Report operations
  async getPortfolioReports(userId: string): Promise<PortfolioReport[]> {
    return await db.select().from(portfolioReports).where(eq(portfolioReports.userId, userId)).orderBy(desc(portfolioReports.createdAt));
  }

  async getLatestPortfolioReport(userId: string): Promise<PortfolioReport | undefined> {
    const [report] = await db.select().from(portfolioReports)
      .where(eq(portfolioReports.userId, userId))
      .orderBy(desc(portfolioReports.createdAt))
      .limit(1);
    return report;
  }

  async createPortfolioReport(report: InsertPortfolioReport): Promise<PortfolioReport> {
    const [newReport] = await db.insert(portfolioReports).values(report).returning();
    return newReport;
  }

  // Trading Recommendation operations
  async getTradingRecommendations(userId: string): Promise<TradingRecommendation[]> {
    return await db.select().from(tradingRecommendations)
      .where(eq(tradingRecommendations.userId, userId))
      .orderBy(desc(tradingRecommendations.createdAt));
  }

  async createTradingRecommendation(recommendation: InsertTradingRecommendation): Promise<TradingRecommendation> {
    const [newRecommendation] = await db.insert(tradingRecommendations).values(recommendation).returning();
    return newRecommendation;
  }

  async updateTradingRecommendation(id: number, userId: string, recommendation: Partial<InsertTradingRecommendation>): Promise<TradingRecommendation> {
    const [updatedRecommendation] = await db
      .update(tradingRecommendations)
      .set(recommendation)
      .where(and(eq(tradingRecommendations.id, id), eq(tradingRecommendations.userId, userId)))
      .returning();
    
    if (!updatedRecommendation) {
      throw new Error("Trading recommendation not found");
    }
    return updatedRecommendation;
  }

  // Tax Event operations
  async getTaxEvents(userId: string, year?: number): Promise<TaxEvent[]> {
    const conditions = year 
      ? and(eq(taxEvents.userId, userId), eq(taxEvents.taxYear, year))
      : eq(taxEvents.userId, userId);
    return await db.select().from(taxEvents).where(conditions).orderBy(desc(taxEvents.eventDate));
  }

  async createTaxEvent(event: InsertTaxEvent): Promise<TaxEvent> {
    const [newEvent] = await db.insert(taxEvents).values(event).returning();
    return newEvent;
  }

  async updateTaxEvent(id: number, userId: string, event: Partial<InsertTaxEvent>): Promise<TaxEvent> {
    const [updatedEvent] = await db
      .update(taxEvents)
      .set(event)
      .where(and(eq(taxEvents.id, id), eq(taxEvents.userId, userId)))
      .returning();
    
    if (!updatedEvent) {
      throw new Error("Tax event not found");
    }
    return updatedEvent;
  }

  // Rebalancing Recommendation operations
  async getRebalancingRecommendations(userId: string): Promise<RebalancingRecommendation[]> {
    return await db.select().from(rebalancingRecommendations)
      .where(eq(rebalancingRecommendations.userId, userId))
      .orderBy(desc(rebalancingRecommendations.createdAt));
  }

  async createRebalancingRecommendation(recommendation: InsertRebalancingRecommendation): Promise<RebalancingRecommendation> {
    const [newRecommendation] = await db.insert(rebalancingRecommendations).values(recommendation).returning();
    return newRecommendation;
  }

  async updateRebalancingRecommendation(id: number, userId: string, recommendation: Partial<InsertRebalancingRecommendation>): Promise<RebalancingRecommendation> {
    const [updatedRecommendation] = await db
      .update(rebalancingRecommendations)
      .set(recommendation)
      .where(and(eq(rebalancingRecommendations.id, id), eq(rebalancingRecommendations.userId, userId)))
      .returning();
    
    if (!updatedRecommendation) {
      throw new Error("Rebalancing recommendation not found");
    }
    return updatedRecommendation;
  }

  // Anomaly Detection operations
  async getAnomalyDetections(userId: string, status?: string): Promise<AnomalyDetection[]> {
    const conditions = status 
      ? and(eq(anomalyDetections.userId, userId), eq(anomalyDetections.status, status))
      : eq(anomalyDetections.userId, userId);
    return await db.select().from(anomalyDetections).where(conditions).orderBy(desc(anomalyDetections.detectedAt));
  }

  async createAnomalyDetection(anomaly: InsertAnomalyDetection): Promise<AnomalyDetection> {
    const [newAnomaly] = await db.insert(anomalyDetections).values(anomaly).returning();
    return newAnomaly;
  }

  async updateAnomalyDetection(id: number, userId: string, anomaly: Partial<InsertAnomalyDetection>): Promise<AnomalyDetection> {
    const [updatedAnomaly] = await db
      .update(anomalyDetections)
      .set(anomaly)
      .where(and(eq(anomalyDetections.id, id), eq(anomalyDetections.userId, userId)))
      .returning();
    
    if (!updatedAnomaly) {
      throw new Error("Anomaly detection not found");
    }
    return updatedAnomaly;
  }

  // Receipt operations
  async getReceipts(userId: string, status?: string): Promise<Receipt[]> {
    const conditions = status 
      ? and(eq(receipts.userId, userId), eq(receipts.status, status))
      : eq(receipts.userId, userId);
    return await db.select().from(receipts).where(conditions).orderBy(desc(receipts.createdAt));
  }

  async getReceipt(id: number, userId: string): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
    return receipt;
  }

  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    const [newReceipt] = await db.insert(receipts).values(receipt).returning();
    return newReceipt;
  }

  async updateReceipt(id: number, userId: string, receipt: Partial<InsertReceipt>): Promise<Receipt> {
    const [updatedReceipt] = await db
      .update(receipts)
      .set(receipt)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
      .returning();
    
    if (!updatedReceipt) {
      throw new Error("Receipt not found");
    }
    return updatedReceipt;
  }

  async deleteReceipt(id: number, userId: string): Promise<void> {
    await db.delete(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
  }

  // Wallet operations
  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet;
  }

  async createWallet(walletData: InsertWallet): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values(walletData).returning();
    return wallet;
  }

  async updateWallet(id: number, walletData: Partial<InsertWallet>): Promise<Wallet> {
    const [updatedWallet] = await db.update(wallets)
      .set({ ...walletData, updatedAt: new Date() })
      .where(eq(wallets.id, id))
      .returning();
    if (!updatedWallet) {
      throw new Error("Wallet not found");
    }
    return updatedWallet;
  }

  // Wallet Transaction operations
  async getWalletTransactions(userId: string, status?: string): Promise<WalletTransaction[]> {
    const conditions = status 
      ? and(eq(walletTransactions.userId, userId), eq(walletTransactions.status, status))
      : eq(walletTransactions.userId, userId);
    return await db.select().from(walletTransactions).where(conditions).orderBy(desc(walletTransactions.createdAt));
  }

  async createWalletTransaction(transactionData: InsertWalletTransaction): Promise<WalletTransaction> {
    const [transaction] = await db.insert(walletTransactions).values(transactionData).returning();
    return transaction;
  }

  async updateWalletTransaction(id: number, transactionData: Partial<InsertWalletTransaction>): Promise<WalletTransaction> {
    const [updatedTransaction] = await db.update(walletTransactions)
      .set({ ...transactionData, updatedAt: new Date() })
      .where(eq(walletTransactions.id, id))
      .returning();
    if (!updatedTransaction) {
      throw new Error("Transaction not found");
    }
    return updatedTransaction;
  }

  // Payment Method operations
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).where(eq(paymentMethods.userId, userId)).orderBy(desc(paymentMethods.createdAt));
  }

  async createPaymentMethod(methodData: InsertPaymentMethod): Promise<PaymentMethod> {
    const [method] = await db.insert(paymentMethods).values(methodData).returning();
    return method;
  }

  async updatePaymentMethod(id: number, userId: string, methodData: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
    const [updatedMethod] = await db.update(paymentMethods)
      .set({ ...methodData, updatedAt: new Date() })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)))
      .returning();
    if (!updatedMethod) {
      throw new Error("Payment method not found");
    }
    return updatedMethod;
  }

  async deletePaymentMethod(id: number, userId: string): Promise<void> {
    await db.delete(paymentMethods).where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)));
  }

  // Step Records operations
  async getStepRecords(userId: string, limit?: number): Promise<StepRecord[]> {
    const query = db.select().from(stepRecords).where(eq(stepRecords.userId, userId)).orderBy(desc(stepRecords.startTime));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createStepRecord(recordData: InsertStepRecord): Promise<StepRecord> {
    const [record] = await db.insert(stepRecords).values(recordData).returning();
    return record;
  }

  async getUnsyncedStepRecords(userId: string): Promise<StepRecord[]> {
    return await db.select().from(stepRecords).where(and(eq(stepRecords.userId, userId), eq(stepRecords.syncedToAI, 'false'))).orderBy(desc(stepRecords.startTime));
  }

  async markStepRecordsSynced(recordIds: number[]): Promise<void> {
    await db.update(stepRecords).set({ syncedToAI: 'true' }).where(sql`${stepRecords.id} = ANY(ARRAY[${recordIds.join(',')}]::int[])`);
  }

  // Exercise Records operations
  async getExerciseRecords(userId: string, limit?: number): Promise<ExerciseRecord[]> {
    const query = db.select().from(exerciseRecords).where(eq(exerciseRecords.userId, userId)).orderBy(desc(exerciseRecords.startTime));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createExerciseRecord(recordData: InsertExerciseRecord): Promise<ExerciseRecord> {
    const [record] = await db.insert(exerciseRecords).values(recordData).returning();
    return record;
  }

  async getUnsyncedExerciseRecords(userId: string): Promise<ExerciseRecord[]> {
    return await db.select().from(exerciseRecords).where(and(eq(exerciseRecords.userId, userId), eq(exerciseRecords.syncedToAI, 'false'))).orderBy(desc(exerciseRecords.startTime));
  }

  async markExerciseRecordsSynced(recordIds: number[]): Promise<void> {
    await db.update(exerciseRecords).set({ syncedToAI: 'true' }).where(sql`${exerciseRecords.id} = ANY(ARRAY[${recordIds.join(',')}]::int[])`);
  }

  // Vital Records operations
  async getVitalRecords(userId: string, limit?: number): Promise<VitalRecord[]> {
    const query = db.select().from(vitalRecords).where(eq(vitalRecords.userId, userId)).orderBy(desc(vitalRecords.recordedAt));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createVitalRecord(recordData: InsertVitalRecord): Promise<VitalRecord> {
    const [record] = await db.insert(vitalRecords).values(recordData).returning();
    return record;
  }

  async getUnsyncedVitalRecords(userId: string): Promise<VitalRecord[]> {
    return await db.select().from(vitalRecords).where(and(eq(vitalRecords.userId, userId), eq(vitalRecords.syncedToAI, 'false'))).orderBy(desc(vitalRecords.recordedAt));
  }

  async markVitalRecordsSynced(recordIds: number[]): Promise<void> {
    await db.update(vitalRecords).set({ syncedToAI: 'true' }).where(sql`${vitalRecords.id} = ANY(ARRAY[${recordIds.join(',')}]::int[])`);
  }

  // Mindfulness Sessions operations
  async getMindfulnessSessions(userId: string, limit?: number): Promise<MindfulnessSession[]> {
    const query = db.select().from(mindfulnessSessions).where(eq(mindfulnessSessions.userId, userId)).orderBy(desc(mindfulnessSessions.startedAt));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createMindfulnessSession(sessionData: InsertMindfulnessSession): Promise<MindfulnessSession> {
    const [session] = await db.insert(mindfulnessSessions).values(sessionData).returning();
    return session;
  }

  async getUnsyncedMindfulnessSessions(userId: string): Promise<MindfulnessSession[]> {
    return await db.select().from(mindfulnessSessions).where(and(eq(mindfulnessSessions.userId, userId), eq(mindfulnessSessions.syncedToAI, 'false'))).orderBy(desc(mindfulnessSessions.startedAt));
  }

  async markMindfulnessSessionsSynced(sessionIds: number[]): Promise<void> {
    await db.update(mindfulnessSessions).set({ syncedToAI: 'true' }).where(sql`${mindfulnessSessions.id} = ANY(ARRAY[${sessionIds.join(',')}]::int[])`);
  }

  // Sleep Logs operations
  async getSleepLogs(userId: string, limit?: number): Promise<SleepLog[]> {
    const query = db.select().from(sleepLogs).where(eq(sleepLogs.userId, userId)).orderBy(desc(sleepLogs.bedtime));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createSleepLog(logData: InsertSleepLog): Promise<SleepLog> {
    const [log] = await db.insert(sleepLogs).values(logData).returning();
    return log;
  }

  async getUnsyncedSleepLogs(userId: string): Promise<SleepLog[]> {
    return await db.select().from(sleepLogs).where(and(eq(sleepLogs.userId, userId), eq(sleepLogs.syncedToAI, 'false'))).orderBy(desc(sleepLogs.bedtime));
  }

  async markSleepLogsSynced(logIds: number[]): Promise<void> {
    await db.update(sleepLogs).set({ syncedToAI: 'true' }).where(sql`${sleepLogs.id} = ANY(ARRAY[${logIds.join(',')}]::int[])`);
  }

  // Food Logs operations
  async getFoodLogs(userId: string, limit?: number): Promise<FoodLog[]> {
    const query = db.select().from(foodLogs).where(eq(foodLogs.userId, userId)).orderBy(desc(foodLogs.loggedAt));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createFoodLog(logData: InsertFoodLog): Promise<FoodLog> {
    const [log] = await db.insert(foodLogs).values(logData).returning();
    return log;
  }

  async getUnsyncedFoodLogs(userId: string): Promise<FoodLog[]> {
    return await db.select().from(foodLogs).where(and(eq(foodLogs.userId, userId), eq(foodLogs.syncedToAI, 'false'))).orderBy(desc(foodLogs.loggedAt));
  }

  async markFoodLogsSynced(logIds: number[]): Promise<void> {
    await db.update(foodLogs).set({ syncedToAI: 'true' }).where(sql`${foodLogs.id} = ANY(ARRAY[${logIds.join(',')}]::int[])`);
  }

  // AI Sync Logs operations
  async getAISyncLogs(userId: string, limit?: number): Promise<AISyncLog[]> {
    const query = db.select().from(aiSyncLogs).where(eq(aiSyncLogs.userId, userId)).orderBy(desc(aiSyncLogs.startedAt));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createAISyncLog(logData: InsertAISyncLog): Promise<AISyncLog> {
    const [log] = await db.insert(aiSyncLogs).values(logData).returning();
    return log;
  }

  async updateAISyncLog(id: number, logData: Partial<InsertAISyncLog>): Promise<AISyncLog> {
    const [updatedLog] = await db.update(aiSyncLogs)
      .set(logData)
      .where(eq(aiSyncLogs.id, id))
      .returning();
    if (!updatedLog) {
      throw new Error("AI Sync Log not found");
    }
    return updatedLog;
  }
}

export const storage = new DatabaseStorage();
