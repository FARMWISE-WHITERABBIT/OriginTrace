/**
 * Shared Zod schemas for all OriginTrace API routes.
 * Import the schema you need rather than re-declaring inline.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
export const uuidSchema = z.string().uuid('Invalid UUID');
export const orgIdSchema = uuidSchema;
export const phoneSchema = z.string().min(7).max(20).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number');
export const dateSchema = z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' });
export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const farmerLoginSchema = z.object({
  phone: phoneSchema,
  pin:   z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
});

export const farmerActivateSchema = z.object({
  token: z.string().min(1, 'Token required'),
  pin:   z.string().length(4).regex(/^\d{4}$/),
});

// ---------------------------------------------------------------------------
// Bags
// ---------------------------------------------------------------------------
export const bagCreateSchema = z.object({
  count: z.number().int().min(1).max(10_000),
});

// ---------------------------------------------------------------------------
// Keys (API keys)
// ---------------------------------------------------------------------------
export const keyCreateSchema = z.object({
  name:               z.string().min(1).max(100),
  scopes:             z.array(z.enum(['read', 'write', 'admin'])).min(1),
  expires_in_days:    z.number().int().min(1).max(365).optional(),
  rate_limit_per_hour: z.number().int().min(1).max(10_000).optional(),
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const notificationUpdateSchema = z.object({
  notification_id: uuidSchema.optional(),
  mark_all_read:   z.boolean().optional(),
}).refine(d => d.notification_id || d.mark_all_read, {
  message: 'Provide notification_id or mark_all_read: true',
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(200),
});

// ---------------------------------------------------------------------------
// Delegations
// ---------------------------------------------------------------------------
export const delegationCreateSchema = z.object({
  delegated_to:  uuidSchema,
  permission:    z.enum(['read', 'write', 'admin']),
  region_scope:  z.string().optional(),
  expires_at:    dateSchema.optional(),
});

export const delegationActionSchema = z.object({
  delegation_id: uuidSchema,
  action:        z.enum(['revoke', 'extend']),
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
const VALID_DOC_TYPES = [
  'certificate_of_origin', 'phytosanitary', 'bill_of_lading', 'packing_list',
  'commercial_invoice', 'fumigation_certificate', 'lab_report', 'customs_declaration',
  'insurance_certificate', 'other',
] as const;

export const documentCreateSchema = z.object({
  title:         z.string().min(1).max(200),
  document_type: z.enum(VALID_DOC_TYPES),
  file_url:      z.string().url().optional().nullable(),
  expiry_date:   dateSchema.optional().nullable(),
  shipment_id:   uuidSchema.optional().nullable(),
  notes:         z.string().max(1000).optional().nullable(),
});

// ---------------------------------------------------------------------------
// Feature toggles (superadmin)
// ---------------------------------------------------------------------------
export const featureToggleSchema = z.object({
  org_id:                    uuidSchema,
  subscription_tier:         z.enum(['free', 'starter', 'growth', 'enterprise']),
  feature_flags:             z.record(z.boolean()).optional(),
  agent_seat_limit:          z.number().int().min(0).optional(),
  monthly_collection_limit:  z.number().int().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Tier templates (superadmin)
// ---------------------------------------------------------------------------
export const tierTemplatesSchema = z.object({
  templates: z.record(z.object({
    features:                  z.record(z.boolean()),
    agent_seat_limit:          z.number().int().min(0),
    monthly_collection_limit:  z.number().int().min(0),
  })),
});

// ---------------------------------------------------------------------------
// Compliance profiles
// ---------------------------------------------------------------------------
export const complianceProfileCreateSchema = z.object({
  profile_name:        z.string().min(1).max(200),
  standard_type:       z.string().min(1),
  target_market:       z.string().min(1),
  requirements:        z.record(z.unknown()).optional(),
  auto_apply_to_farms: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Supply chain links
// ---------------------------------------------------------------------------
export const supplyChainLinkSchema = z.object({
  exporter_org_name: z.string().min(1).max(200),
  exporter_email:    z.string().email(),
});

// ---------------------------------------------------------------------------
// Cold chain logs
// ---------------------------------------------------------------------------
export const coldChainLogSchema = z.object({
  log_type:      z.enum(['temperature', 'humidity', 'shock', 'location']),
  value:         z.number(),
  unit:          z.string().max(20).optional(),
  location:      z.string().max(200).optional(),
  recorded_at:   dateSchema.optional(),
  threshold_min: z.number().optional(),
  threshold_max: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Shipment lots
// ---------------------------------------------------------------------------
export const lotCreateSchema = z.object({
  lot_number:      z.string().min(1).max(100),
  weight_kg:       z.number().positive(),
  source_batch_id: uuidSchema.optional().nullable(),
  commodity:       z.string().optional(),
  notes:           z.string().max(1000).optional(),
});

export const lotUpdateSchema = z.object({
  lot_id:       uuidSchema,
  add_items:    z.array(z.object({ item_type: z.string(), batch_id: uuidSchema.optional() })).optional(),
  remove_items: z.array(uuidSchema).optional(),
  update:       z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Shipment outcomes
// ---------------------------------------------------------------------------
const VALID_REJECTION_CATEGORIES = [
  'documentation', 'quality', 'contamination', 'customs', 'labelling', 'other',
] as const;

export const shipmentOutcomeSchema = z.object({
  outcome:              z.enum(['accepted', 'rejected', 'conditional', 'pending']),
  outcome_date:         dateSchema.optional(),
  rejection_category:   z.enum(VALID_REJECTION_CATEGORIES).optional(),
  rejection_reason:     z.string().max(1000).optional(),
  port_of_entry:        z.string().max(200).optional(),
  customs_reference:    z.string().max(200).optional(),
  inspector_notes:      z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Yield validation
// ---------------------------------------------------------------------------
export const yieldValidationSchema = z.object({
  farm_id:       uuidSchema,
  batch_weight:  z.number().positive(),
  commodity:     z.string().min(1),
});

export const yieldReviewSchema = z.object({
  batch_id: uuidSchema,
  action:   z.enum(['approve', 'reject', 'flag']),
  notes:    z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Helper: parse + return typed error
// ---------------------------------------------------------------------------
import { NextResponse } from 'next/server';

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      ),
    };
  }
  return { data: result.data, error: null };
}
