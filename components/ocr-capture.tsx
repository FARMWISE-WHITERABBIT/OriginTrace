'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOnlineStatus } from '@/components/online-status';
import { Camera, Upload, X, Loader2, CheckCircle, FileText, WifiOff, AlertCircle } from 'lucide-react';

interface OCRResult {
  farmerName: string;
  idNumber: string;
  confidence: number;
  documentType?: string;
}

interface OCRCaptureProps {
  onResult: (result: OCRResult) => void;
  onCancel?: () => void;
}

export function OCRCapture({ onResult, onCancel }: OCRCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image is too large. Please use an image under 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        setError(null);
        processImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setOcrResult(null);
    setError(null);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to process document');
      }

      const result: OCRResult = await response.json();

      if (!result.farmerName && !result.idNumber) {
        setError('Could not read the document. Please try again with a clearer photo.');
        setIsProcessing(false);
        return;
      }

      setOcrResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to process document. Please enter details manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (ocrResult) {
      onResult(ocrResult);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setOcrResult(null);
    setIsProcessing(false);
    setError(null);
  };

  if (!isOnline) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <WifiOff className="h-4 w-4" />
            <span>ID scanning requires internet. Enter details manually below.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed" data-testid="ocr-capture-card">
      <CardContent className="p-4 space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file-upload"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-camera-capture"
        />

        {!capturedImage && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Scan a farmer's ID document to auto-fill their details</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1"
                data-testid="button-capture-photo"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
                data-testid="button-upload-file"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured document"
                className="w-full h-40 object-cover rounded-md"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80"
                onClick={handleReset}
                data-testid="button-reset-capture"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Reading document...</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md" data-testid="ocr-error">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{error}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-retry-ocr">
                      Try Again
                    </Button>
                    {onCancel && (
                      <Button variant="ghost" size="sm" onClick={onCancel} data-testid="button-enter-manually">
                        Enter Manually
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {ocrResult && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-md" data-testid="ocr-result-container">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium" data-testid="text-ocr-status">Document Processed</span>
                  <Badge variant="secondary" className="text-xs" data-testid="badge-ocr-confidence">
                    {Math.round(ocrResult.confidence * 100)}% confidence
                  </Badge>
                  {ocrResult.documentType && ocrResult.documentType !== 'Unknown' && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-ocr-doc-type">
                      {ocrResult.documentType}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Farmer Name:</span>
                    <p className="font-medium" data-testid="text-ocr-farmer-name">{ocrResult.farmerName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID Number:</span>
                    <p className="font-medium" data-testid="text-ocr-id-number">{ocrResult.idNumber || '—'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleConfirm} className="flex-1" data-testid="button-confirm-ocr">
                    Use These Details
                  </Button>
                  <Button variant="outline" onClick={handleReset} data-testid="button-retry-ocr">
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {onCancel && !error && !ocrResult && !isProcessing && (
          <Button variant="ghost" onClick={onCancel} className="w-full" data-testid="button-cancel-ocr">
            Skip — Enter Manually
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
