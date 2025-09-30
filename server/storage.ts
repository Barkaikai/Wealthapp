import {
  users,
  assets,
  events,
  routines,
  emails,
  briefings,
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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
}

export const storage = new DatabaseStorage();
