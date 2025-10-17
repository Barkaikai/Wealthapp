import { useState, useEffect, useCallback } from 'react';
import { deviceStorage } from '@/lib/deviceStorage';

interface StorageStats {
  quota: {
    used: number;
    available: number;
    total: number;
    percentUsed: number;
  };
  cache: {
    totalEntries: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
    oldestEntry: number | null;
    newestEntry: number | null;
  };
  isNearCapacity: boolean;
}

export function useDeviceStorage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const [quota, cacheStats, isNearCapacity] = await Promise.all([
        deviceStorage.getStorageQuota(),
        deviceStorage.getCacheStats(),
        deviceStorage.isStorageNearCapacity(),
      ]);

      setStats({
        quota: {
          ...quota,
          percentUsed: quota.total > 0 ? (quota.used / quota.total) * 100 : 0,
        },
        cache: cacheStats,
        isNearCapacity,
      });
    } catch (error) {
      console.error('Failed to get storage stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const clearExpiredCache = useCallback(async () => {
    try {
      const deletedCount = await deviceStorage.clearExpiredCache();
      await refreshStats();
      return deletedCount;
    } catch (error) {
      console.error('Failed to clear expired cache:', error);
      throw error;
    }
  }, [refreshStats]);

  const clearCacheByType = useCallback(async (type: 'briefing' | 'ai-insight' | 'portfolio' | 'asset' | 'user-data' | 'general') => {
    try {
      const deletedCount = await deviceStorage.clearCacheByType(type);
      await refreshStats();
      return deletedCount;
    } catch (error) {
      console.error('Failed to clear cache by type:', error);
      throw error;
    }
  }, [refreshStats]);

  const clearAll = useCallback(async () => {
    try {
      await deviceStorage.clearAll();
      await refreshStats();
    } catch (error) {
      console.error('Failed to clear all storage:', error);
      throw error;
    }
  }, [refreshStats]);

  return {
    stats,
    isLoading,
    refreshStats,
    clearExpiredCache,
    clearCacheByType,
    clearAll,
  };
}

// Helper hook for caching data with automatic storage management
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttlMinutes?: number;
    type?: 'briefing' | 'ai-insight' | 'portfolio' | 'asset' | 'user-data' | 'general';
    enabled?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { ttlMinutes = 60, type = 'general', enabled = true } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try to get from cache first
      const cached = await deviceStorage.getCache<T>(key);

      if (cached) {
        setData(cached);
        setIsLoading(false);
        return;
      }

      // Fetch fresh data
      const fresh = await fetcher();
      setData(fresh);

      // Cache the fresh data
      await deviceStorage.setCache(key, fresh, ttlMinutes, type);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch cached data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttlMinutes, type, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(async () => {
    await deviceStorage.deleteCache(key);
    await fetchData();
  }, [key, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    invalidate,
  };
}
