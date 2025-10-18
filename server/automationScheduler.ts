import cron from 'node-cron';
import type { IStorage } from './storage';
import { syncAndCategorizeEmails } from './emailAutomation';
import { generateRoutineReport } from './openai';
import { appLogger } from './appLogger';

/**
 * Automation Scheduler Service
 * Handles automated email syncing and routine report generation
 */
class AutomationScheduler {
  private emailSyncJob: cron.ScheduledTask | null = null;
  private routineReportJob: cron.ScheduledTask | null = null;
  private storage: IStorage | null = null;
  private isRunning = false;

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

    // Schedule email syncing every hour at :00
    this.emailSyncJob = cron.schedule('0 * * * *', async () => {
      await this.syncEmailsForAllUsers();
    });

    // Schedule routine reports daily at 9 PM
    this.routineReportJob = cron.schedule('0 21 * * *', async () => {
      await this.generateRoutineReportsForAllUsers();
    });

    console.log('[AutomationScheduler] ✓ Email sync scheduled (hourly at :00)');
    console.log('[AutomationScheduler] ✓ Routine reports scheduled (daily at 9 PM)');

    // Disabled initial email sync to prevent startup delays
    // Email sync will run on the hourly schedule instead
    // setTimeout(() => this.syncEmailsForAllUsers(), 60000);
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

    this.isRunning = false;
    console.log('[AutomationScheduler] Stopped all automated tasks');
  }

  /**
   * Sync emails for all active users
   */
  private async syncEmailsForAllUsers(): Promise<void> {
    if (!this.storage) {
      console.warn('[AutomationScheduler] Storage not initialized, skipping email sync');
      return;
    }

    try {
      console.log('[AutomationScheduler] Starting automated email sync for all users');
      const users = await this.storage.getAllUsers();
      
      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          const result = await syncAndCategorizeEmails(user.id, 20);
          
          if (result.synced > 0) {
            console.log(`[AutomationScheduler] Synced ${result.synced} emails for user ${user.id}`);
            
            // Log to app logger
            appLogger.log('info', 'automated_email_sync', {
              userId: user.id,
              synced: result.synced,
              personal: result.personal,
              finance: result.finance,
              investments: result.investments,
              draftsCreated: result.draftsCreated,
            });
          }
          
          successCount++;
        } catch (error: any) {
          errorCount++;
          console.error(`[AutomationScheduler] Error syncing emails for user ${user.id}:`, error.message);
          
          // Don't throw - continue with other users
          appLogger.log('error', 'automated_email_sync_error', {
            userId: user.id,
            error: error.message,
          });
        }
      }

      console.log(`[AutomationScheduler] Email sync complete: ${successCount} successful, ${errorCount} errors`);
    } catch (error: any) {
      console.error('[AutomationScheduler] Critical error in email sync:', error);
      appLogger.log('error', 'automated_email_sync_critical', {
        error: error.message,
      });
    }
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
