'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { IPhoneMockup } from '@/components/marketing/iphone-mockup';
import { ScanningReveal } from '@/components/marketing/trace-animation';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { 
  QrCode, 
  MapPin, 
  Package, 
  Factory,
  ChevronRight,
  Check,
  Shield,
  Globe,
  Clock
} from 'lucide-react';

export default function PedigreePage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main>
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-slate-50 dark:bg-slate-900/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <FadeIn direction="right">
                <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
                  Product Showcase
                </p>
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-6 text-slate-900 dark:text-slate-50">
                  The Non-Falsifiable Pedigree.
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                  A single QR code on your finished good links back to the exact GPS coordinates 
                  of every contributing farm. Auditors verify in seconds, not days.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2" data-testid="button-request-demo">
                      Request Demo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </FadeIn>
              
              <div className="relative hidden md:block">
                <ScanningReveal>
                  <IPhoneMockup />
                </ScanningReveal>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 backdrop-blur border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 shadow-lg">
                  <p className="text-[10px] text-primary font-mono flex items-center gap-1.5" suppressHydrationWarning>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
                    Auditor View: Verified {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t bg-muted/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-16">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                How Pedigree Works
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every finished good carries its complete history — from farm to factory to export.
              </p>
            </FadeIn>
            
            <StaggerContainer className="grid md:grid-cols-4 gap-6">
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 1</p>
                <h3 className="font-medium mb-2">Farm Origin</h3>
                <p className="text-sm text-muted-foreground">
                  GPS coordinates and polygon boundaries of source farms
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 2</p>
                <h3 className="font-medium mb-2">Bag Collection</h3>
                <p className="text-sm text-muted-foreground">
                  Unique bag IDs linked to farmer, agent, and collection point
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Factory className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 3</p>
                <h3 className="font-medium mb-2">Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Mass balance verified transformation with recovery rate
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 4</p>
                <h3 className="font-medium mb-2">Pedigree QR</h3>
                <p className="text-sm text-muted-foreground">
                  Finished good carries QR linking to entire supply chain
                </p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <FadeIn direction="right">
                <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                  Instant Verification
                </p>
                <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                  What Auditors See
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Auditors and inspectors scan a QR code and instantly access complete provenance — 
                  no paper shuffling required. Works for EU, UK, US, and buyer compliance programs.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">Farm GPS coordinates with satellite imagery</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">Environmental risk and deforestation status</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">Complete chain of custody timeline</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">Mass balance verification reports</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">Downloadable GeoJSON for regulatory submission</span>
                  </div>
                </div>
              </FadeIn>
              
              <FadeIn direction="left" delay={0.2}>
                <Card className="bg-muted/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                      <QrCode className="h-4 w-4" />
                      <span>Pedigree Verification</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">Product</span>
                        <span className="font-medium">Cocoa Butter</span>
                      </div>
                      <div className="flex justify-between text-sm p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">Batch</span>
                        <span className="font-mono text-xs">FW-2026-CB-0847</span>
                      </div>
                      <div className="flex justify-between text-sm p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">Source Farms</span>
                        <span className="font-medium">247 verified</span>
                      </div>
                      <div className="flex justify-between text-sm p-3 bg-primary/10 rounded-lg">
                        <span className="text-primary">Compliance Status</span>
                        <span className="text-primary font-medium">Export Ready</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                Why Pedigree Matters
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                In a multi-regulatory landscape, your documentation is your export license.
              </p>
            </FadeIn>
            
            <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Audit-Proof</h3>
                <p className="text-sm text-muted-foreground">
                  Digital evidence chain that stands up to regulatory scrutiny
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Instant Access</h3>
                <p className="text-sm text-muted-foreground">
                  Generate compliance reports in seconds, not weeks
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Market Access</h3>
                <p className="text-sm text-muted-foreground">
                  Meet EU, UK, US, and buyer-driven import requirements
                </p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <FadeIn>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                Ready to build your pedigree?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                See how OriginTrace gives your products verifiable provenance.
              </p>
              <Link href="/demo">
                <Button size="lg" className="gap-2">
                  Request Demo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
