'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Camera, Upload, X, CheckCircle } from 'lucide-react';
import { YieldValidationResult } from '@/lib/validation/yield-validation';

interface YieldWarningProps {
  validation: YieldValidationResult;
  onPhotoProvided: (photoData: string) => void;
  onDismiss: () => void;
  commodity: string;
}

export function YieldWarning({ 
  validation, 
  onPhotoProvided, 
  onDismiss,
  commodity 
}: YieldWarningProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (photo) {
      onPhotoProvided(photo);
    }
  };

  const handleCameraCapture = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d')?.drawImage(video, 0, 0);

      stream.getTracks().forEach(track => track.stop());

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
    } catch (error) {
      console.error('Camera error:', error);
      fileInputRef.current?.click();
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Card className="border-orange-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="h-5 w-5" />
          High Yield Warning
        </CardTitle>
        <CardDescription>
          Photo proof required to proceed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            {validation.message}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-orange-300">
              {commodity}
            </Badge>
            <Badge variant="outline" className="border-orange-300">
              Expected: {validation.expectedRange?.min} - {validation.expectedRange?.max} tons/ha
            </Badge>
            <Badge className="bg-orange-600">
              Actual: {validation.actualYield.toFixed(2)} tons/ha
            </Badge>
          </div>
        </div>

        {photo ? (
          <div className="relative">
            <img 
              src={photo} 
              alt="Produce photo" 
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setPhoto(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs">
              <CheckCircle className="h-3 w-3" />
              Photo captured
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Capture photo of produce as proof:</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCameraCapture}
                disabled={isCapturing}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-1" />
                {isCapturing ? 'Opening camera...' : 'Take Photo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onDismiss}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!photo}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Confirm with Photo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
