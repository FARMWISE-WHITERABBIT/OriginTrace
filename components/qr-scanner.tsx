'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, Camera, Loader2, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scanningRef = useRef(true);

  useEffect(() => {
    let animationId: number;
    let mediaStream: MediaStream | null = null;

    async function startCamera() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
          setIsLoading(false);
          scanFrame();
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Unable to access camera. Please check permissions or use manual entry.');
        setIsLoading(false);
      }
    }

    function scanFrame() {
      if (!scanningRef.current) return;
      if (!videoRef.current || !canvasRef.current) {
        animationId = requestAnimationFrame(scanFrame);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationId = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      if (code && code.data) {
        scanningRef.current = false;
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        onScan(code.data);
        return;
      }

      animationId = requestAnimationFrame(scanFrame);
    }

    startCamera();

    return () => {
      scanningRef.current = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      scanningRef.current = false;
      onScan(manualCode.trim().toUpperCase());
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-black aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-2" />
                <p className="text-white text-sm">Starting camera...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
              <Camera className="h-12 w-12 text-white/50 mb-4" />
              <p className="text-white text-center mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => setShowManualEntry(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Enter Code Manually
              </Button>
            </div>
          )}

          <video 
            ref={videoRef} 
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          
          <canvas ref={canvasRef} className="hidden" />

          {!error && !isLoading && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 border-2 border-primary rounded-lg shadow-lg">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded">
                  Align QR code or barcode here
                </div>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br" />
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
            data-testid="button-close-scanner"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          {showManualEntry || error ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">
                Enter bag code manually
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter bag ID..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  className="flex-1"
                  data-testid="input-manual-code"
                  autoFocus
                />
                <Button 
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  data-testid="button-submit-manual"
                >
                  Submit
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-center text-muted-foreground">
                Position the barcode or QR code within the frame
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowManualEntry(true)}
                data-testid="button-manual-entry"
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Enter Code Manually
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
