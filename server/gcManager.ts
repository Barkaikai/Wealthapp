/**
 * Safe Garbage Collection Manager
 * Provides safe wrappers for manual GC with fallback behavior
 */

import os from "os";

/**
 * Safely attempt garbage collection
 * Wraps global.gc() with proper error handling and availability checks
 */
export function tryGarbageCollect(): boolean {
  try {
    if (global.gc) {
      console.log("[GC Manager] Running manual garbage collection...");
      const beforeMem = process.memoryUsage();
      const beforeHeapMB = Math.round(beforeMem.heapUsed / 1024 / 1024);
      
      global.gc();
      
      // Wait a moment for GC to complete
      setTimeout(() => {
        const afterMem = process.memoryUsage();
        const afterHeapMB = Math.round(afterMem.heapUsed / 1024 / 1024);
        const freedMB = beforeHeapMB - afterHeapMB;
        
        console.log(`[GC Manager] ✅ Garbage collection complete. Freed ${freedMB}MB (${beforeHeapMB}MB → ${afterHeapMB}MB)`);
      }, 100);
      
      return true;
    } else {
      console.warn("[GC Manager] ⚠️  Garbage collection not exposed. Start Node with --expose-gc");
      return false;
    }
  } catch (err) {
    console.error("[GC Manager] Garbage collection failed:", err);
    return false;
  }
}

/**
 * Get current memory usage statistics
 */
export function getMemoryStats() {
  const usage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  const totalMemMB = totalMem / 1024 / 1024;
  const freeMemMB = freeMem / 1024 / 1024;
  const usagePercent = (heapUsedMB / totalMemMB) * 100;
  
  return {
    heapUsedMB: Math.round(heapUsedMB),
    heapTotalMB: Math.round(heapTotalMB),
    totalMemMB: Math.round(totalMemMB),
    freeMemMB: Math.round(freeMemMB),
    usagePercent: Math.round(usagePercent * 100) / 100,
  };
}

/**
 * Auto memory cleanup with intelligent thresholds
 * Runs GC when memory usage exceeds threshold
 */
export function autoMemoryCleanup(thresholdPercent: number = 80): boolean {
  const stats = getMemoryStats();
  
  console.log(`[GC Manager] Memory usage: ${stats.heapUsedMB}MB / ${stats.totalMemMB}MB (${stats.usagePercent}%)`);
  
  if (stats.usagePercent > thresholdPercent) {
    console.warn(`[GC Manager] ⚠️  High memory detected (>${thresholdPercent}%), running cleanup...`);
    return tryGarbageCollect();
  }
  
  return false;
}

/**
 * Schedule periodic garbage collection
 * @param intervalMinutes How often to run GC (in minutes)
 */
export function schedulePeriodicGC(intervalMinutes: number = 10): NodeJS.Timeout {
  console.log(`[GC Manager] Scheduling periodic GC every ${intervalMinutes} minutes`);
  
  return setInterval(() => {
    autoMemoryCleanup();
  }, intervalMinutes * 60 * 1000);
}

// Export for use in health monitor and other services
export const gcManager = {
  tryGarbageCollect,
  getMemoryStats,
  autoMemoryCleanup,
  schedulePeriodicGC,
};
