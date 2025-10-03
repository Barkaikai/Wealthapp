import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface HealthData {
  steps?: any[];
  exercise?: any[];
  vitals?: any[];
  mindfulness?: any[];
  sleep?: any[];
  food?: any[];
}

export class HealthSyncService {
  
  async syncUserHealthData(userId: string, syncType: 'steps' | 'exercise' | 'vitals' | 'mindfulness' | 'sleep' | 'food' | 'all' = 'all'): Promise<any> {
    console.log(`[HealthSync] Starting sync for user ${userId}, type: ${syncType}`);
    
    const syncLog = await storage.createAISyncLog({
      userId,
      syncType,
      recordsProcessed: 0,
      status: 'processing',
      startedAt: new Date(),
    });

    try {
      const healthData: HealthData = {};
      const recordIds: any = {};

      // Collect unsynced data based on sync type
      if (syncType === 'all' || syncType === 'steps') {
        healthData.steps = await storage.getUnsyncedStepRecords(userId);
        recordIds.steps = healthData.steps.map((r: any) => r.id);
      }
      
      if (syncType === 'all' || syncType === 'exercise') {
        healthData.exercise = await storage.getUnsyncedExerciseRecords(userId);
        recordIds.exercise = healthData.exercise.map((r: any) => r.id);
      }
      
      if (syncType === 'all' || syncType === 'vitals') {
        healthData.vitals = await storage.getUnsyncedVitalRecords(userId);
        recordIds.vitals = healthData.vitals.map((r: any) => r.id);
      }
      
      if (syncType === 'all' || syncType === 'mindfulness') {
        healthData.mindfulness = await storage.getUnsyncedMindfulnessSessions(userId);
        recordIds.mindfulness = healthData.mindfulness.map((r: any) => r.id);
      }
      
      if (syncType === 'all' || syncType === 'sleep') {
        healthData.sleep = await storage.getUnsyncedSleepLogs(userId);
        recordIds.sleep = healthData.sleep.map((r: any) => r.id);
      }
      
      if (syncType === 'all' || syncType === 'food') {
        healthData.food = await storage.getUnsyncedFoodLogs(userId);
        recordIds.food = healthData.food.map((r: any) => r.id);
      }

      const totalRecords = Object.values(healthData).reduce((sum, records) => sum + (records?.length || 0), 0);

      if (totalRecords === 0) {
        console.log(`[HealthSync] No unsynced data for user ${userId}`);
        await storage.updateAISyncLog(syncLog.id, {
          status: 'completed',
          completedAt: new Date(),
          recordsProcessed: 0,
          insights: ['No new data to analyze'],
          healthScore: null,
        });
        return { message: 'No new data to sync', syncLog };
      }

      // Generate AI analysis using GPT-4o
      const analysis = await this.analyzeHealthData(healthData, userId);

      // Mark records as synced
      if (recordIds.steps?.length > 0) {
        await storage.markStepRecordsSynced(recordIds.steps);
      }
      if (recordIds.exercise?.length > 0) {
        await storage.markExerciseRecordsSynced(recordIds.exercise);
      }
      if (recordIds.vitals?.length > 0) {
        await storage.markVitalRecordsSynced(recordIds.vitals);
      }
      if (recordIds.mindfulness?.length > 0) {
        await storage.markMindfulnessSessionsSynced(recordIds.mindfulness);
      }
      if (recordIds.sleep?.length > 0) {
        await storage.markSleepLogsSynced(recordIds.sleep);
      }
      if (recordIds.food?.length > 0) {
        await storage.markFoodLogsSynced(recordIds.food);
      }

      // Update sync log with results
      await storage.updateAISyncLog(syncLog.id, {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: totalRecords,
        recordIds: recordIds,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        healthScore: analysis.healthScore,
      });

      console.log(`[HealthSync] Completed sync for user ${userId}, processed ${totalRecords} records`);

      return {
        success: true,
        recordsProcessed: totalRecords,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        healthScore: analysis.healthScore,
        syncLog,
      };
    } catch (error: any) {
      console.error(`[HealthSync] Error syncing user ${userId}:`, error);
      
      await storage.updateAISyncLog(syncLog.id, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error.message,
      });

      throw error;
    }
  }

  private async analyzeHealthData(healthData: HealthData, userId: string): Promise<any> {
    // Prepare summary for AI
    const summary: string[] = [];
    
    if (healthData.steps?.length) {
      const totalSteps = healthData.steps.reduce((sum, r) => sum + r.steps, 0);
      const avgSteps = Math.round(totalSteps / healthData.steps.length);
      summary.push(`Steps: ${healthData.steps.length} records, ${totalSteps} total steps, ${avgSteps} avg/day`);
    }
    
    if (healthData.exercise?.length) {
      const totalMinutes = healthData.exercise.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
      const avgMinutes = Math.round(totalMinutes / healthData.exercise.length);
      summary.push(`Exercise: ${healthData.exercise.length} sessions, ${totalMinutes} total minutes, ${avgMinutes} avg/session`);
    }
    
    if (healthData.vitals?.length) {
      summary.push(`Vitals: ${healthData.vitals.length} measurements recorded`);
    }
    
    if (healthData.mindfulness?.length) {
      const totalMinutes = healthData.mindfulness.reduce((sum, r) => sum + r.durationMinutes, 0);
      summary.push(`Mindfulness: ${healthData.mindfulness.length} sessions, ${totalMinutes} total minutes`);
    }
    
    if (healthData.sleep?.length) {
      const avgSleep = healthData.sleep.reduce((sum, r) => sum + r.totalSleepMinutes, 0) / healthData.sleep.length;
      summary.push(`Sleep: ${healthData.sleep.length} nights, ${Math.round(avgSleep / 60 * 10) / 10} avg hours`);
    }
    
    if (healthData.food?.length) {
      const totalCalories = healthData.food.reduce((sum, r) => sum + (r.calories || 0), 0);
      summary.push(`Nutrition: ${healthData.food.length} meals logged, ${totalCalories} total calories`);
    }

    const prompt = `You are a personal health AI assistant analyzing comprehensive health data for a user. Based on the following recent health activity, provide:

1. 3-5 key insights about their health patterns
2. 3-5 actionable recommendations for improvement
3. An overall health score from 0-100 (consider activity levels, sleep quality, nutrition, stress management)

Health Data Summary:
${summary.join('\n')}

Provide your response in JSON format:
{
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "healthScore": 85
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert health and wellness AI assistant. Provide evidence-based, actionable health insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      const result = JSON.parse(content);
      return {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        healthScore: result.healthScore || 75,
      };
    } catch (error) {
      console.error("[HealthSync] Error calling OpenAI:", error);
      
      // Fallback basic analysis
      return {
        insights: summary,
        recommendations: [
          "Maintain regular exercise routine",
          "Ensure 7-9 hours of sleep per night",
          "Practice mindfulness daily"
        ],
        healthScore: 75,
      };
    }
  }

  async getRecentSync(userId: string): Promise<any> {
    const logs = await storage.getAISyncLogs(userId, 1);
    return logs[0] || null;
  }

  async getSyncHistory(userId: string, limit: number = 10): Promise<any[]> {
    return await storage.getAISyncLogs(userId, limit);
  }
}

export const healthSync = new HealthSyncService();
