import { NextRequest, NextResponse } from 'next/server';
import { ApiError, withErrorHandling } from '@/lib/api/errors';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { requireRole, ROLES } from '@/lib/rbac';
import {
  getConfiguredGfwKeyFingerprints,
  getGfwKeyHealthSnapshot,
} from '@/lib/services/gfw-deforestation';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile) return ApiError.notFound('Profile');

  const roleError = requireRole(profile, ROLES.COMPLIANCE_ROLES);
  if (roleError) return roleError;

  return NextResponse.json({
    configured_keys: getConfiguredGfwKeyFingerprints(),
    health: getGfwKeyHealthSnapshot(),
    notes: {
      key_values_exposed: false,
      scope: 'process-local runtime telemetry',
    },
  });
}, 'deforestation-check/gfw-health/GET');
