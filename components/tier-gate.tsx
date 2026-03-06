'use client';

import { useOrg } from '@/lib/contexts/org-context';
import { hasTierAccess, TIER_LABELS, type TierFeature, type SubscriptionTier } from '@/lib/config/tier-gating';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowUpCircle } from 'lucide-react';

interface TierGateProps {
  feature: TierFeature;
  requiredTier: SubscriptionTier;
  children: React.ReactNode;
  featureLabel?: string;
}

export function TierGate({ feature, requiredTier, children, featureLabel }: TierGateProps) {
  const { organization, isLoading } = useOrg();

  if (isLoading) return null;

  const hasAccess = hasTierAccess(organization?.subscription_tier, feature);

  if (hasAccess) return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl" data-testid="text-tier-gate-title">
            {featureLabel || 'Feature'} Requires Upgrade
          </CardTitle>
          <CardDescription>
            This feature is available on the{' '}
            <Badge variant="secondary" data-testid="badge-required-tier">
              {TIER_LABELS[requiredTier]}
            </Badge>{' '}
            plan and above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ArrowUpCircle className="h-4 w-4" />
            <span>Contact your administrator to upgrade your organization plan.</span>
          </div>
          {organization && (
            <p className="text-xs text-muted-foreground">
              Current plan:{' '}
              <Badge variant="outline" data-testid="badge-current-tier">
                {TIER_LABELS[(organization.subscription_tier || 'starter') as SubscriptionTier]}
              </Badge>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
