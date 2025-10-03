import { useRef, useState } from "react";
import { Upload, X, File, FileText, Image, Film, Music, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  error?: string;
}

interface MultiFileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  disabled?: boolean;
}

export function MultiFileUploader({
  onUpload,
  accept = "*/*",
  maxFiles = 10,
  maxSize = 50,
  disabled = false,
}: MultiFileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-5 w-5" />;
    if (fileType.startsWith("video/")) return <Film className="h-5 w-5" />;
    if (fileType.startsWith("audio/")) return <Music className="h-5 w-5" />;
    if (fileType.includes("pdf") || fileType.includes("document")) return <FileText className="h-5 w-5" />;
    if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("tar")) return <Archive className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }
    return null;
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles || disabled) return;

    const fileArray = Array.from(newFiles);
    if (files.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const uploadedFiles: UploadedFile[] = fileArray.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      progress: 0,
      error: validateFile(file) || undefined,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    const validFiles = files.filter((f) => !f.error).map((f) => f.file);
    if (validFiles.length === 0) return;

    try {
      await onUpload(validFiles);
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const hasValidFiles = files.some((f) => !f.error);

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        data-testid="dropzone-area"
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Upload up to {maxFiles} files (max {maxSize}MB each)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          All file types supported
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
        data-testid="file-input"
      />

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Selected Files ({files.length})
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFiles([])}
                data-testid="button-clear-files"
              >
                Clear All
              </Button>
              {hasValidFiles && (
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={disabled}
                  data-testid="button-upload-files"
                >
                  Upload {files.filter((f) => !f.error).length} File(s)
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {files.map((uploadedFile) => (
              <Card key={uploadedFile.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {getFileIcon(uploadedFile.file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>
                      {uploadedFile.file.type && (
                        <Badge variant="secondary" className="text-xs">
                          {uploadedFile.file.type.split("/")[1]?.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    {uploadedFile.error && (
                      <p className="text-xs text-destructive mt-1">
                        {uploadedFile.error}
                      </p>
                    )}
                    {uploadedFile.progress > 0 && uploadedFile.progress < 100 && (
                      <Progress value={uploadedFile.progress} className="mt-2" />
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(uploadedFile.id)}
                    data-testid={`button-remove-file-${uploadedFile.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
