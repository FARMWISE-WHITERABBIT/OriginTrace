'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2, CheckCircle, File, AlertCircle } from 'lucide-react';

export interface UploadResult {
  url: string;
  file_name: string;
  file_size: number;
}

interface DocumentUploadProps {
  onUploadComplete: (result: UploadResult) => void;
  onClear?: () => void;
  currentFileName?: string | null;
  currentFileUrl?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUpload({
  onUploadComplete,
  onClear,
  currentFileName,
  currentFileUrl,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(
    currentFileName && currentFileUrl
      ? { url: currentFileUrl, file_name: currentFileName, file_size: 0 }
      : null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      const result: UploadResult = await response.json();
      setUploadedFile(result);
      onUploadComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClear = () => {
    setUploadedFile(null);
    setError(null);
    onClear?.();
  };

  if (uploadedFile) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-md border bg-muted/30"
        data-testid="document-upload-success"
      >
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" data-testid="text-uploaded-filename">
            {uploadedFile.file_name}
          </p>
          {uploadedFile.file_size > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatBytes(uploadedFile.file_size)}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="h-7 w-7 shrink-0"
          data-testid="button-clear-upload"
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-doc-file-picker"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-doc-camera"
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-md p-4 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 bg-muted/20'
        }`}
        data-testid="document-upload-dropzone"
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <File className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a file here, or
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                type="button"
                data-testid="button-browse-file"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Browse File
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                type="button"
                data-testid="button-scan-camera"
              >
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                Scan with Camera
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              PDF, images, Word, Excel — max 20MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div
          className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm"
          data-testid="document-upload-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
