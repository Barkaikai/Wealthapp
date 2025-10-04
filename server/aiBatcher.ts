import OpenAI from 'openai';

/**
 * AIRequestBatcher - Parallel Request Queue Manager
 * 
 * Note: This implements parallel processing with request queueing, NOT true API batching.
 * OpenAI's Chat Completions API doesn't support multi-prompt batching in a single request.
 * 
 * Benefits:
 * - Rate limiting / throttling control
 * - Prevents overwhelming the API with concurrent requests
 * - Predictable throughput management
 * - Timeout protection for queued requests
 * 
 * Limitations:
 * - Does NOT reduce API costs (separate API call per request)
 * - Does NOT share tokens between requests
 */

interface BatchRequest {
  prompt: string;
  model: string;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

class AIRequestBatcher {
  private queue: BatchRequest[] = [];
  private processing = false;
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_INTERVAL = 100;
  private readonly REQUEST_TIMEOUT = 30000; // 30 second timeout
  private timer: NodeJS.Timeout | null = null;

  constructor(private openai: OpenAI) {
    console.log('[AIBatcher] Initialized - parallel processing with queue (batch size:', this.BATCH_SIZE, ')');
  }

  async addRequest(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex(req => req.timeoutId === timeoutId);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error('Request timeout - exceeded 30 seconds in queue'));
        }
      }, this.REQUEST_TIMEOUT);

      this.queue.push({
        prompt,
        model,
        resolve,
        reject,
        timestamp: Date.now(),
        timeoutId
      });

      console.log(`[AIBatcher] Added request to queue (queue size: ${this.queue.length})`);

      if (this.queue.length >= this.BATCH_SIZE) {
        this.processBatch();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.BATCH_INTERVAL);
      }
    });
  }

  private async processBatch() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = this.queue.splice(0, this.BATCH_SIZE);
    console.log(`[AIBatcher] Processing batch of ${batch.length} requests`);

    await Promise.all(
      batch.map(async (req) => {
        try {
          if (req.timeoutId) {
            clearTimeout(req.timeoutId);
          }

          const latency = Date.now() - req.timestamp;
          console.log(`[AIBatcher] Executing request (wait time: ${latency}ms)`);
          
          const completion = await this.openai.chat.completions.create({
            model: req.model,
            messages: [{ role: 'user', content: req.prompt }],
            max_tokens: 500,
            temperature: 0.7,
          });

          const response = completion.choices[0]?.message?.content || '';
          req.resolve(response);
        } catch (error) {
          console.error('[AIBatcher] Request failed:', error);
          req.reject(error as Error);
        }
      })
    );

    this.processing = false;

    if (this.queue.length > 0) {
      setImmediate(() => this.processBatch());
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      batchSize: this.BATCH_SIZE,
      batchInterval: this.BATCH_INTERVAL
    };
  }
}

export function createBatcher(openai: OpenAI): AIRequestBatcher {
  return new AIRequestBatcher(openai);
}
