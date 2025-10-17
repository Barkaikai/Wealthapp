/**
 * Device Storage Manager
 * Comprehensive client-side storage system for optimizing app performance
 * Uses IndexedDB for structured data and localStorage for preferences
 */

interface StorageQuota {
  used: number;
  available: number;
  total: number;
}

interface CachedData<T = any> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number;
  type: 'briefing' | 'ai-insight' | 'portfolio' | 'asset' | 'user-data' | 'general';
}

class DeviceStorageManager {
  private dbName = 'wealth-automation-storage';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  // Storage limits (in MB)
  private readonly MAX_STORAGE_MB = 50;
  private readonly WARNING_THRESHOLD = 0.8; // 80% full

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[DeviceStorage] Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Cache store for temporary data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('type', 'type', { unique: false });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Persistent store for user data
        if (!db.objectStoreNames.contains('persistent')) {
          const persistentStore = db.createObjectStore('persistent', { keyPath: 'key' });
          persistentStore.createIndex('type', 'type', { unique: false });
          persistentStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<StorageQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          total: estimate.quota || 0,
        };
      } catch (error) {
        console.error('[DeviceStorage] Failed to get storage estimate:', error);
      }
    }

    // Fallback for browsers without Storage API
    return {
      used: 0,
      available: this.MAX_STORAGE_MB * 1024 * 1024,
      total: this.MAX_STORAGE_MB * 1024 * 1024,
    };
  }

  /**
   * Check if storage is near capacity
   */
  async isStorageNearCapacity(): Promise<boolean> {
    const quota = await this.getStorageQuota();
    const usagePercent = quota.total > 0 ? quota.used / quota.total : 0;
    return usagePercent >= this.WARNING_THRESHOLD;
  }

  /**
   * Set cached data with automatic expiration
   */
  async setCache<T>(
    key: string,
    data: T,
    ttlMinutes: number = 60,
    type: CachedData['type'] = 'general'
  ): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const now = Date.now();
    const cachedData: CachedData<T> = {
      key,
      data,
      timestamp: now,
      expiresAt: now + ttlMinutes * 60 * 1000,
      size: new Blob([JSON.stringify(data)]).size,
      type,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(cachedData);

      request.onsuccess = () => {
        console.log(`[DeviceStorage] Cached ${key} (${type}, expires in ${ttlMinutes}min)`);
        resolve();
      };

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to cache data');
        reject(request.error);
      };
    });
  }

  /**
   * Get cached data (returns null if expired or not found)
   */
  async getCache<T>(key: string): Promise<T | null> {
    await this.init();

    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result: CachedData<T> | undefined = request.result;

        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() > result.expiresAt) {
          console.log(`[DeviceStorage] Cache expired for ${key}`);
          this.deleteCache(key); // Clean up expired data
          resolve(null);
          return;
        }

        console.log(`[DeviceStorage] Cache hit for ${key}`);
        resolve(result.data);
      };

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to get cache');
        reject(request.error);
      };
    });
  }

  /**
   * Delete cached data
   */
  async deleteCache(key: string): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log(`[DeviceStorage] Deleted cache for ${key}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to delete cache');
        reject(request.error);
      };
    });
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    await this.init();

    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiresAt');
      const request = index.openCursor();

      let deletedCount = 0;
      const now = Date.now();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const data: CachedData = cursor.value;
          if (now > data.expiresAt) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(`[DeviceStorage] Cleared ${deletedCount} expired cache entries`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to clear expired cache');
        reject(request.error);
      };
    });
  }

  /**
   * Clear cache by type
   */
  async clearCacheByType(type: CachedData['type']): Promise<number> {
    await this.init();

    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('type');
      const request = index.openCursor(IDBKeyRange.only(type));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`[DeviceStorage] Cleared ${deletedCount} ${type} cache entries`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to clear cache by type');
        reject(request.error);
      };
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    await this.init();

    if (!this.db) {
      return {
        totalEntries: 0,
        totalSize: 0,
        byType: {},
        oldestEntry: null,
        newestEntry: null,
      };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.openCursor();

      let totalEntries = 0;
      let totalSize = 0;
      const byType: Record<string, { count: number; size: number }> = {};
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const data: CachedData = cursor.value;
          totalEntries++;
          totalSize += data.size;

          if (!byType[data.type]) {
            byType[data.type] = { count: 0, size: 0 };
          }
          byType[data.type].count++;
          byType[data.type].size += data.size;

          if (oldestEntry === null || data.timestamp < oldestEntry) {
            oldestEntry = data.timestamp;
          }
          if (newestEntry === null || data.timestamp > newestEntry) {
            newestEntry = data.timestamp;
          }

          cursor.continue();
        } else {
          resolve({
            totalEntries,
            totalSize,
            byType,
            oldestEntry,
            newestEntry,
          });
        }
      };

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to get cache stats');
        reject(request.error);
      };
    });
  }

  /**
   * Set persistent data (no expiration)
   */
  async setPersistent<T>(key: string, data: T, type: CachedData['type'] = 'user-data'): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const persistentData = {
      key,
      data,
      timestamp: Date.now(),
      size: new Blob([JSON.stringify(data)]).size,
      type,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['persistent'], 'readwrite');
      const store = transaction.objectStore('persistent');
      const request = store.put(persistentData);

      request.onsuccess = () => {
        console.log(`[DeviceStorage] Saved persistent data for ${key}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to save persistent data');
        reject(request.error);
      };
    });
  }

  /**
   * Get persistent data
   */
  async getPersistent<T>(key: string): Promise<T | null> {
    await this.init();

    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['persistent'], 'readonly');
      const store = transaction.objectStore('persistent');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };

      request.onerror = () => {
        console.error('[DeviceStorage] Failed to get persistent data');
        reject(request.error);
      };
    });
  }

  /**
   * Clear all storage
   */
  async clearAll(): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache', 'persistent'], 'readwrite');

      transaction.oncomplete = () => {
        console.log('[DeviceStorage] All storage cleared');
        resolve();
      };

      transaction.onerror = () => {
        console.error('[DeviceStorage] Failed to clear storage');
        reject(transaction.error);
      };

      transaction.objectStore('cache').clear();
      transaction.objectStore('persistent').clear();
    });
  }
}

