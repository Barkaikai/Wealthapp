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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
