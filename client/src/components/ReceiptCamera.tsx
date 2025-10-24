/**
 * Receipt Camera Capture Component
 * Allows users to snap photos of receipts using their device camera
 */

import { useState } from 'react';
import { Camera, Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { safeFetch } from '@/lib/safeFetch';

interface ReceiptAnalysis {
  rawText: string;
  merchant: string;
  amount: number;
  currency: string;
  receiptDate: string;
  category: string;
  aiAnalysis: string;
  items?: string[];
}

interface ReceiptCameraProps {
  onSuccess?: (receipt: any) => void;
  onError?: (error: string) => void;
}

export default function ReceiptCamera({ onSuccess, onError }: ReceiptCameraProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ReceiptAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Please select an image file';
      setError(errorMsg);
      toast({
        title: 'Invalid File',
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'Image must be less than 10MB';
      setError(errorMsg);
      toast({
        title: 'File Too Large',
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPreviewUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload and analyze
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await safeFetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Upload failed');
      }

      if (response.htmlSnippet) {
        throw new Error('Server returned HTML error page');
      }

      const receipt = response.json;
      setResult(receipt as ReceiptAnalysis);
      
      toast({
        title: 'Receipt Analyzed',
        description: `Found receipt from ${receipt.merchant} for ${receipt.currency} ${receipt.amount}`,
      });

      if (onSuccess) {
        onSuccess(receipt);
      }
    } catch (err: any) {
      console.error('Receipt upload error:', err);
      const errorMsg = err.message || 'Failed to analyze receipt';
      setError(errorMsg);
      
      toast({
        title: 'Upload Failed',
        description: errorMsg,
        variant: 'destructive',
      });

      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setUploading(false);
    }
  }

  function resetCapture() {
    setResult(null);
    setError(null);
    setPreviewUrl(null);
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Receipt Camera
        </CardTitle>
        <CardDescription>
          Snap a photo of your receipt for instant AI analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Camera/Upload Button */}
        {!result && (
          <div className="flex flex-col gap-2">
            <label className="w-full">
              <Button
                type="button"
                className="w-full"
                disabled={uploading}
                data-testid="button-camera-capture"
                asChild
              >
                <span>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Receipt...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Receipt (Camera)
                    </>
                  )}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                style={{ display: 'none' }}
                disabled={uploading}
                data-testid="input-camera-file"
              />
            </label>

            <label className="w-full">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploading}
                data-testid="button-upload-receipt"
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose from Gallery
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                style={{ display: 'none' }}
                disabled={uploading}
                data-testid="input-file-upload"
              />
            </label>
          </div>
        )}

        {/* Preview Image */}
        {previewUrl && (
          <div className="relative rounded-md overflow-hidden border border-border">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="w-full h-auto max-h-64 object-contain"
              data-testid="img-receipt-preview"
            />
          </div>
        )}

        {/* Loading State */}
        {uploading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Analyzing receipt with AI...</span>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium" data-testid="text-success">Receipt Analyzed Successfully</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Merchant:</span>
                <span className="font-medium" data-testid="text-merchant">{result.merchant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium" data-testid="text-amount">
                  {result.currency} {result.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium" data-testid="text-date">{result.receiptDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium capitalize" data-testid="text-category">{result.category}</span>
              </div>
            </div>

            {result.aiAnalysis && (
              <div className="p-3 rounded-md bg-muted/50 text-sm" data-testid="text-ai-analysis">
                <p className="text-muted-foreground mb-1">AI Analysis:</p>
                <p>{result.aiAnalysis}</p>
              </div>
            )}

            {result.items && result.items.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Items:</p>
                <ul className="text-sm space-y-1" data-testid="list-items">
                  {result.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={resetCapture}
              variant="outline"
              className="w-full"
              data-testid="button-capture-another"
            >
              Capture Another Receipt
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && !uploading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium" data-testid="text-error">Upload Failed</span>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              onClick={resetCapture}
              variant="outline"
              className="w-full"
              data-testid="button-try-again"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Info Text */}
        {!result && !uploading && (
          <p className="text-xs text-muted-foreground text-center">
            On mobile devices, the camera button will open your camera app directly.
            Desktop users can choose a file from their computer.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
