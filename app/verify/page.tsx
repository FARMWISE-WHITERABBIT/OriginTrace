'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Search, QrCode, Package, ArrowRight, Camera } from 'lucide-react';
import { QRScanner } from '@/components/qr-scanner';
import Image from 'next/image';

export default function VerifyLandingPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length >= 3) {
      router.push(`/verify/${encodeURIComponent(trimmed)}`);
    }
  };

  const handleScan = (result: string) => {
    setShowScanner(false);
    const scannedCode = result.trim();
    if (scannedCode) {
      let verifyCode = scannedCode;
      try {
        const url = new URL(scannedCode);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2 && pathParts[0] === 'verify') {
          verifyCode = decodeURIComponent(pathParts[1]);
        }
      } catch {
        // Not a URL, use scanned value directly
      }
      setCode(verifyCode);
      router.push(`/verify/${encodeURIComponent(verifyCode)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-slate-950">
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Image
            src="/images/logo-green.png"
            alt="OriginTrace"
            width={120}
            height={32}
            className="dark:hidden"
            style={{ width: 'auto', height: '28px' }}
          />
          <Image
            src="/images/logo-white.png"
            alt="OriginTrace"
            width={120}
            height={32}
            className="hidden dark:block"
            style={{ width: 'auto', height: '28px' }}
          />
          <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Public Verification Portal
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-[#2E7D6B]/10 p-4 mb-2">
            <ShieldCheck className="h-10 w-10 text-[#2E7D6B]" />
          </div>
          <h1 className="text-3xl font-bold text-[#111827] dark:text-white" data-testid="text-verify-title">
            Verify Product Origin
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Enter a batch ID, bag serial, or scan a QR code to trace the origin and compliance status of any product in our supply chain.
          </p>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-[#2E7D6B]" />
              Verification Lookup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showScanner ? (
              <QRScanner
                onScan={handleScan}
                onClose={() => setShowScanner(false)}
              />
            ) : (
              <>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verify-code">Verification Code</Label>
                    <Input
                      id="verify-code"
                      data-testid="input-verify-code"
                      placeholder="e.g. BATCH-2026-001"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="text-base"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Found on product labels, QR codes, or waybill documents.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    data-testid="button-verify-submit"
                    disabled={code.trim().length < 3}
                    className="w-full bg-[#2E7D6B] hover:bg-[#1F5F52]"
                  >
                    Verify
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowScanner(true)}
                  data-testid="button-open-scanner"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center rounded-full bg-[#2E7D6B]/10 p-3">
              <QrCode className="h-6 w-6 text-[#2E7D6B]" />
            </div>
            <h3 className="text-sm font-medium text-[#111827] dark:text-white">Scan QR Code</h3>
            <p className="text-xs text-muted-foreground">
              Scan the QR on any OriginTrace-verified product to view its full provenance.
            </p>
          </div>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center rounded-full bg-[#2E7D6B]/10 p-3">
              <Package className="h-6 w-6 text-[#2E7D6B]" />
            </div>
            <h3 className="text-sm font-medium text-[#111827] dark:text-white">Trace to Source</h3>
            <p className="text-xs text-muted-foreground">
              See the full chain of custody from farm to warehouse for verified products.
            </p>
          </div>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center rounded-full bg-[#2E7D6B]/10 p-3">
              <ShieldCheck className="h-6 w-6 text-[#2E7D6B]" />
            </div>
            <h3 className="text-sm font-medium text-[#111827] dark:text-white">EUDR Compliant</h3>
            <p className="text-xs text-muted-foreground">
              Compliance status verified against EU Deforestation Regulation standards.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 OriginTrace. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by OriginTrace Traceability Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
