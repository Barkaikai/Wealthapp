import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

interface CacheEntry {
  response: string;
  timestamp: number;
  hitCount: number;
}

class AIResponseCache {
  private cache: LRUCache<string, CacheEntry>;
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  constructor() {
    this.cache = new LRUCache<string, CacheEntry>({
      max: 1000,
      maxSize: 50 * 1024 * 1024,
      sizeCalculation: (value) => JSON.stringify(value).length,
      ttl: 1000 * 60 * 60,
    });
  }

  private generateKey(prompt: string, model: string, params?: any): string {
    const data = JSON.stringify({ prompt, model, params });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  get(prompt: string, model: string, params?: any): string | null {
    this.stats.totalRequests++;
    const key = this.generateKey(prompt, model, params);
    const entry = this.cache.get(key);
    
    if (entry) {
      this.stats.hits++;
      entry.hitCount++;
      entry.timestamp = Date.now();
      this.cache.set(key, entry);
      console.log(`[AICache] HIT (${this.getHitRate()}% hit rate) - Key: ${key.substring(0, 16)}...`);
      return entry.response;
    }
    
    this.stats.misses++;
    console.log(`[AICache] MISS (${this.getHitRate()}% hit rate) - Key: ${key.substring(0, 16)}...`);
    return null;
  }

  set(prompt: string, model: string, response: string, params?: any): void {
    const key = this.generateKey(prompt, model, params);
    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
      hitCount: 0
    };
    this.cache.set(key, entry);
    console.log(`[AICache] SET - Key: ${key.substring(0, 16)}... (${response.length} chars)`);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalRequests: 0 };
    console.log('[AICache] Cache cleared');
  }

  getStats() {
    return {
      ...this.stats,
      hitRate: this.getHitRate(),
      size: this.cache.size,
      maxSize: this.cache.max
    };
  }

  private getHitRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return Math.round((this.stats.hits / this.stats.totalRequests) * 100);
  }
}

export const aiCache = new AIResponseCache();
