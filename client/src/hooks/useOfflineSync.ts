import { useEffect, useState } from 'react';
import { offlineQueue } from '@/lib/offlineQueue';
import { useToast } from './use-toast';

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const { toast } = useToast();

  // Check queue size periodically
  useEffect(() => {
    const checkQueueSize = async () => {
      try {
        const mutations = await offlineQueue.getAll();
        setQueueSize(mutations.length);
      } catch (error) {
        console.error('[useOfflineSync] Failed to check queue size:', error);
      }
    };

    checkQueueSize();
    const interval = setInterval(checkQueueSize, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[useOfflineSync] Connection restored, syncing offline queue...');
      
      const mutations = await offlineQueue.getAll();
      if (mutations.length === 0) {
        return;
      }

      setIsSyncing(true);
      
      try {
        const result = await offlineQueue.sync();
        
        if (result.succeeded > 0) {
          toast({
            title: 'Synced',
            description: `Successfully synced ${result.succeeded} offline ${result.succeeded === 1 ? 'action' : 'actions'}`,
          });
        }
        
        if (result.failed > 0) {
          toast({
            title: 'Sync Incomplete',
            description: `${result.failed} ${result.failed === 1 ? 'action' : 'actions'} failed to sync. Will retry later.`,
            variant: 'destructive',
          });
        }

        // Update queue size
        const remainingMutations = await offlineQueue.getAll();
        setQueueSize(remainingMutations.length);
      } catch (error: any) {
        console.error('[useOfflineSync] Sync failed:', error);
        toast({
          title: 'Sync Failed',
          description: 'Unable to sync offline actions. Will retry automatically.',
          variant: 'destructive',
        });
      } finally {
        setIsSyncing(false);
      }
    };

    window.addEventListener('online', handleOnline);
    
    // If already online, try to sync on mount
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [toast]);

  // Listen for service worker sync messages
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        console.log('[useOfflineSync] Service worker sync complete');
        const mutations = await offlineQueue.getAll();
        setQueueSize(mutations.length);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const manualSync = async () => {
    if (!navigator.onLine) {
      toast({
        title: 'Offline',
        description: 'Cannot sync while offline',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    
    try {
      const result = await offlineQueue.sync();
      
      if (result.processed === 0) {
        toast({
          title: 'Queue Empty',
          description: 'No offline actions to sync',
        });
      } else {
        if (result.succeeded > 0) {
          toast({
            title: 'Synced',
            description: `Successfully synced ${result.succeeded} offline ${result.succeeded === 1 ? 'action' : 'actions'}`,
          });
        }
        
        if (result.failed > 0) {
          toast({
            title: 'Sync Incomplete',
            description: `${result.failed} ${result.failed === 1 ? 'action' : 'actions'} failed to sync`,
            variant: 'destructive',
          });
        }
      }

      const remainingMutations = await offlineQueue.getAll();
      setQueueSize(remainingMutations.length);
    } catch (error: any) {
      console.error('[useOfflineSync] Manual sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync offline actions',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    queueSize,
    manualSync,
  };
}
