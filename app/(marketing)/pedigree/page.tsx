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
  Clock,
  FileCheck,
  Layers,
  Fingerprint,
  ArrowRight,
  Code2,
  ExternalLink,
  Leaf,
  Link2,
  ScanLine,
  Database,
  FileJson,
  BadgeCheck,
  Share2
} from 'lucide-react';

export default function PedigreePage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
<MarketingNav />

      <main>
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden bg-slate-50 dark:bg-slate-900/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <FadeIn direction="right">
                <p className="text-sm font-semibold text-primary mb-4 tracking-widest uppercase" data-testid="text-section-label-hero">
                  [ Pedigree & Digital Product Passport ]
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900 dark:text-slate-50" data-testid="text-hero-heading">
                  The Non-Falsifiable Pedigree. The Digital Product Passport.
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8" data-testid="text-hero-description">
                  A single QR code on your finished good links back to the exact GPS coordinates 
                  of every contributing farm. Generate machine-readable Digital Product Passports with 
                  JSON-LD output and public verification — auditors verify in seconds, not days.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2" data-testid="button-request-demo-hero">
                      Request Demo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/solutions">
                    <Button size="lg" variant="outline" className="gap-2" data-testid="button-explore-solutions">
                      Explore Solutions
                      <ArrowRight className="h-4 w-4" />
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

        <section className="py-20 md:py-28 border-t bg-muted/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-16">
              <p className="text-sm font-semibold text-primary mb-3 tracking-widest uppercase" data-testid="text-section-label-how">
                [ How It Works ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4" data-testid="text-how-heading">
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
                <h3 className="font-semibold mb-2" data-testid="text-step-farm-origin">Farm Origin</h3>
                <p className="text-sm text-muted-foreground">
                  GPS coordinates and polygon boundaries of source farms
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 2</p>
                <h3 className="font-semibold mb-2" data-testid="text-step-bag-collection">Bag Collection</h3>
                <p className="text-sm text-muted-foreground">
                  Unique bag IDs linked to farmer, agent, and collection point
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Factory className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 3</p>
                <h3 className="font-semibold mb-2" data-testid="text-step-processing">Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Mass balance verified transformation with recovery rate
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 4</p>
                <h3 className="font-semibold mb-2" data-testid="text-step-pedigree-qr">Pedigree QR</h3>
                <p className="text-sm text-muted-foreground">
                  Finished good carries QR linking to entire supply chain
                </p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="py-20 md:py-28 border-t bg-primary/5">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-16">
              <p className="text-sm font-semibold text-primary mb-3 tracking-widest uppercase" data-testid="text-section-label-dpp">
                [ Digital Product Passport ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4" data-testid="text-dpp-heading">
                From Pedigree to Digital Product Passport
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Generate machine-readable Digital Product Passports from your finished goods — complete with 
                structured data, sustainability claims, and public verification endpoints.
              </p>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <FadeIn direction="right">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileJson className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" data-testid="text-dpp-json-ld">JSON-LD Structured Output</h3>
                      <p className="text-sm text-muted-foreground">
                        Every DPP is generated as JSON-LD — the W3C standard for linked data. Machine-readable by customs systems, 
                        buyer platforms, and regulatory portals without manual data entry.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ExternalLink className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" data-testid="text-dpp-public-verification">Public Verification Endpoint</h3>
                      <p className="text-sm text-muted-foreground">
                        Each DPP has a unique public URL — no login required. Auditors, customs officers, and buyers 
                        access the full provenance record instantly via any web browser.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Leaf className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" data-testid="text-dpp-sustainability">Sustainability Claims</h3>
                      <p className="text-sm text-muted-foreground">
                        Attach verified sustainability claims — deforestation-free status, organic certification, 
                        fair trade compliance — directly to the DPP with supporting evidence.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Link2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" data-testid="text-dpp-chain-custody">Chain of Custody Tracking</h3>
                      <p className="text-sm text-muted-foreground">
                        The DPP embeds the complete chain of custody — every handoff, transformation, and quality check 
                        from farm gate through processing to finished good.
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="left" delay={0.2}>
                <Card className="bg-muted/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Code2 className="h-4 w-4" />
                      <span>DPP JSON-LD Output</span>
                    </div>
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{`{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Cocoa Butter — FW-2026-CB-0847",
  "identifier": "DPP-OT-2026-0847",
  "manufacturer": {
    "@type": "Organization",
    "name": "Lagos Processing Co."
  },
  "material": [{
    "@type": "Product",
    "name": "Raw Cocoa Beans",
    "productionDate": "2026-01-15",
    "originAddress": {
      "addressCountry": "NG",
      "geo": { "latitude": 7.38, "longitude": 3.94 }
    }
  }],
  "sustainabilityClaim": [
    "Deforestation-Free",
    "GPS-Verified Origin"
  ],
  "verificationUrl": "/verify/DPP-OT-2026-0847"
}`}</pre>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-16">
              <p className="text-sm font-semibold text-primary mb-3 tracking-widest uppercase" data-testid="text-section-label-qr-verification">
                [ QR-Based Verification ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4" data-testid="text-qr-verification-heading">
                Scan. Verify. Trust.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every finished good carries a QR code that links directly to its Digital Product Passport — 
                accessible by anyone, anywhere, without authentication.
              </p>
            </FadeIn>

            <div className="grid md:grid-cols-3 gap-8">
              <FadeIn delay={0}>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ScanLine className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-extrabold text-primary mb-2" data-testid="text-qr-step-1">01</div>
                  <h3 className="font-semibold mb-2">Scan the Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Use any smartphone camera or QR reader to scan the code printed on the finished good packaging.
                  </p>
                </div>
              </FadeIn>
              <FadeIn delay={0.1}>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Database className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-extrabold text-primary mb-2" data-testid="text-qr-step-2">02</div>
                  <h3 className="font-semibold mb-2">Access the Passport</h3>
                  <p className="text-sm text-muted-foreground">
                    Instantly view the full Digital Product Passport — origin farms, processing records, compliance status, and sustainability claims.
                  </p>
                </div>
              </FadeIn>
              <FadeIn delay={0.2}>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <BadgeCheck className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-extrabold text-primary mb-2" data-testid="text-qr-step-3">03</div>
                  <h3 className="font-semibold mb-2">Confirm Compliance</h3>
                  <p className="text-sm text-muted-foreground">
                    Verify deforestation-free status, regulatory compliance scores, and export readiness — all backed by GPS and documentation evidence.
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-muted/30 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <FadeIn direction="right">
                <p className="text-sm font-semibold text-primary mb-3 tracking-widest uppercase" data-testid="text-section-label-verification">
                  [ Instant Verification ]
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4" data-testid="text-auditors-heading">
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
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">JSON-LD Digital Product Passport data</span>
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
                      <div className="flex justify-between gap-4 text-sm p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">Product</span>
                        <span className="font-medium">Cocoa Butter</span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">Batch</span>
                        <span className="font-mono text-xs">FW-2026-CB-0847</span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">Source Farms</span>
                        <span className="font-medium">247 verified</span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm p-3 bg-background rounded-lg">
                        <span className="text-muted-foreground">DPP ID</span>
                        <span className="font-mono text-xs">DPP-OT-2026-0847</span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm p-3 bg-primary/10 rounded-lg">
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

        <section className="py-20 md:py-28 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-16">
              <p className="text-sm font-semibold text-primary mb-3 tracking-widest uppercase" data-testid="text-section-label-why">
                [ Why Pedigree & DPP ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4" data-testid="text-why-heading">
                Why Pedigree & DPP Matter
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                In a multi-regulatory landscape, your documentation is your export license — and your Digital Product Passport is your competitive advantage.
              </p>
            </FadeIn>
            
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-benefit-audit-proof">Audit-Proof</h3>
                <p className="text-sm text-muted-foreground">
                  Digital evidence chain that stands up to regulatory scrutiny
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-benefit-instant-access">Instant Access</h3>
                <p className="text-sm text-muted-foreground">
                  Generate compliance reports and DPPs in seconds, not weeks
                </p>
              </StaggerItem>
              
              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-benefit-market-access">Market Access</h3>
                <p className="text-sm text-muted-foreground">
                  Meet EU, UK, US, and buyer-driven import requirements
                </p>
              </StaggerItem>

              <StaggerItem className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-benefit-interoperable">Interoperable</h3>
                <p className="text-sm text-muted-foreground">
                  JSON-LD output integrates with any customs or buyer system
                </p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-muted/30 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-16">
              <p className="text-sm font-semibold text-primary mb-3 tracking-widest uppercase" data-testid="text-section-label-capabilities">
                [ Capabilities ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4" data-testid="text-capabilities-heading">
                Built for Compliance at Scale
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every layer of the pedigree and DPP is designed for regulatory verification and buyer confidence.
              </p>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Fingerprint className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2" data-testid="text-capability-tamper-evident">Tamper-Evident Records</h3>
                    <p className="text-sm text-muted-foreground">
                      Immutable audit trail from farm registration through export — every data point timestamped and signed.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2" data-testid="text-capability-multi-tier">Multi-Tier Traceability</h3>
                    <p className="text-sm text-muted-foreground">
                      Track provenance across multiple supply chain tiers — from smallholder to aggregator to processor to exporter.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2" data-testid="text-capability-geospatial">Geospatial Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      GPS polygon farm boundaries with satellite overlay — exportable as GeoJSON for EUDR and regulatory submissions.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2" data-testid="text-capability-compliance-scoring">Compliance Scoring</h3>
                    <p className="text-sm text-muted-foreground">
                      Real-time readiness scores per shipment — covering traceability depth, documentation completeness, and risk flags.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2" data-testid="text-capability-multi-market">Multi-Market Ready</h3>
                    <p className="text-sm text-muted-foreground">
                      One pedigree satisfies EUDR, FSMA 204, UK Environment Act, and major buyer compliance programs simultaneously.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                      <QrCode className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2" data-testid="text-capability-qr-verification">QR Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      Buyers and auditors scan one code to access the full provenance record — no portal login required.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="py-20 md:py-28 border-t bg-slate-900 dark:bg-slate-950">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <FadeIn>
              <p className="text-sm font-semibold text-emerald-400 mb-3 tracking-widest uppercase">
                [ Start Today ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-white" data-testid="text-cta-heading">
                Ready to Build Your Pedigree & DPP?
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-8">
                See how OriginTrace gives your products verifiable provenance and Digital Product Passports that satisfy 
                every regulator and every buyer.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                <Link href="/demo">
                  <Button size="lg" className="gap-2" data-testid="button-request-demo-bottom">
                    Request Demo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/compliance/eudr">
                  <Button size="lg" variant="outline" className="gap-2 border-slate-600 text-white backdrop-blur" data-testid="button-learn-eudr">
                    Learn About EUDR
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
