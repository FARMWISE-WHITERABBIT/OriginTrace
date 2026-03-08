'use client';

import { WebhooksContent } from '@/components/settings/webhooks-content';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Webhook } from 'lucide-react';
import Link from 'next/link';

export default function WebhooksSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/app/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-webhooks-title">
            <Webhook className="h-6 w-6 text-[#2E7D6B]" />
            Webhook Endpoints
          </h1>
          <p className="text-muted-foreground mt-1">
            Stream events to external systems for ERP integration, notifications, and automation.
          </p>
        </div>
      </div>
      <WebhooksContent />
    </div>
  );
}