// Singleton instance
export const deviceStorage = new DeviceStorageManager();

// Helper functions for common use cases
export const cacheHelpers = {
  /**
   * Cache a daily briefing
   */
  cacheDailyBriefing: async (userId: string, briefing: any) => {
    const key = `briefing:${userId}:${new Date().toISOString().split('T')[0]}`;
    await deviceStorage.setCache(key, briefing, 60, 'briefing'); // 1 hour cache
  },

  /**
   * Get cached daily briefing
   */
  getCachedDailyBriefing: async (userId: string) => {
    const key = `briefing:${userId}:${new Date().toISOString().split('T')[0]}`;
    return deviceStorage.getCache(key);
  },

  /**
   * Cache portfolio data
   */
  cachePortfolio: async (userId: string, portfolio: any) => {
    const key = `portfolio:${userId}`;
    await deviceStorage.setCache(key, portfolio, 15, 'portfolio'); // 15 min cache
  },

  /**
   * Get cached portfolio
   */
  getCachedPortfolio: async (userId: string) => {
    const key = `portfolio:${userId}`;
    return deviceStorage.getCache(key);
  },

  /**
   * Cache AI insights
   */
  cacheAIInsight: async (type: string, userId: string, insight: any) => {
    const key = `ai-insight:${type}:${userId}`;
    await deviceStorage.setCache(key, insight, 30, 'ai-insight'); // 30 min cache
  },

  /**
   * Get cached AI insight
   */
  getCachedAIInsight: async (type: string, userId: string) => {
    const key = `ai-insight:${type}:${userId}`;
    return deviceStorage.getCache(key);
  },
};
