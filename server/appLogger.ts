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

interface LogRotationConfig {
  maxSizeMB: number;        // Maximum log file size before rotation
  maxAgeDays: number;       // Maximum log file age before rotation
  maxFiles: number;         // Maximum number of rotated files to keep
}

class AppLogger {
  private logs: AppLogEntry[] = [];
  private logFilePath = path.join(process.cwd(), 'logs', 'app-creation.jsonl');
  private lastRotationCheck = Date.now();
  
  // Rotation config: 10MB max, 7 days max age, keep 10 files
  private rotationConfig: LogRotationConfig = {
    maxSizeMB: 10,
    maxAgeDays: 7,
    maxFiles: 10
  };

  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFilePath);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('[AppLogger] Failed to create log directory:', error);
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async getFileAge(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      const ageMs = Date.now() - stats.mtimeMs;
      return ageMs / (1000 * 60 * 60 * 24); // Convert to days
    } catch {
      return 0;
    }
  }

  private async rotateLogFile(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = this.logFilePath.replace('.jsonl', `-${timestamp}.jsonl`);
      
      // Rename current log file
      await fs.rename(this.logFilePath, rotatedPath);
      console.log(`[AppLogger] Rotated log file to: ${path.basename(rotatedPath)}`);
      
      // Clean up old rotated files
      await this.cleanupOldLogs();
    } catch (error) {
      console.error('[AppLogger] Failed to rotate log file:', error);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const logDir = path.dirname(this.logFilePath);
      const files = await fs.readdir(logDir);
      
      // Find all rotated log files
      const logFiles = files
        .filter(f => f.startsWith('app-creation-') && f.endsWith('.jsonl'))
        .map(f => path.join(logDir, f));
      
      // If we have more than maxFiles, delete oldest ones
      if (logFiles.length > this.rotationConfig.maxFiles) {
        // Sort by modification time (oldest first)
        const filesWithStats = await Promise.all(
          logFiles.map(async (filePath) => {
            const stats = await fs.stat(filePath);
            return { filePath, mtime: stats.mtimeMs };
          })
        );
        
        filesWithStats.sort((a, b) => a.mtime - b.mtime);
        
        // Delete oldest files
        const toDelete = filesWithStats.slice(0, filesWithStats.length - this.rotationConfig.maxFiles);
        for (const { filePath } of toDelete) {
          await fs.unlink(filePath);
          console.log(`[AppLogger] Deleted old log file: ${path.basename(filePath)}`);
        }
      }
    } catch (error) {
      console.error('[AppLogger] Failed to cleanup old logs:', error);
    }
  }

  private async checkRotation(): Promise<void> {
    // Check rotation at most once per minute
    if (Date.now() - this.lastRotationCheck < 60000) {
      return;
    }
    
    this.lastRotationCheck = Date.now();
    
    try {
      const size = await this.getFileSize(this.logFilePath);
      const sizeMB = size / (1024 * 1024);
      const ageDays = await this.getFileAge(this.logFilePath);
      
      // Rotate if size exceeds limit OR age exceeds limit
      if (sizeMB >= this.rotationConfig.maxSizeMB || ageDays >= this.rotationConfig.maxAgeDays) {
        await this.rotateLogFile();
      }
    } catch (error) {
      console.error('[AppLogger] Failed to check rotation:', error);
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
      await this.checkRotation();
      
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
