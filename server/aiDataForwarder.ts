import { appLogger } from './appLogger';

/**
 * AI Data Forwarding System
 * 
 * Collects and forwards all relevant app data to AI systems for:
 * - Learning and pattern detection
 * - User behavior analysis  
 * - Automated decision making
 * - System optimization
 * 
 * Data is structured in JSON format for easy parsing and analysis.
 */

export interface AIDataEvent {
  timestamp: string;
  event_type: 'API_CALL' | 'ERROR' | 'USER_ACTION' | 'DATABASE_OP' | 'AUTH_EVENT' | 'SYSTEM_EVENT' | 'CODE_CHANGE';
  details: Record<string, any>;
  stack_trace?: string;
  user_id?: string;
  environment: {
    node_version: string;
    platform: string;
    memory_usage: NodeJS.MemoryUsage;
  };
}

export interface AIDataForwarderConfig {
  enabled: boolean;
  batchSize: number;           // Number of events to batch before sending
  flushIntervalMs: number;     // How often to flush batched events
  realTimeEvents: string[];    // Event types to send immediately
  maxBatchSizeBytes?: number;  // Maximum batch size in bytes
  compressionEnabled?: boolean; // Enable compression for large batches
}

class AIDataForwarder {
  private config: AIDataForwarderConfig = {
    enabled: true,
    batchSize: 100,
    flushIntervalMs: 30000, // 30 seconds
    realTimeEvents: ['ERROR', 'AUTH_EVENT', 'USER_ACTION'],
    maxBatchSizeBytes: 1024 * 1024, // 1MB max batch size
    compressionEnabled: true,
  };

  private eventBatch: AIDataEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private stats = {
    totalEvents: 0,
    batchedEvents: 0,
    realTimeEvents: 0,
    errors: 0,
    batchesSent: 0,
    bytesProcessed: 0,
    lastFlushTime: new Date(),
  };

  private eventTypeCounters: Record<string, number> = {};

  constructor() {
    this.startFlushTimer();
    console.log('[AIDataForwarder] Initialized with config:', this.config);
  }

  /**
   * Record an API call for AI analysis
   */
  async recordAPICall(data: {
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    userId?: string;
    requestBody?: any;
    responseBody?: any;
    error?: string;
  }): Promise<void> {
    await this.sendEvent({
      event_type: 'API_CALL',
      details: {
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        requestBody: this.sanitizeData(data.requestBody),
        responseBody: this.sanitizeData(data.responseBody),
        error: data.error,
      },
      user_id: data.userId,
    });
  }

  /**
   * Record an error for AI analysis
   */
  async recordError(data: {
    error: Error;
    context: string;
    userId?: string;
    additionalData?: Record<string, any>;
  }): Promise<void> {
    await this.sendEvent({
      event_type: 'ERROR',
      details: {
        message: data.error.message,
        name: data.error.name,
        context: data.context,
        ...data.additionalData,
      },
      stack_trace: data.error.stack,
      user_id: data.userId,
    });
  }

