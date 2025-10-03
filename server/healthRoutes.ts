import express, { Request, Response } from 'express';
import { storage } from './storage';
import { healthSync } from './healthSync';
import {
  insertStepRecordSchema,
  insertExerciseRecordSchema,
  insertVitalRecordSchema,
  insertMindfulnessSessionSchema,
  insertSleepLogSchema,
  insertFoodLogSchema,
} from '@shared/schema';

const router = express.Router();

// Middleware to check authentication
function isAuthenticated(req: any, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// === STEP RECORDS ===
router.get('/health/steps', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const records = await storage.getStepRecords(userId, limit);
    res.json(records);
  } catch (error: any) {
    console.error("Error fetching step records:", error);
    res.status(500).json({ message: error.message || "Failed to fetch step records" });
  }
});

router.post('/health/steps', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validated = insertStepRecordSchema.parse({ ...req.body, userId });
    
    // Calculate calories if not provided
    if (!validated.calories && validated.steps) {
      validated.calories = Math.round(validated.steps * 0.04); // ~0.04 cal per step
    }
    
    const record = await storage.createStepRecord(validated);
    
    // Trigger background sync
    setTimeout(() => healthSync.syncUserHealthData(userId, 'steps').catch(console.error), 100);
    
    res.json(record);
  } catch (error: any) {
    console.error("Error creating step record:", error);
    res.status(400).json({ message: error.message || "Failed to create step record" });
  }
});

// === EXERCISE RECORDS ===
router.get('/health/exercise', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const records = await storage.getExerciseRecords(userId, limit);
    res.json(records);
  } catch (error: any) {
    console.error("Error fetching exercise records:", error);
    res.status(500).json({ message: error.message || "Failed to fetch exercise records" });
  }
});

router.post('/health/exercise', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validated = insertExerciseRecordSchema.parse({ ...req.body, userId });
    
    // Calculate duration if times are provided
    if (validated.startTime && validated.endTime && !validated.durationMinutes) {
      const durationMs = new Date(validated.endTime).getTime() - new Date(validated.startTime).getTime();
      validated.durationMinutes = Math.round(durationMs / 60000);
    }
    
    const record = await storage.createExerciseRecord(validated);
    
    // Trigger background sync
    setTimeout(() => healthSync.syncUserHealthData(userId, 'exercise').catch(console.error), 100);
    
    res.json(record);
  } catch (error: any) {
    console.error("Error creating exercise record:", error);
    res.status(400).json({ message: error.message || "Failed to create exercise record" });
  }
});

// === VITALS RECORDS ===
router.get('/health/vitals', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const records = await storage.getVitalRecords(userId, limit);
    res.json(records);
  } catch (error: any) {
    console.error("Error fetching vital records:", error);
    res.status(500).json({ message: error.message || "Failed to fetch vital records" });
  }
});

router.post('/health/vitals', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validated = insertVitalRecordSchema.parse({ ...req.body, userId });
    
    // Calculate BMI if weight and height metadata provided
    if (validated.bodyWeightKg && validated.metadata && (validated.metadata as any).heightCm) {
      const heightM = (validated.metadata as any).heightCm / 100;
      validated.bmi = validated.bodyWeightKg / (heightM * heightM);
    }
    
    const record = await storage.createVitalRecord(validated);
    
    // Trigger background sync
    setTimeout(() => healthSync.syncUserHealthData(userId, 'vitals').catch(console.error), 100);
    
    res.json(record);
  } catch (error: any) {
    console.error("Error creating vital record:", error);
    res.status(400).json({ message: error.message || "Failed to create vital record" });
  }
});

// === MINDFULNESS SESSIONS ===
router.get('/health/mindfulness', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const sessions = await storage.getMindfulnessSessions(userId, limit);
    res.json(sessions);
  } catch (error: any) {
    console.error("Error fetching mindfulness sessions:", error);
    res.status(500).json({ message: error.message || "Failed to fetch mindfulness sessions" });
  }
});

router.post('/health/mindfulness', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validated = insertMindfulnessSessionSchema.parse({ ...req.body, userId });
    
    // Calculate duration
    if (validated.startedAt && validated.endedAt && !validated.durationMinutes) {
      const durationMs = new Date(validated.endedAt).getTime() - new Date(validated.startedAt).getTime();
      validated.durationMinutes = Math.round(durationMs / 60000);
    }
    
    const session = await storage.createMindfulnessSession(validated);
    
    // Trigger background sync
    setTimeout(() => healthSync.syncUserHealthData(userId, 'mindfulness').catch(console.error), 100);
    
    res.json(session);
  } catch (error: any) {
    console.error("Error creating mindfulness session:", error);
    res.status(400).json({ message: error.message || "Failed to create mindfulness session" });
  }
});

// === SLEEP LOGS ===
router.get('/health/sleep', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const logs = await storage.getSleepLogs(userId, limit);
    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching sleep logs:", error);
    res.status(500).json({ message: error.message || "Failed to fetch sleep logs" });
  }
});

router.post('/health/sleep', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validated = insertSleepLogSchema.parse({ ...req.body, userId });
    
    // Calculate total sleep if not provided
    if (validated.bedtime && validated.wakeTime && !validated.totalSleepMinutes) {
      const durationMs = new Date(validated.wakeTime).getTime() - new Date(validated.bedtime).getTime();
      validated.totalSleepMinutes = Math.round(durationMs / 60000);
    }
    
    const log = await storage.createSleepLog(validated);
    
    // Trigger background sync
    setTimeout(() => healthSync.syncUserHealthData(userId, 'sleep').catch(console.error), 100);
    
    res.json(log);
  } catch (error: any) {
    console.error("Error creating sleep log:", error);
    res.status(400).json({ message: error.message || "Failed to create sleep log" });
  }
});

// === FOOD LOGS ===
router.get('/health/food', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const logs = await storage.getFoodLogs(userId, limit);
    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching food logs:", error);
    res.status(500).json({ message: error.message || "Failed to fetch food logs" });
  }
});

router.post('/health/food', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validated = insertFoodLogSchema.parse({ ...req.body, userId });
    
    const log = await storage.createFoodLog(validated);
    
    // Trigger background sync
    setTimeout(() => healthSync.syncUserHealthData(userId, 'food').catch(console.error), 100);
    
    res.json(log);
  } catch (error: any) {
    console.error("Error creating food log:", error);
    res.status(400).json({ message: error.message || "Failed to create food log" });
  }
});

// === AI SYNC ===
router.post('/health/sync', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const syncType = req.body.syncType || 'all';
    
    const result = await healthSync.syncUserHealthData(userId, syncType);
    res.json(result);
  } catch (error: any) {
    console.error("Error syncing health data:", error);
    res.status(500).json({ message: error.message || "Failed to sync health data" });
  }
});

router.get('/health/sync/recent', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const recentSync = await healthSync.getRecentSync(userId);
    res.json(recentSync || { message: "No sync history found" });
  } catch (error: any) {
    console.error("Error fetching recent sync:", error);
    res.status(500).json({ message: error.message || "Failed to fetch recent sync" });
  }
});

router.get('/health/sync/history', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const history = await healthSync.getSyncHistory(userId, limit);
    res.json(history);
  } catch (error: any) {
    console.error("Error fetching sync history:", error);
    res.status(500).json({ message: error.message || "Failed to fetch sync history" });
  }
});

// === SERVER TIME (for accurate time sync) ===
router.get('/time/server', (req, res) => {
  res.json({
    serverTime: new Date().toISOString(),
    timestamp: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
});

export default router;
