/**
 * Offline mutation queue using IndexedDB
 * Stores failed mutations and replays them when connection is restored
 */

interface QueuedMutation {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  body: any;
  headers: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  priority: number;
}

const DB_NAME = 'WealthAutomationOfflineQueue';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

class OfflineQueue {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[OfflineQueue] Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
        }
      };
    });
  }

  async enqueue(mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const queuedMutation: QueuedMutation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      ...mutation,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedMutation);

      request.onsuccess = () => {
        console.log('[OfflineQueue] Mutation queued:', queuedMutation.id);
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to queue mutation');
        reject(request.error);
      };
    });
  }

  async dequeue(id: string): Promise<void> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[OfflineQueue] Mutation removed:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to remove mutation');
        reject(request.error);
      };
    });
  }

  async getAll(): Promise<QueuedMutation[]> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const mutations = request.result as QueuedMutation[];
        // Sort by priority (higher first) then timestamp (older first)
        mutations.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return a.timestamp - b.timestamp;
        });
        resolve(mutations);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to get mutations');
        reject(request.error);
      };
    });
  }

  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const mutation = getRequest.result as QueuedMutation;
        if (mutation) {
          mutation.retryCount = retryCount;
          const updateRequest = store.put(mutation);
          
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => {
        console.error('[OfflineQueue] Failed to update retry count');
        reject(getRequest.error);
      };
    });
  }

  async clear(): Promise<void> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[OfflineQueue] Queue cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to clear queue');
        reject(request.error);
      };
    });
  }

  async processMutation(mutation: QueuedMutation): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });

      if (response.ok) {
        await this.dequeue(mutation.id);
        return { success: true };
      } else {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async sync(): Promise<{ processed: number; succeeded: number; failed: number }> {
    console.log('[OfflineQueue] Starting sync...');
    
    const mutations = await this.getAll();
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const mutation of mutations) {
      processed++;
      
      // Check if max retries exceeded
      if (mutation.retryCount >= mutation.maxRetries) {
        console.warn('[OfflineQueue] Max retries exceeded for mutation:', mutation.id);
        await this.dequeue(mutation.id);
        failed++;
        continue;
      }

      const result = await this.processMutation(mutation);
      
      if (result.success) {
        succeeded++;
        console.log('[OfflineQueue] Successfully processed mutation:', mutation.id);
      } else {
        failed++;
        console.error('[OfflineQueue] Failed to process mutation:', mutation.id, result.error);
        await this.updateRetryCount(mutation.id, mutation.retryCount + 1);
      }
    }

    console.log('[OfflineQueue] Sync complete:', { processed, succeeded, failed });
    return { processed, succeeded, failed };
  }
}

export const offlineQueue = new OfflineQueue();

// Helper function to queue a mutation with sensible defaults
export async function queueMutation(
  url: string,
  method: string,
  body?: any,
  options?: {
    priority?: number;
    maxRetries?: number;
    headers?: Record<string, string>;
  }
): Promise<void> {
  await offlineQueue.enqueue({
    url,
    method,
    body,
    headers: options?.headers || {
      'Content-Type': 'application/json',
    },
    priority: options?.priority || 0,
    maxRetries: options?.maxRetries || 3,
  });
}

// Initialize queue on load
if (typeof window !== 'undefined') {
  offlineQueue.init().catch(console.error);
}
