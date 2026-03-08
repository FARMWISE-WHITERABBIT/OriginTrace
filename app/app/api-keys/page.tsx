'use client';

import { ApiKeysContent } from '@/components/settings/api-keys-content';

export default function ApiKeysPage() {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">API Keys</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage API keys for programmatic access to your data</p>
      </div>
      <ApiKeysContent />
    </div>
  );
}
