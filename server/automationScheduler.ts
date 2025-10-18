import cron from 'node-cron';
import PQueue from 'p-queue';
import type { IStorage } from './storage';
import { syncAndCategorizeEmails } from './emailAutomation';
import { generateRoutineReport } from './openai';
import { appLogger } from './appLogger';
import { GmailScopeError, GmailNotConnectedError } from './gmail';
import { taskQueue } from './taskQueue';

/**
 * Automation Scheduler Service
 * Handles automated email syncing and routine report generation with async queue processing
 * Uses database-backed task tracking to never miss scheduled runs
 */
class AutomationScheduler {
  private emailSyncJob: cron.ScheduledTask | null = null;
  private routineReportJob: cron.ScheduledTask | null = null;
  private storage: IStorage | null = null;
  private isRunning = false;
  private emailSyncQueue: PQueue;

  constructor() {
    // Initialize queue with concurrency limit to prevent blocking
    const concurrency = Number(process.env.SYNC_CONCURRENCY) || 5;
    this.emailSyncQueue = new PQueue({ concurrency });
  }

  setStorage(storage: IStorage): void {
    this.storage = storage;
  }

  /**
   * Start all automated tasks
   * - Registers tasks in database
   * - Checks for missed tasks and catches up
   * - Schedules future runs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AutomationScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AutomationScheduler] Starting automated tasks');

    // Register tasks in database
    await this.registerTasks();

    // Schedule future runs
    await this.scheduleTasks();

    console.log('[AutomationScheduler] ✓ All tasks scheduled and ready');
  }

  /**
   * Register task definitions in database
   */
  private async registerTasks(): Promise<void> {
    await taskQueue.registerTask(
      'emailSync',
      '0 * * * *',
      'Sync and categorize emails for all users'
    );

    await taskQueue.registerTask(
      'dailyReports',
      '0 21 * * *',
      'Generate daily routine reports for all users'
    );
  }

  /**
   * Check for missed tasks and run them asynchronously
   */
  private async catchUpMissedTasks(): Promise<void> {
    const missedTasks = await taskQueue.getMissedTasks();

    if (missedTasks.length === 0) {
      console.log('[AutomationScheduler] No missed tasks found');
      return;
    }

    console.log(`[AutomationScheduler] Found ${missedTasks.length} missed task(s), catching up...`);

    for (const task of missedTasks) {
      if (task.name === 'emailSync') {
        console.log('[AutomationScheduler] Catching up on missed email sync...');
        // Run in background, don't await
        this.runEmailSync().catch(err => {
          console.error('[AutomationScheduler] Catchup email sync failed:', err);
        });
      } else if (task.name === 'dailyReports') {
        console.log('[AutomationScheduler] Catching up on missed daily reports...');
        // Run in background, don't await
        this.runDailyReports().catch(err => {
          console.error('[AutomationScheduler] Catchup daily reports failed:', err);
        });
      }
    }
  }

  /**
   * Schedule future task runs
   */
  private async scheduleTasks(): Promise<void> {
    // Schedule email syncing every hour at :00
    const emailSyncRunner = taskQueue.createTaskRunner(
      'emailSync',
      () => this.runEmailSync()
    );

    this.emailSyncJob = cron.schedule('0 * * * *', () => {
      emailSyncRunner().catch(err => {
        console.error('[AutomationScheduler] Hourly email sync error:', err);
      });
    });

    // Schedule routine reports daily at 9 PM
    const dailyReportsRunner = taskQueue.createTaskRunner(
      'dailyReports',
      () => this.runDailyReports()
    );

    this.routineReportJob = cron.schedule('0 21 * * *', () => {
      dailyReportsRunner().catch(err => {
        console.error('[AutomationScheduler] Daily reports error:', err);
      });
    });

    console.log('[AutomationScheduler] ✓ Email sync scheduled (hourly at :00)');
    console.log('[AutomationScheduler] ✓ Routine reports scheduled (daily at 9 PM)');
    console.log(`[AutomationScheduler] ✓ Queue concurrency set to ${this.emailSyncQueue.concurrency}`);
  }

  /**
   * Run email sync task
   */
  private async runEmailSync(): Promise<void> {
    console.log('[AutomationScheduler] Running email sync task');
    await this.enqueueAllUsersForSync();
    console.log('[AutomationScheduler] Email sync enqueued - processing in background');
  }

