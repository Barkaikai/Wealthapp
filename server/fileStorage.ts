import { Client } from '@replit/object-storage';
import crypto from 'crypto';

export interface UploadedFile {
  storageKey: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
}

export class FileStorage {
  private client: Client | null = null;
  private initAttempted: boolean = false;
  private initError: Error | null = null;

  private async ensureClient(): Promise<Client> {
    if (!this.initAttempted) {
      this.initAttempted = true;
      try {
        this.client = new Client();
        // Give the client a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.initError = error as Error;
        console.warn('Object Storage not initialized. Create a bucket in Tools > Object Storage to enable file uploads.');
        this.client = null;
      }
    }
    
    if (!this.client) {
      const message = 'Object Storage is not configured. Please create a bucket in Replit: Tools > Object Storage > Create a Bucket.';
      throw new Error(message);
    }
    return this.client;
  }

  async uploadFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<UploadedFile> {
    const client = await this.ensureClient();
    const fileExtension = originalFilename.split('.').pop() || '';
    const uniqueId = crypto.randomUUID();
    const storageKey = `${uniqueId}.${fileExtension}`;
    
    // Calculate checksum
    const checksum = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex');

    // Upload to object storage
    const result = await client.uploadFromBytes(storageKey, buffer);
    
    if (!result.ok) {
      throw new Error(`Failed to upload file: ${result.error}`);
    }

    return {
      storageKey,
      filename: storageKey,
      mimeType,
      fileSize: buffer.length,
      checksum,
    };
  }

  async downloadFile(storageKey: string): Promise<Buffer> {
    const client = await this.ensureClient();
    const result = await client.downloadAsBytes(storageKey);
    
    if (!result.ok) {
      throw new Error(`Failed to download file: ${result.error}`);
    }
    
    return result.value[0];
  }

  async deleteFile(storageKey: string): Promise<void> {
    const client = await this.ensureClient();
    const result = await client.delete(storageKey);
    
    if (!result.ok) {
      console.error(`Error deleting file ${storageKey}:`, result.error);
      throw new Error(`Failed to delete file: ${result.error}`);
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    const client = await this.ensureClient();
    const result = await client.exists(storageKey);
    return result.ok ? result.value : false;
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const client = await this.ensureClient();
    const result = await client.list({
      prefix: prefix || '',
      maxResults: 1000,
    });
    
    if (!result.ok) {
      console.error('Error listing files:', result.error);
      return [];
    }
    
    return result.value.map((obj: any) => obj.name);
  }
}

export const fileStorage = new FileStorage();
