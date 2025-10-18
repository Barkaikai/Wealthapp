import cron from 'node-cron';
import PQueue from 'p-queue';
import type { IStorage } from './storage';
import { syncAndCategorizeEmails } from './emailAutomation';
import { generateRoutineReport } from './openai';
import { appLogger } from './appLogger';
import { GmailScopeError, GmailNotConnectedError } from './gmail';

/**
 * Automation Scheduler Service
 * Handles automated email syncing and routine report generation with async queue processing
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
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AutomationScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AutomationScheduler] Starting automated tasks');

    // Schedule email syncing every hour at :00 (non-blocking)
    this.emailSyncJob = cron.schedule('0 * * * *', () => {
      console.log('[AutomationScheduler] Hourly email sync triggered (enqueuing users)...');
      this.enqueueAllUsersForSync().catch(err => {
        console.error('[AutomationScheduler] Failed to enqueue hourly sync:', err);
      });
    });

    // Schedule routine reports daily at 9 PM
    this.routineReportJob = cron.schedule('0 21 * * *', async () => {
      await this.generateRoutineReportsForAllUsers();
    });

    console.log('[AutomationScheduler] ✓ Email sync scheduled (hourly at :00)');
    console.log('[AutomationScheduler] ✓ Routine reports scheduled (daily at 9 PM)');
    console.log(`[AutomationScheduler] ✓ Queue concurrency set to ${this.emailSyncQueue.concurrency}`);

    // Trigger initial email sync asynchronously (non-blocking) after a short delay
    setTimeout(() => {
      console.log('[AutomationScheduler] Triggering initial email sync (non-blocking)...');
      this.enqueueAllUsersForSync().catch(err => {
        console.error('[AutomationScheduler] Initial sync error:', err);
      });
    }, 5000); // 5 second delay to allow server to fully initialize
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
      } catch (error: any) {
        // Handle Gmail-specific errors gracefully
        if (error instanceof GmailScopeError) {
          // User needs to reconnect with proper scope - log once and skip
          console.warn(`[AutomationScheduler] Gmail scope error for user ${userId} - skipping`);
          return;
        }
        
        if (error instanceof GmailNotConnectedError) {
          // Gmail not connected - skip silently
          return;
        }

        // Log other errors but don't crash
        console.error(`[AutomationScheduler] Error syncing emails for user ${userId}:`, error.message);
        
        appLogger.log('error', 'automated_email_sync_error', {
          userId,
          error: error.message,
        });
      }
    }).catch(err => {
      // Catch any unexpected queue errors
      console.error(`[AutomationScheduler] Unexpected queue error for user ${userId}:`, err);
    });
  }

  /**
   * Sync emails for all active users (legacy method - now uses queue)
   */
  private async syncEmailsForAllUsers(): Promise<void> {
    await this.enqueueAllUsersForSync();
  }

  /**
   * Generate routine reports for all users with routines
   */
  private async generateRoutineReportsForAllUsers(): Promise<void> {
    if (!this.storage) {
      console.warn('[AutomationScheduler] Storage not initialized, skipping routine reports');
      return;
    }

    try {
      console.log('[AutomationScheduler] Starting automated routine report generation');
      const users = await this.storage.getAllUsers();
      
      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Get user's routines
          const routines = await this.storage.getRoutines(user.id);
          
          if (routines.length === 0) {
            continue; // Skip users with no routines
          }

          // Generate routine description
          const routineDescription = routines
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(r => `${r.time} - ${r.title} (${r.duration}) [${r.category}]`)
            .join('\n');

          // Generate daily report using default template (Tim Cook - balanced approach)
          const report = await generateRoutineReport(
            routineDescription,
            'timCook',
            null // No briefing summary for automated reports
          );

          // Store the report
          await this.storage.createRoutineReport({
            userId: user.id,
            templateUsed: 'timCook',
            report: report.report,
            recommendations: JSON.stringify(report.recommendations),
            focusAreas: JSON.stringify(report.focus_areas),
            generatedAt: new Date(),
          });

          console.log(`[AutomationScheduler] Generated routine report for user ${user.id}`);
          
          appLogger.log('info', 'automated_routine_report', {
            userId: user.id,
            templateUsed: 'timCook',
            routineCount: routines.length,
          });

          successCount++;
        } catch (error: any) {
          errorCount++;
          console.error(`[AutomationScheduler] Error generating routine report for user ${user.id}:`, error.message);
          
          appLogger.log('error', 'automated_routine_report_error', {
            userId: user.id,
            error: error.message,
          });
        }
      }

      console.log(`[AutomationScheduler] Routine report generation complete: ${successCount} successful, ${errorCount} errors`);
    } catch (error: any) {
      console.error('[AutomationScheduler] Critical error in routine report generation:', error);
      appLogger.log('error', 'automated_routine_report_critical', {
        error: error.message,
      });
    }
  }

  /**
   * Manually trigger email sync for specific user (on-demand)
   */
  async syncEmailsForUser(userId: string): Promise<void> {
    try {
      const result = await syncAndCategorizeEmails(userId, 50);
      console.log(`[AutomationScheduler] Manual sync for user ${userId}: ${result.synced} emails`);
      return result as any;
    } catch (error) {
      console.error(`[AutomationScheduler] Manual sync error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger routine report for specific user (on-demand)
   */
  async generateRoutineReportForUser(userId: string, templateName: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const routines = await this.storage.getRoutines(userId);
      
      if (routines.length === 0) {
        throw new Error('No routines found for user');
      }

      const routineDescription = routines
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(r => `${r.time} - ${r.title} (${r.duration}) [${r.category}]`)
        .join('\n');

      const report = await generateRoutineReport(routineDescription, templateName, null);

      await this.storage.createRoutineReport({
        userId,
        templateUsed: templateName,
        report: report.report,
        recommendations: JSON.stringify(report.recommendations),
        focusAreas: JSON.stringify(report.focus_areas),
        generatedAt: new Date(),
      });

      console.log(`[AutomationScheduler] Manual routine report for user ${userId}`);
      return report as any;
    } catch (error) {
      console.error(`[AutomationScheduler] Manual routine report error for user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const automationScheduler = new AutomationScheduler();
