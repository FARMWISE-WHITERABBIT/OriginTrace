import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditEventParams {
  orgId?: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('audit_events').insert({
      org_id: params.orgId || null,
      actor_id: params.actorId || null,
      actor_email: params.actorEmail || null,
      action: params.action,
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
