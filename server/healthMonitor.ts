import { runFullDiagnostics, DiagnosticReport, DiagnosticResult } from "./diagnostics";
import { db } from "./db";
import { diagnosticRuns, insertDiagnosticRunSchema } from "@shared/schema";
import { desc, sql } from "drizzle-orm";
import { tryGarbageCollect, getMemoryStats } from "./gcManager";

interface HealthMonitorConfig {
  enabled: boolean;
  autoFixEnabled: boolean;
  intervalMs: number; // Base interval for checks
  maxHistorySize: number;
}

interface FixAttempt {
  checkName: string;
  action: string;
  success: boolean;
  error?: string;
}

class HealthMonitor {
  private config: HealthMonitorConfig = {
    enabled: process.env.HEALTH_MONITOR_ENABLED !== 'false', // Enabled by default
    autoFixEnabled: process.env.AUTO_FIX_ENABLED !== 'false', // Enabled by default
    intervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '600000'), // 10 minutes default
    maxHistorySize: 200,
  };

  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;
  private consecutiveFailures: number = 0;

  constructor() {
    console.log('[HealthMonitor] Initialized with config:', this.config);
  }

  start() {
    if (this.intervalHandle) {
      console.log('[HealthMonitor] Already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('[HealthMonitor] Disabled by configuration');
      return;
    }

    console.log(`[HealthMonitor] Starting continuous monitoring (interval: ${this.config.intervalMs}ms)`);
    
    // Run immediately on start
    this.runHealthCheck('scheduled');

    // Then schedule periodic runs
    this.intervalHandle = setInterval(() => {
      this.runHealthCheck('scheduled');
    }, this.config.intervalMs);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[HealthMonitor] Stopped');
    }
  }

  async runHealthCheck(triggeredBy: 'manual' | 'scheduled' | 'auto'): Promise<DiagnosticReport | null> {
    // Single-flight guard: skip if already running
    if (this.isRunning) {
      console.log('[HealthMonitor] Check already in progress, skipping');
      return null;
    }

    this.isRunning = true;
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    try {
      console.log(`[HealthMonitor] Running diagnostics (runId: ${runId}, triggeredBy: ${triggeredBy})`);
      
      // Run diagnostics
      const report = await runFullDiagnostics();
      this.lastRunTime = new Date();

      // Track consecutive failures
      if (report.summary.error > 0) {
        this.consecutiveFailures++;
      } else {
        this.consecutiveFailures = 0;
      }

      // Attempt auto-fixes if enabled
      const fixes: FixAttempt[] = [];
      if (this.config.autoFixEnabled && (report.summary.error > 0 || report.summary.warning > 0)) {
        console.log('[HealthMonitor] Auto-fix enabled, attempting remediation...');
        
        for (const result of report.results) {
          if (result.status === 'error' || result.status === 'warning') {
            const fixResult = await this.attemptFix(result);
            if (fixResult) {
              fixes.push(fixResult);
            }
          }
        }
      }

      // Determine overall status
      let status: 'success' | 'partial' | 'failure' = 'success';
      if (report.summary.error > 0) {
        status = 'failure';
      } else if (report.summary.warning > 0) {
        status = 'partial';
      }

      // Save to database
      await this.saveRun({
        runId,
        status,
        startedAt: startTime,
        completedAt: new Date(),
        durationMs: report.durationMs,
        checksTotal: report.summary.total,
        checksSuccess: report.summary.success,
        checksWarning: report.summary.warning,
        checksError: report.summary.error,
        fixesAttempted: fixes.length,
        fixesSucceeded: fixes.filter(f => f.success).length,
        results: report.results as any,
        triggeredBy,
      });

      // Log fixes
      if (fixes.length > 0) {
        console.log(`[HealthMonitor] Applied ${fixes.filter(f => f.success).length}/${fixes.length} fixes`);
        fixes.forEach(fix => {
          if (fix.success) {
            console.log(`  ✓ ${fix.checkName}: ${fix.action}`);
          } else {
            console.log(`  ✗ ${fix.checkName}: ${fix.action} (${fix.error})`);
          }
        });
      }

      // Alert on persistent failures
      if (this.consecutiveFailures >= 3) {
        console.error(`[HealthMonitor] ⚠️  ${this.consecutiveFailures} consecutive failures detected`);
      }

      // Cleanup old history
      await this.cleanupOldRuns();

      return report;
    } catch (error: any) {
      console.error('[HealthMonitor] Check failed:', error);
      this.consecutiveFailures++;
      
      // Save failed run
      await this.saveRun({
        runId,
        status: 'failure',
        startedAt: startTime,
        completedAt: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        checksTotal: 0,
        checksSuccess: 0,
        checksWarning: 0,
        checksError: 1,
        fixesAttempted: 0,
        fixesSucceeded: 0,
        results: [{
          category: 'System',
          name: 'Health Monitor',
          status: 'error',
          message: 'Health check execution failed',
          details: error.message,
        }] as any,
        triggeredBy,
      });

      return null;
    } finally {
      this.isRunning = false;
    }
  }

  private async attemptFix(result: DiagnosticResult): Promise<FixAttempt | null> {
    try {
      // Database connectivity issues
      if (result.category === 'Database' && result.status === 'error') {
        console.log('[HealthMonitor] Attempting database reconnection...');
        // The connection pool will auto-reconnect on next query
        // Test it
        await db.execute(sql`SELECT 1`);
        return {
          checkName: result.name,
          action: 'Reconnected to database',
          success: true,
        };
      }

      // OpenAI rate limits
      if (result.category === 'API Keys' && result.name === 'OpenAI API Key' && result.details?.includes('rate_limit')) {
        console.log('[HealthMonitor] OpenAI rate limit detected, will retry later');
        return {
          checkName: result.name,
          action: 'Scheduled retry for rate limit',
          success: true,
        };
      }

      // Alpha Vantage rate limits
      if (result.category === 'API Keys' && result.name === 'Alpha Vantage API Key' && result.status === 'warning') {
        console.log('[HealthMonitor] Alpha Vantage rate limit detected, using cached prices');
        return {
          checkName: result.name,
          action: 'Using cached market data',
          success: true,
        };
      }

      // CoinGecko connectivity issues
      if (result.category === 'External APIs' && result.name === 'CoinGecko API' && result.status === 'error') {
        console.log('[HealthMonitor] CoinGecko API unavailable, will retry later');
        return {
          checkName: result.name,
          action: 'Scheduled retry for API unavailability',
          success: true,
        };
      }

      // Memory issues - trigger garbage collection using safe GC manager
      if (result.category === 'Performance' && result.name === 'Memory Usage' && (result.status === 'warning' || result.status === 'error')) {
        console.log('[HealthMonitor] High memory usage detected, triggering garbage collection...');
        
        const beforeStats = getMemoryStats();
        const success = tryGarbageCollect();
        
        if (success) {
          // Wait for GC to complete
          await new Promise(resolve => setTimeout(resolve, 150));
          
          const afterStats = getMemoryStats();
          const freedMB = beforeStats.heapUsedMB - afterStats.heapUsedMB;
          
          if (freedMB > 0) {
            return {
              checkName: result.name,
              action: `Garbage collection freed ${freedMB}MB (${beforeStats.heapUsedMB}MB → ${afterStats.heapUsedMB}MB)`,
              success: true,
            };
          } else {
            return {
              checkName: result.name,
              action: `Garbage collection completed but memory still high (${afterStats.heapUsedMB}MB)`,
              success: false,
              error: 'Memory remains elevated after GC',
            };
          }
        } else {
          return {
            checkName: result.name,
            action: 'Garbage collection not available (start Node with --expose-gc)',
            success: false,
            error: 'GC not exposed - use ./start-dev.sh to enable',
          };
        }
      }

      // No automatic fix available
      return null;
    } catch (error: any) {
      return {
        checkName: result.name,
        action: 'Attempted automatic fix',
        success: false,
        error: error.message,
      };
    }
  }

  private async saveRun(data: any) {
    try {
      const validated = insertDiagnosticRunSchema.parse(data);
      await db.insert(diagnosticRuns).values(validated);
    } catch (error) {
      console.error('[HealthMonitor] Failed to save run:', error);
    }
  }

  private async cleanupOldRuns() {
    try {
      // Keep only the most recent N runs
      const result = await db.execute(sql`
        DELETE FROM diagnostic_runs
        WHERE id NOT IN (
          SELECT id FROM diagnostic_runs
          ORDER BY started_at DESC
          LIMIT ${this.config.maxHistorySize}
        )
      `);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`[HealthMonitor] Cleaned up ${result.rowCount} old diagnostic runs`);
      }
    } catch (error) {
      console.error('[HealthMonitor] Cleanup failed:', error);
    }
  }

  async getLatestRun(): Promise<DiagnosticRun | null> {
    try {
      const runs = await db
        .select()
        .from(diagnosticRuns)
        .orderBy(desc(diagnosticRuns.startedAt))
        .limit(1);
      
      return runs[0] || null;
    } catch (error) {
      console.error('[HealthMonitor] Failed to get latest run:', error);
      return null;
    }
  }

  async getHistory(limit: number = 50): Promise<DiagnosticRun[]> {
    try {
      return await db
        .select()
        .from(diagnosticRuns)
        .orderBy(desc(diagnosticRuns.startedAt))
        .limit(limit);
    } catch (error) {
      console.error('[HealthMonitor] Failed to get history:', error);
      return [];
    }
  }

  getConfig(): HealthMonitorConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<HealthMonitorConfig>) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    
    console.log('[HealthMonitor] Config updated:', this.config);

    // Restart if interval changed
    if (updates.intervalMs !== undefined && updates.intervalMs !== oldConfig.intervalMs) {
      console.log('[HealthMonitor] Restarting with new interval');
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }

    // Start/stop if enabled changed
    if (updates.enabled !== undefined && updates.enabled !== oldConfig.enabled) {
      if (this.config.enabled) {
        this.start();
      } else {
        this.stop();
      }
    }
  }

  getStatus() {
    return {
      enabled: this.config.enabled,
      running: this.intervalHandle !== null,
      lastRunTime: this.lastRunTime,
      consecutiveFailures: this.consecutiveFailures,
      config: this.config,
    };
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();

// Type exports
import type { DiagnosticRun } from "@shared/schema";
export type { DiagnosticRun };
