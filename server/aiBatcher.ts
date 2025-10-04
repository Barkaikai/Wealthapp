import OpenAI from 'openai';

interface BatchRequest {
  prompt: string;
  model: string;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class AIRequestBatcher {
  private queue: BatchRequest[] = [];
  private processing = false;
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_INTERVAL = 100;
  private timer: NodeJS.Timeout | null = null;

  constructor(private openai: OpenAI) {
    console.log('[AIBatcher] Initialized with batch size:', this.BATCH_SIZE);
  }

  async addRequest(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        prompt,
        model,
        resolve,
        reject,
        timestamp: Date.now()
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
