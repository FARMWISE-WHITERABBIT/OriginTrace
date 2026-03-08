import { z, ZodSchema } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Generic request body validator
// ---------------------------------------------------------------------------
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return {
      data: null,
      error: NextResponse.json({ error: 'Validation failed', issues }, { status: 422 }),
    };
  }

  return { data: result.data, error: null };
}

// ---------------------------------------------------------------------------
// Query param validator
// ---------------------------------------------------------------------------
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  const raw: Record<string, string> = {};
  searchParams.forEach((v, k) => { raw[k] = v; });

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return {
      data: null,
      error: NextResponse.json({ error: 'Invalid query parameters', issues }, { status: 422 }),
    };
  }

  return { data: result.data, error: null };
}

// ---------------------------------------------------------------------------
// Common reusable schemas
// ---------------------------------------------------------------------------
export const UUIDParam = z.string().uuid('Must be a valid UUID');
export const OrgIdParam = z.string().min(1);
export const PaginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(200)).default('50'),
});

// Shipment schemas
export const CreateShipmentSchema = z.object({
  destination_country: z.string().min(2).max(100),
  target_regulations: z.array(z.string()).default([]),
  compliance_profile_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional(),
  estimated_ship_date: z.string().datetime({ offset: true }).optional().nullable(),
});

export const UpdateShipmentSchema = z.object({
  destination_country: z.string().min(2).max(100).optional(),
  status: z.enum(['draft', 'pending', 'booked', 'in_transit', 'delivered', 'cancelled']).optional(),
  notes: z.string().max(2000).optional(),
  estimated_ship_date: z.string().datetime({ offset: true }).optional().nullable(),
  compliance_profile_id: z.string().uuid().optional().nullable(),
  add_items: z.array(z.object({
    item_type: z.enum(['batch', 'finished_good']),
    batch_id: z.string().uuid().optional().nullable(),
    finished_good_id: z.string().uuid().optional().nullable(),
    weight_kg: z.number().min(0),
    farm_count: z.number().min(0).default(0),
  })).optional(),
  remove_item_ids: z.array(z.string().uuid()).optional(),
});

// Farm schemas
export const CreateFarmSchema = z.object({
  farmer_name: z.string().min(1).max(200),
  community: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  commodity: z.string().max(100).optional(),
  area_hectares: z.number().min(0).max(100000).optional(),
  gps_latitude: z.number().min(-90).max(90).optional().nullable(),
  gps_longitude: z.number().min(-180).max(180).optional().nullable(),
  boundary_geo: z.any().optional().nullable(),
});

// Batch schemas
export const CreateBatchSchema = z.object({
  batch_id: z.string().min(1).max(100),
  farm_id: z.string().uuid().optional().nullable(),
  commodity: z.string().min(1).max(100),
  total_weight: z.number().min(0),
  bag_count: z.number().int().min(0),
  notes: z.string().max(2000).optional(),
});

// Document schemas
export const CreateDocumentSchema = z.object({
  name: z.string().min(1).max(300),
  type: z.string().min(1).max(100),
  file_url: z.string().url(),
  expiry_date: z.string().datetime({ offset: true }).optional().nullable(),
  linked_entity_type: z.enum(['farm', 'batch', 'shipment', 'finished_good', 'org']).optional(),
  linked_entity_id: z.string().uuid().optional().nullable(),
});

// Payment schemas
export const CreatePaymentSchema = z.object({
  payee_type: z.enum(['farmer', 'agent', 'supplier', 'other']),
  payee_id: z.string().uuid().optional().nullable(),
  amount: z.number().min(0),
  currency: z.string().length(3).default('NGN'),
  payment_method: z.enum(['bank_transfer', 'mobile_money', 'cash', 'cheque', 'other']),
  notes: z.string().max(2000).optional(),
});

// Compliance profile schemas
export const CreateComplianceProfileSchema = z.object({
  name: z.string().min(1).max(200),
  destination_market: z.string().min(1).max(200),
  regulation_framework: z.enum(['EUDR', 'UK_Environment_Act', 'Lacey_Act_UFLPA', 'China_Green_Trade', 'UAE_Halal', 'FSMA_204', 'custom']),
  required_documents: z.array(z.string()).default([]),
  required_certifications: z.array(z.string()).default([]),
  geo_verification_level: z.enum(['basic', 'polygon', 'satellite']).default('basic'),
  min_traceability_depth: z.number().int().min(1).max(10).default(1),
  custom_rules: z.record(z.any()).optional(),
});

// Analytics query schema
export const AnalyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  section: z.enum(['all', 'operational', 'strategic', 'shipments', 'documents', 'financial']).default('all'),
});
