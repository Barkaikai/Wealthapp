import { db } from './db';
import { scheduledTasks, type InsertScheduledTask } from '@shared/schema';
import { eq } from 'drizzle-orm';
import cronParser from 'cron-parser';

/**
 * TaskQueue - Database-backed task tracking system
 * Ensures tasks are never missed and can catch up after restarts
 */
export class TaskQueue {
  /**
   * Register a task in the database
   */
  async registerTask(
    name: string,
    cronExpression: string,
    description?: string
  ): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(scheduledTasks)
        .where(eq(scheduledTasks.name, name))
        .limit(1);

      if (existing.length === 0) {
        // Calculate next run time
        const nextRun = this.getNextRunTime(cronExpression);
        
        await db.insert(scheduledTasks).values({
          name,
          cronExpression,
          description,
          nextRunAt: nextRun,
          enabled: 'true',
        });
        
        console.log(`[TaskQueue] ✓ Registered task: ${name} (${cronExpression})`);
      } else {
        // Update cron expression if changed
        if (existing[0].cronExpression !== cronExpression) {
          const nextRun = this.getNextRunTime(cronExpression);
          await db
            .update(scheduledTasks)
            .set({ 
              cronExpression, 
              description,
              nextRunAt: nextRun,
              updatedAt: new Date() 
            })
            .where(eq(scheduledTasks.name, name));
          
          console.log(`[TaskQueue] ✓ Updated task: ${name} (${cronExpression})`);
        }
      }
    } catch (error) {
      console.error(`[TaskQueue] Failed to register task ${name}:`, error);
      throw error;
    }
  }

  /**
   * Record task execution
   */
  async recordTaskRun(
    name: string,
    status: 'success' | 'failed' | 'running',
    error?: string
  ): Promise<void> {
    try {
      const task = await db
        .select()
        .from(scheduledTasks)
        .where(eq(scheduledTasks.name, name))
        .limit(1);

      if (task.length === 0) {
        console.warn(`[TaskQueue] Task ${name} not found in database`);
        return;
      }

      const now = new Date();
      const nextRun = status === 'success' || status === 'failed' 
        ? this.getNextRunTime(task[0].cronExpression)
        : task[0].nextRunAt;

      await db
        .update(scheduledTasks)
        .set({
          lastRunAt: now,
          lastRunStatus: status,
          lastRunError: error || null,
          nextRunAt: nextRun,
          updatedAt: now,
        })
        .where(eq(scheduledTasks.name, name));

      if (status === 'success') {
        console.log(`[TaskQueue] ✓ ${name} completed at ${now.toISOString()}`);
      } else if (status === 'failed') {
        console.error(`[TaskQueue] ✗ ${name} failed:`, error);
      }
    } catch (err) {
      console.error(`[TaskQueue] Failed to record task run for ${name}:`, err);
    }
  }

  /**
   * Check for missed tasks and return list of tasks that need to catch up
   */
  async getMissedTasks(): Promise<Array<{ name: string; cronExpression: string; lastRunAt: Date | null }>> {
    try {
      const tasks = await db
        .select()
        .from(scheduledTasks)
        .where(eq(scheduledTasks.enabled, 'true'));

      const now = new Date();
      const missedTasks: Array<{ name: string; cronExpression: string; lastRunAt: Date | null }> = [];

      for (const task of tasks) {
        if (!task.lastRunAt) {
          // Never run before
          missedTasks.push({
            name: task.name,
            cronExpression: task.cronExpression,
            lastRunAt: null,
          });
          continue;
        }

        // Check if the task should have run since last execution
        const expectedRunTime = this.getNextRunTime(task.cronExpression, task.lastRunAt);
        
        if (expectedRunTime <= now) {
          missedTasks.push({
            name: task.name,
            cronExpression: task.cronExpression,
            lastRunAt: task.lastRunAt,
          });
        }
      }

      return missedTasks;
    } catch (error) {
      console.error('[TaskQueue] Failed to get missed tasks:', error);
      return [];
    }
  }

  /**
   * Get next run time for a cron expression
   */
  private getNextRunTime(cronExpression: string, from?: Date): Date {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: from || new Date(),
      });
      return interval.next().toDate();
    } catch (error) {
      console.error(`[TaskQueue] Invalid cron expression: ${cronExpression}`, error);
      // Default to 1 hour from now
      const nextRun = from || new Date();
      nextRun.setHours(nextRun.getHours() + 1);
      return nextRun;
    }
  }

  /**
   * Create a task runner function that handles error catching and logging
   */
  createTaskRunner(
    name: string,
    actionFn: () => Promise<void>
  ): () => Promise<void> {
    return async () => {
      console.log(`[TaskQueue] Running task: ${name}`);
      await this.recordTaskRun(name, 'running');
      
      try {
        await actionFn();
        await this.recordTaskRun(name, 'success');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.recordTaskRun(name, 'failed', errorMessage);
      }
    };
  }
}

export const taskQueue = new TaskQueue();