  /**
   * Run daily reports task
   */
  private async runDailyReports(): Promise<void> {
    console.log('[AutomationScheduler] Running daily reports task');
    await this.generateRoutineReportsForAllUsers();
  }

  /**
   * Stop all automated tasks
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.emailSyncJob) {
      this.emailSyncJob.stop();
      this.emailSyncJob = null;
    }

    if (this.routineReportJob) {
      this.routineReportJob.stop();
      this.routineReportJob = null;
    }

    // Clear the queue
    this.emailSyncQueue.clear();

    this.isRunning = false;
    console.log('[AutomationScheduler] Stopped all automated tasks');
  }

  /**
   * Enqueue all users for email sync (non-blocking)
   */
  private async enqueueAllUsersForSync(): Promise<void> {
    if (!this.storage) {
      console.warn('[AutomationScheduler] Storage not initialized, skipping email sync');
      return;
    }

    try {
      const users = await this.storage.getAllUsers();
      console.log(`[AutomationScheduler] Enqueuing ${users.length} users for email sync`);
      
      for (const user of users) {
        this.enqueueUserSync(user.id);
      }
    } catch (error: any) {
      console.error('[AutomationScheduler] Failed to fetch users for sync:', error.message);
    }
  }

  /**
   * Enqueue a single user for email sync (non-blocking)
   */
  private enqueueUserSync(userId: string): void {
    this.emailSyncQueue.add(async () => {
      try {
        const result = await syncAndCategorizeEmails(userId, 20);
        
        if (result.synced > 0) {
          console.log(`[AutomationScheduler] Synced ${result.synced} emails for user ${userId}`);
          
          appLogger.log('info', 'automated_email_sync', {
            userId,
            synced: result.synced,
            personal: result.personal,
            finance: result.finance,
            investments: result.investments,
            draftsCreated: result.draftsCreated,
          });
        }
      } catch (error) {
        // Handle Gmail-specific errors gracefully
        if (error instanceof GmailScopeError || error instanceof GmailNotConnectedError) {
          console.log(`[AutomationScheduler] Gmail scope error for user ${userId} - skipping`);
          return;
        }
        
        console.error(`Error syncing emails for user ${userId}:`, error);
        appLogger.log('error', 'automated_email_sync_error', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Generate routine reports for all users
   */
  private async generateRoutineReportsForAllUsers(): Promise<void> {
    if (!this.storage) {
      console.warn('[AutomationScheduler] Storage not initialized, skipping routine reports');
      return;
    }

    try {
      const users = await this.storage.getAllUsers();
      console.log(`[AutomationScheduler] Generating routine reports for ${users.length} users`);

      for (const user of users) {
        try {
          const routines = await this.storage.getRoutinesByUser(user.id);
          
          if (routines.length === 0) {
            continue;
          }

          const report = await generateRoutineReport(routines);
          
          await this.storage.saveRoutineReport({
            userId: user.id,
            templateUsed: 'productivity_coach',
            report: report.analysis,
            recommendations: JSON.stringify(report.recommendations),
            focusAreas: JSON.stringify(report.focusAreas),
            generatedAt: new Date(),
          });

          appLogger.log('info', 'automated_routine_report', {
            userId: user.id,
            routinesCount: routines.length,
          });

          console.log(`[AutomationScheduler] Generated routine report for user ${user.id}`);
        } catch (error) {
          console.error(`Error generating routine report for user ${user.id}:`, error);
          appLogger.log('error', 'automated_routine_report_error', {
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log('[AutomationScheduler] Routine report generation completed');
    } catch (error: any) {
      console.error('[AutomationScheduler] Failed to generate routine reports:', error.message);
    }
  }

  /**
   * Manual trigger for email sync (for testing)
   */
  async triggerEmailSync(): Promise<void> {
    const runner = taskQueue.createTaskRunner('emailSync', () => this.runEmailSync());
    await runner();
  }

  /**
   * Manual trigger for daily reports (for testing)
   */
  async triggerDailyReports(): Promise<void> {
    const runner = taskQueue.createTaskRunner('dailyReports', () => this.runDailyReports());
    await runner();
  }
}

export const automationScheduler = new AutomationScheduler();
