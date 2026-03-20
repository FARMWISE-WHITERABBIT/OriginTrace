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

/**
 * Parse page/limit from URLSearchParams and return Supabase `.range()` args.
 *
 * Usage in a GET handler:
 *   const { from, to, page, limit } = parsePagination(request.nextUrl.searchParams);
 *   const { data, count } = await supabase
 *     .from('table')
 *     .select('*', { count: 'exact' })
 *     .range(from, to);
 *   return NextResponse.json({ items: data, pagination: { page, limit, total: count ?? 0 } });
 */
export function parsePagination(searchParams: URLSearchParams): {
  from: number;
  to: number;
  page: number;
  limit: number;
} {
  const rawPage  = parseInt(searchParams.get('page')  ?? '', 10);
  const rawLimit = parseInt(searchParams.get('limit') ?? '', 10);
  const page  = Math.max(1, isNaN(rawPage)  ? 1  : rawPage);
  const limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;
  return { from, to, page, limit };
}

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
// Farms
// ---------------------------------------------------------------------------
export const farmCreateSchema = z.object({
  farmer_name:     z.string().min(1, 'Farmer name is required'),
  farmer_id:       z.string().optional(),
  phone:           z.string().optional(),
  community:       z.string().min(1, 'Community is required'),
  boundary: z.object({
    type:        z.string().optional(),
    coordinates: z.array(z.unknown()).optional(),
  }).nullable().optional(),
  area_hectares:    z.number().positive().nullable().optional(),
  legality_doc_url: z.string().url().nullable().optional(),
});

export const farmPatchSchema = z.object({
  id:                z.union([z.string(), z.number()]).transform(v => Number(v)),
  compliance_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  compliance_notes:  z.string().optional(),
});

// ---------------------------------------------------------------------------
// Batches (collection)
// ---------------------------------------------------------------------------
export const batchCreateSchema = z.object({
  farm_id:      z.union([z.string(), z.number()]).transform(v => String(v)),
  bags: z.array(z.object({
    serial:       z.string().optional(),
    weight:       z.number().optional(),
    grade:        z.string().optional(),
    is_compliant: z.boolean().optional(),
  })).optional(),
  notes:        z.string().optional(),
  local_id:     z.string().optional(),
  collected_at: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------
export const shipmentCreateSchema = z.object({
  destination_country:    z.string().min(1, 'Destination country is required'),
  commodity:              z.string().min(1, 'Commodity is required'),
  buyer_company:          z.string().optional(),
  buyer_contact:          z.string().optional(),
  target_regulations:     z.array(z.string()).optional(),
  destination_port:       z.string().optional(),
  notes:                  z.string().optional(),
  estimated_ship_date:    z.string().optional(),
  compliance_profile_id:  z.number().optional(),
  contract_id:            z.number().optional(),
  document_ids:           z.array(z.number()).optional(),
});

// ---------------------------------------------------------------------------
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
  'export_license', 'phytosanitary', 'fumigation', 'organic_cert', 'insurance',
  'lab_result', 'customs_declaration', 'bill_of_lading', 'certificate_of_origin',
  'quality_cert',
  'uk_due_diligence', 'fda_prior_notice', 'lacey_act_declaration',
  'gacc_registration', 'gb_standards_cert', 'china_customs_declaration',
  'halal_certificate', 'esma_compliance', 'gulf_certificate_of_conformity',
  'other',
] as const;

export const documentCreateSchema = z.object({
  title:              z.string().min(1).max(200),
  document_type:      z.enum(VALID_DOC_TYPES),
  file_url:           z.string().url().optional().nullable(),
  file_name:          z.string().max(500).optional().nullable(),
  file_size:          z.number().int().optional().nullable(),
  issued_date:        dateSchema.optional().nullable(),
  expiry_date:        dateSchema.optional().nullable(),
  linked_entity_type: z.string().max(100).optional().nullable(),
  linked_entity_id:   z.string().max(200).optional().nullable(),
  shipment_id:        uuidSchema.optional().nullable(),
  notes:              z.string().max(1000).optional().nullable(),
});

// ---------------------------------------------------------------------------
// Feature toggles (superadmin)
// ---------------------------------------------------------------------------
export const featureToggleSchema = z.object({
  org_id:                    uuidSchema,
  subscription_tier:         z.enum(['starter', 'basic', 'pro', 'enterprise']),
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
  outcome:              z.enum(['accepted', 'rejected', 'conditional', 'pending', 'approved', 'delayed', 'conditional_release']),
  outcome_date:         dateSchema.optional(),
  rejection_category:   z.enum(VALID_REJECTION_CATEGORIES).optional(),
  rejection_reason:     z.string().max(1000).optional(),
  port_of_entry:        z.string().max(200).optional(),
  customs_reference:    z.string().max(200).optional(),
  inspector_notes:      z.string().max(2000).optional(),
  financial_impact_usd: z.number().optional(),
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
import { ApiError } from '@/lib/api/errors';

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { data: null, error: ApiError.validation(result.error) };
  }
  return { data: result.data, error: null };
}

// ---------------------------------------------------------------------------
// Helper: parse URL search params with a Zod schema.
//
// Converts NextRequest.nextUrl.searchParams (or a plain URLSearchParams)
// into a plain object and validates it, returning either typed data or a
// ready-to-return 400 NextResponse.
//
// Usage:
//   const { data, error } = parseQuery(request.nextUrl.searchParams, z.object({
//     status: z.enum(['pending','approved']).optional(),
//     page:   z.coerce.number().int().min(1).default(1),
//   }));
//   if (error) return error;
//   // data is fully typed
// ---------------------------------------------------------------------------
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  // Convert URLSearchParams to a plain object.
  // For repeated keys (e.g. ?id=1&id=2) we keep the last value to match
  // the most common single-value pattern; callers needing arrays should
  // use z.array() with a transform on a comma-separated value instead.
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid query parameters', details: result.error.flatten().fieldErrors },
        { status: 400 }
      ),
    };
  }
  return { data: result.data, error: null };
}
