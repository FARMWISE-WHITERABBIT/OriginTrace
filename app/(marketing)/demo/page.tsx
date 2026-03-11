import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import { LiveAgentIndicator } from '@/components/marketing/trace-animation';
import { DemoFormWidget } from '@/components/marketing/demo-form';
import { Shield, MapPin, FileText, Calendar } from 'lucide-react';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main className="pt-28 pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            <FadeIn direction="right">
              <p
                className="text-sm font-medium text-primary mb-4 tracking-wide uppercase"
                data-testid="text-section-label"
              >
                [ Request a Demo ]
              </p>
              <h1
                className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6"
                data-testid="text-demo-heading"
              >
                Get Your Verified Pedigree Pilot
              </h1>
              <p
                className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-lg"
                data-testid="text-demo-description"
              >
                We&apos;ll review your operation and show you exactly how OriginTrace can strengthen
                your export compliance and reduce shipment rejection risk.
              </p>

              <div className="space-y-6 mb-10">
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" data-testid="text-feature-compliance">
                      Compliance Assessment
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Identify gaps in your current traceability and documentation across EUDR, FSMA
                      204, UK, and more.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" data-testid="text-feature-demo">
                      Live Platform Demo
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      See polygon mapping, bag traceability, and DDS export in a live environment
                      tailored to your commodity.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" data-testid="text-feature-pilot">
                      Pilot Onboarding
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      30-day pilot with a dedicated compliance success manager and full platform
                      access.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
                <LiveAgentIndicator />
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Response within 24h</span>
                </div>
              </div>
            </FadeIn>

            {/* DemoFormWidget handles submitted state and renders its own full-page success view */}
            <DemoFormWidget />
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
