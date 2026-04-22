import { Suspense } from 'react';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { CalcomEmbed } from './calcom-embed';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book Your Discovery Call | OriginTrace',
  description: 'Pick a time for your OriginTrace discovery call. 30 minutes to see exactly how we handle traceability and EUDR compliance for your operation.',
};

export default function DemoConfirmPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Request received — book your call
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Pick a time below and you&apos;ll have a confirmed slot instantly. No waiting for a reply.
            </p>
          </div>

          {/* What to expect strip */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { step: '30 min', label: 'Discovery call' },
              { step: '45 min', label: 'Platform demo' },
              { step: '30 days', label: 'Pilot period' },
            ].map(({ step, label }) => (
              <div key={step} className="text-center p-4 rounded-lg bg-muted/40 border">
                <p className="text-xl font-bold text-primary">{step}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Cal.com embed */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <Suspense fallback={
              <div className="flex items-center justify-center h-[600px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            }>
              <CalcomEmbed />
            </Suspense>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Prefer email?{' '}
            <a href="mailto:hello@origintrace.trade" className="underline underline-offset-2">
              hello@origintrace.trade
            </a>
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
