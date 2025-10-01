import { Client } from '@replit/object-storage';

let storageClient: Client | null = null;
let initAttempted = false;

export function isObjectStorageAvailable(): boolean {
  if (!initAttempted) {
    initAttempted = true;
    try {
      storageClient = new Client();
      return true;
    } catch (error) {
      console.warn('Object Storage not initialized. Create a bucket in Tools > Object Storage to enable file uploads.');
      storageClient = null;
      return false;
    }
  }
  return storageClient !== null;
}

export function getStorageUnavailableMessage(): string {
  return 'Object Storage not configured. Create a bucket in Tools > Object Storage to enable file uploads.';
}
