import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn, StaggerContainer, StaggerItem, ScaleIn } from '@/components/marketing/motion';
import { 
  Scale,
  Factory,
  AlertTriangle,
  Shield,
  FileText,
  ChevronRight,
  Check,
  ClipboardCheck,
  Package,
  Layers,
  BarChart3,
  ArrowRight
} from 'lucide-react';

const processingControls = [
  {
    icon: Scale,
    title: 'Mass Balance Enforcement',
    description: 'Input-output reconciliation with commodity-specific recovery rates. Automatic validation flags discrepancies before they become compliance issues.',
  },
  {
    icon: Factory,
    title: 'Transformation Audit Trail',
    description: 'Complete processing run records with timestamped logs. Link input batches to output products with verifiable transformation records.',
  },
  {
    icon: Shield,
    title: 'Identity Preservation',
    description: 'Maintain source segregation through the entire processing chain. Track which farms contributed to each finished good for full traceability.',
  },
  {
    icon: AlertTriangle,
    title: 'Contamination Prevention',
    description: 'Instant alerts when non-compliant or flagged batches are about to enter the production line. Prevent contamination before it reaches finished goods.',
  },
];

const commodityRecovery = [
  {
    name: 'Cocoa',
    rates: [
      { product: 'Butter', range: '38-45%' },
      { product: 'Powder', range: '20-25%' },
      { product: 'Liquor', range: '80-85%' },
    ],
  },
  {
    name: 'Cashew',
    rates: [
      { product: 'Kernels', range: '22-28%' },
      { product: 'CNSL', range: '18-22%' },
      { product: 'Shell', range: '65-70%' },
    ],
  },
  {
    name: 'Palm Kernel',
    rates: [
      { product: 'Oil', range: '45-52%' },
      { product: 'Cake', range: '40-48%' },
      { product: 'Losses', range: '5-10%' },
    ],
  },
];

export default function ProcessorsPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main>
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-slate-50 dark:bg-slate-900/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="max-w-3xl">
                <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
                  [ For Processors ]
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900 dark:text-slate-50">
                  Maintain Chain-of-Custody Through Every Transformation
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8 max-w-2xl">
                  Processing is where traceability breaks. OriginTrace maintains audit-ready chain-of-custody through crushing, fermentation, and transformation — so every finished good can be traced to its source farms.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2" data-testid="button-request-demo">
                      Request Demo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/solutions#processors">
                    <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-solutions">
                      View All Solutions
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-20 md:py-28 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16">
              <FadeIn direction="right">
                <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                  [ Processing Controls ]
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
                  End-to-End Processing Visibility
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Every transformation step is documented, validated, and audit-ready.
                </p>
                
                <div className="space-y-8">
                  {processingControls.map((control) => (
                    <div key={control.title} className="flex gap-4">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                        <control.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">{control.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {control.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>
              
              <FadeIn direction="left" delay={0.2}>
                <Card className="shadow-lg">
                  <CardContent className="p-8">
                    <p className="text-xs font-medium text-primary mb-4 tracking-wide uppercase">
                      [ Live Dashboard Preview ]
                    </p>
                    <h3 className="font-semibold mb-6">Processing Run Summary</h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">Input Batches</span>
                          <span className="text-sm font-medium">12 batches</span>
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm text-muted-foreground">Total Weight</span>
                          <span className="text-sm font-medium">24,500 kg</span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">Output Product</span>
                          <span className="text-sm font-medium">Cocoa Butter</span>
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm text-muted-foreground">Output Weight</span>
                          <span className="text-sm font-medium">10,045 kg</span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">Recovery Rate</span>
                          <span className="text-sm font-medium">41.0%</span>
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm text-muted-foreground">Expected Range</span>
                          <span className="text-xs text-muted-foreground">38% - 45%</span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm text-primary">Mass Balance</span>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">Verified</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm text-muted-foreground">Source Farms</span>
                          <span className="text-sm font-medium">347 farms traced</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-muted/30 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                [ Recovery Standards ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                Commodity-Specific Recovery Standards
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Pre-configured industry-standard recovery rates for accurate mass balance validation across commodity types.
              </p>
            </FadeIn>
            
            <StaggerContainer className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {commodityRecovery.map((commodity) => (
                <StaggerItem key={commodity.name}>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <h3 className="font-semibold mb-3 text-lg">{commodity.name}</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {commodity.rates.map((rate) => (
                          <p key={rate.product}>{rate.product}: {rate.range}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-20 md:py-28 border-t">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <FadeIn className="mb-12">
              <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                [ Get Started ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                See How It Works for Your Commodity
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Schedule a demo to see OriginTrace processing controls configured for your specific commodity and transformation workflows.
              </p>
              <Link href="/demo">
                <Button size="lg" className="gap-2" data-testid="button-request-demo-mid">
                  Request Demo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>

        <section className="py-20 md:py-28 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="mb-12">
              <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                [ Output & Compliance ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                From Processing Floor to Export Documentation
              </h2>
              <p className="text-muted-foreground max-w-2xl leading-relaxed">
                Every finished good carries its full traceability story — from source farms through every transformation step to final export dossier.
              </p>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 gap-8">
              <StaggerItem>
                <ScaleIn>
                  <Card className="border-0 bg-primary text-primary-foreground h-full">
                    <CardContent className="p-8">
                      <FileText className="h-8 w-8 mb-4 opacity-80" />
                      <h3 className="text-xl font-semibold mb-3">
                        Finished Goods Pedigree
                      </h3>
                      <p className="text-primary-foreground/80 mb-6">
                        Generate QR codes for finished products that link back to 
                        every source farm GPS coordinate. Auditors verify in seconds.
                      </p>
                      <Link href="/pedigree">
                        <Button variant="secondary" size="sm" className="gap-2" data-testid="link-pedigree">
                          Learn More
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </ScaleIn>
              </StaggerItem>
              
              <StaggerItem>
                <ScaleIn delay={0.1}>
                  <Card className="h-full">
                    <CardContent className="p-8">
                      <ClipboardCheck className="h-8 w-8 mb-4 text-primary" />
                      <h3 className="text-xl font-semibold mb-3">
                        Export Compliance Documentation
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        One-click export of compliance dossiers with complete 
                        traceability data for EU, UK, US, and buyer-driven regulatory submissions.
                      </p>
                      <Link href="/demo">
                        <Button variant="outline" size="sm" className="gap-2" data-testid="link-demo-compliance">
                          Request Demo
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </ScaleIn>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-muted/30 border-t">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <FadeIn>
              <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                [ Take the Next Step ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                Ready to Make Your Processing Audit-Ready?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                See how OriginTrace maintains traceability through every transformation step — from raw material intake to finished good export.
              </p>
              <Link href="/demo">
                <Button size="lg" className="gap-2" data-testid="button-request-demo-bottom">
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