  /**
   * Record a user action for AI analysis
   */
  async recordUserAction(data: {
    action: string;
    userId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.sendEvent({
      event_type: 'USER_ACTION',
      details: {
        action: data.action,
        metadata: this.sanitizeData(data.metadata),
      },
      user_id: data.userId,
    });
  }

  /**
   * Record a database operation for AI analysis
   */
  async recordDatabaseOp(data: {
    operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
    table: string;
    userId?: string;
    recordCount?: number;
    executionTime?: number;
    error?: string;
  }): Promise<void> {
    await this.sendEvent({
      event_type: 'DATABASE_OP',
      details: {
        operation: data.operation,
        table: data.table,
        recordCount: data.recordCount,
        executionTime: data.executionTime,
        error: data.error,
      },
      user_id: data.userId,
    });
  }

  /**
   * Record an authentication event for AI analysis
   */
  async recordAuthEvent(data: {
    event: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'TOKEN_REFRESH' | 'PASSWORD_RESET';
    userId?: string;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.sendEvent({
      event_type: 'AUTH_EVENT',
      details: {
        event: data.event,
        success: data.success,
        metadata: this.sanitizeData(data.metadata),
      },
      user_id: data.userId,
    });
  }

  /**
   * Record a system event for AI analysis
   */
  async recordSystemEvent(data: {
    event: string;
    details: Record<string, any>;
  }): Promise<void> {
    await this.sendEvent({
      event_type: 'SYSTEM_EVENT',
      details: {
        event: data.event,
        ...this.sanitizeData(data.details),
      },
    });
  }

  /**
   * Calculate approximate size of event in bytes
   */
  private getEventSize(event: AIDataEvent): number {
    try {
      return new TextEncoder().encode(JSON.stringify(event)).length;
    } catch {
      return 1024; // Default estimate if serialization fails
    }
  }

  /**
   * Calculate total batch size in bytes
   */
  private getBatchSize(): number {
    return this.eventBatch.reduce((total, event) => total + this.getEventSize(event), 0);
  }

  /**
   * Send an event to AI system
   */
  private async sendEvent(partialEvent: Omit<AIDataEvent, 'timestamp' | 'environment'>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const event: AIDataEvent = {
      timestamp: new Date().toISOString(),
      environment: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
      },
      ...partialEvent,
    };

    this.stats.totalEvents++;
    
    // Track event type counters
    this.eventTypeCounters[event.event_type] = (this.eventTypeCounters[event.event_type] || 0) + 1;

    // Check if this is a real-time event
    if (this.config.realTimeEvents.includes(event.event_type)) {
      await this.forwardEventImmediately(event);
      this.stats.realTimeEvents++;
      return;
    }

    // Add to batch
    this.eventBatch.push(event);
    this.stats.batchedEvents++;

    // Check if batch should be flushed (by count or size)
    const currentBatchSize = this.getBatchSize();
    const shouldFlushByCount = this.eventBatch.length >= this.config.batchSize;
    const shouldFlushBySize = this.config.maxBatchSizeBytes && currentBatchSize >= this.config.maxBatchSizeBytes;

    if (shouldFlushByCount || shouldFlushBySize) {
      if (shouldFlushBySize) {
        console.log(`[AIDataForwarder] Flushing batch due to size limit (${Math.round(currentBatchSize / 1024)}KB)`);
      }
      await this.flushBatch();
    }
  }

  /**
   * Forward a single event immediately (for critical events)
   */
  private async forwardEventImmediately(event: AIDataEvent): Promise<void> {
    try {
      // Log to appLogger for now (in production, send to external AI service)
      await appLogger.log({
        action: `AI Data: ${event.event_type}`,
        metadata: {
          event_type: event.event_type,
          user_id: event.user_id,
          details: event.details,
          timestamp: event.timestamp,
        },
        insights: 'Real-time event forwarded to AI system for immediate analysis',
      });

      // TODO: In production, send to external AI service
      // await this.sendToExternalAI([event]);
    } catch (error: any) {
      this.stats.errors++;
      console.error('[AIDataForwarder] Error forwarding event:', error);
    }
  }

  /**
   * Flush the current batch of events
   */
  private async flushBatch(): Promise<void> {
    if (this.eventBatch.length === 0) {
      return;
    }

    const batch = [...this.eventBatch];
    this.eventBatch = [];
    
    const batchSizeBytes = batch.reduce((total, event) => total + this.getEventSize(event), 0);

    try {
      this.stats.batchesSent++;
      this.stats.bytesProcessed += batchSizeBytes;
      this.stats.lastFlushTime = new Date();

      const eventTypeCounts = this.getEventTypeCounts(batch);
      
      // Log batch to appLogger for now (in production, send to external AI service)
      await appLogger.log({
        action: `AI Data Batch: ${batch.length} events`,
        metadata: {
          batch_size: batch.length,
          batch_size_kb: Math.round(batchSizeBytes / 1024),
          event_types: eventTypeCounts,
          total_batches_sent: this.stats.batchesSent,
          total_bytes_processed_mb: Math.round(this.stats.bytesProcessed / (1024 * 1024)),
          timestamp: new Date().toISOString(),
        },
        insights: `Forwarded ${batch.length} batched events (${Math.round(batchSizeBytes / 1024)}KB) to AI system for analysis. Event breakdown: ${Object.entries(eventTypeCounts).map(([type, count]) => `${type}:${count}`).join(', ')}`,
      });

      // TODO: In production, send to external AI service
      // await this.sendToExternalAI(batch);
      
      console.log(`[AIDataForwarder] ✓ Batch flushed: ${batch.length} events, ${Math.round(batchSizeBytes / 1024)}KB`);
    } catch (error: any) {
      this.stats.errors++;
      console.error('[AIDataForwarder] Error flushing batch:', error);
      
      // Put events back in batch if failed (but limit retention to prevent memory issues)
      if (this.eventBatch.length < this.config.batchSize * 2) {
        this.eventBatch.unshift(...batch);
      } else {
        console.warn('[AIDataForwarder] Dropping batch due to queue overflow');
      }
    }
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(async () => {
      await this.flushBatch();
    }, this.config.flushIntervalMs);
  }

  /**
   * Get counts of event types in a batch
   */
  private getEventTypeCounts(events: AIDataEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'stripeCustomerId', 'paymentMethodId'];
    
    if (typeof data === 'object') {
      const sanitized = Array.isArray(data) ? [...data] : { ...data };
      
      for (const key in sanitized) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitizeData(sanitized[key]);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  /**
   * Send events to external AI service (placeholder for future implementation)
   */
  private async sendToExternalAI(events: AIDataEvent[]): Promise<void> {
    // TODO: Implement actual AI service integration
    // This could be:
    // - AWS Kinesis for real-time streaming
    // - Google Cloud Pub/Sub for event streaming
    // - Custom AI endpoint for direct forwarding
    // - OpenAI API for analysis
    // - Vector database for embeddings and similarity search
    
    console.log(`[AIDataForwarder] Would send ${events.length} events to external AI service`);
  }

  /**
   * Get forwarder statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentBatchSize: this.eventBatch.length,
      config: this.config,
    };
  }

  /**
   * Update forwarder configuration
   */
  updateConfig(config: Partial<AIDataForwarderConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.flushIntervalMs) {
      this.startFlushTimer();
    }
    
    console.log('[AIDataForwarder] Config updated:', this.config);
  }

  /**
   * Shutdown the forwarder
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining events
    await this.flushBatch();
    
    console.log('[AIDataForwarder] Shutdown complete');
  }
}

export const aiDataForwarder = new AIDataForwarder();

// Log initialization
aiDataForwarder.recordSystemEvent({
  event: 'AI_DATA_FORWARDER_INITIALIZED',
  details: {
    message: 'AI Data Forwarding System is now active',
    capabilities: [
      'Real-time critical event streaming',
      'Batch processing for non-critical events',
      'Automatic data sanitization',
      'Comprehensive app behavior tracking',
    ],
  },
}).catch(console.error);
