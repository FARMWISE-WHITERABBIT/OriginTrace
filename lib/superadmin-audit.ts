import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';

export type SuperadminTargetType =
  | 'organization'
  | 'user'
  | 'subscription'
  | 'feature_toggle'
  | 'impersonation'
  | 'payment_link'
  | 'system';

export interface SuperadminAuditParams {
  superadminId: string;
  action: string;
  targetType: SuperadminTargetType;
  targetId?: string;
  targetLabel?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}

export async function logSuperadminAction(params: SuperadminAuditParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    const ip = params.request
      ? params.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        params.request.headers.get('x-real-ip') ||
        'unknown'
      : undefined;

    await supabase.from('superadmin_audit_logs').insert({
      superadmin_id: params.superadminId,
      action:        params.action,
      target_type:   params.targetType,
      target_id:     params.targetId,
      target_label:  params.targetLabel,
      before_state:  params.beforeState,
      after_state:   params.afterState,
      metadata:      params.metadata || {},
      ip_address:    ip,
    });
  } catch (err) {
    // Never let audit logging failure break the main operation
    console.error('[superadmin-audit] Failed to log action:', err);
  }
}
