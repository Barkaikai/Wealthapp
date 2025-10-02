// Configuration exports
export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
};

// Object Storage availability check
// Note: We don't actually create a Client here to avoid crashes when no bucket is configured
// The Client will only be created when actually needed in fileStorage.ts
let checkedAvailability = false;
let storageAvailable = false;

export function isObjectStorageAvailable(): boolean {
  if (!checkedAvailability) {
    checkedAvailability = true;
    // For now, we assume Object Storage is NOT available unless explicitly configured
    // This prevents crashes when no bucket exists
    // The actual Client will handle the check when operations are attempted
    storageAvailable = false;
  }
  return storageAvailable;
}

export function getStorageUnavailableMessage(): string {
  return 'Object Storage not configured. Create a bucket in Tools > Object Storage to enable file uploads.';
}
