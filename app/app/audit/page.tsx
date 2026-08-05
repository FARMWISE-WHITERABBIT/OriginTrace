'use client';

import { AuditLogContent } from './audit-content';

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-audit-title">
          Audit Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Immutable record of all data changes and actions across your organization.
        </p>
      </div>
      <AuditLogContent />
    </div>
  );
}
