import fs from 'fs/promises';
import path from 'path';

export interface AppLogEntry {
  timestamp: string;
  action: string;
  code_before?: string;
  code_after?: string;
  error?: string;
  fix?: string;
  decision?: string;
  dependencies?: string;
  insights?: string;
  metadata?: Record<string, any>;
}

class AppLogger {
  private logs: AppLogEntry[] = [];
  private logFilePath = path.join(process.cwd(), 'logs', 'app-creation.jsonl');

  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFilePath);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('[AppLogger] Failed to create log directory:', error);
    }
  }

  async log(entry: Omit<AppLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: AppLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.logs.push(logEntry);
    
    console.log(`[AppLogger] ${logEntry.action}`);
    
    try {
      await this.ensureLogDirectory();
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.logFilePath, logLine, 'utf8');
    } catch (error) {
      console.error('[AppLogger] Failed to write log:', error);
    }
  }

  async readLogs(): Promise<string> {
    try {
      return await fs.readFile(this.logFilePath, 'utf8');
    } catch (error) {
      return '';
    }
  }

  async getAllLogs(): Promise<AppLogEntry[]> {
    const content = await this.readLogs();
    if (!content) return [];
    
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as AppLogEntry[];
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    try {
      await this.ensureLogDirectory();
      await fs.writeFile(this.logFilePath, '', 'utf8');
    } catch (error) {
      console.error('[AppLogger] Failed to clear logs:', error);
    }
  }

  getLogs(): AppLogEntry[] {
    return this.logs;
  }
}

export const appLogger = new AppLogger();

const initialLog = {
  action: "AppLogger system initialized",
  decision: "Created structured JSON logging system for tracking all app creation actions, errors, fixes, and decisions",
  insights: "Centralized logging enables programmatic analysis and continuous learning from development process"
};

appLogger.log(initialLog).catch(console.error);
