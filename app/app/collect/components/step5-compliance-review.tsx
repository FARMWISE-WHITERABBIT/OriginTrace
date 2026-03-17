'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';
import type { CollectionLogic } from './use-collection-logic';

interface Step5Props {
  logic: CollectionLogic;
}

export function Step5ComplianceReview({ logic }: Step5Props) {
  const {
    organization, complianceScore, complianceFlags,
    complianceAttestations, setComplianceAttestations,
    hasBlockingIssues,
  } = logic;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Compliance Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                strokeWidth="8"
                strokeDasharray={`${(complianceScore / 100) * 326.73} 326.73`}
                strokeLinecap="round"
                className={complianceScore === 100 ? 'text-green-500' : complianceScore >= 70 ? 'text-amber-500' : 'text-red-500'}
                stroke="currentColor"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono" data-testid="text-compliance-score">{complianceScore}%</span>
              <span className="text-xs text-muted-foreground">Compliance</span>
            </div>
          </div>
        </div>

        {complianceScore === 100 ? (
          <div className="p-4 text-center space-y-2 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950/30">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
            <div className="font-medium text-green-700 dark:text-green-400">Export Ready</div>
            <div className="text-sm text-muted-foreground">All farms have GPS polygons and pass compliance checks.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Hard blocks */}
            {complianceFlags.some(f => f.type === 'farm_rejected' || f.type === 'overlap') && (
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                Blocking Issues — must resolve before finalizing
              </div>
            )}
            {complianceFlags.filter(f => f.type === 'farm_rejected' || f.type === 'overlap').map((flag, i) => (
              <div key={`block-${i}`} className="flex items-start gap-3 p-3 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{flag.farmer_name}</div>
                  <div className="text-sm text-muted-foreground">{flag.message}</div>
                  <Badge variant="outline" className="text-xs text-red-600 border-red-300 mt-1">
                    {flag.type === 'farm_rejected' ? 'Farm rejected' : 'Boundary conflict'}
                  </Badge>
                </div>
              </div>
            ))}
            {/* Soft warnings */}
            {complianceFlags.some(f => f.type === 'polygon_missing' || f.type === 'yield_warning') && (
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1 mt-3">
                Warnings — collection can proceed
              </div>
            )}
            {complianceFlags.filter(f => f.type === 'polygon_missing' || f.type === 'yield_warning').map((flag, i) => (
              <div key={`warn-${i}`} className="flex items-start gap-3 p-3 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{flag.farmer_name}</div>
                  <div className="text-sm text-muted-foreground">{flag.message}</div>
                  {flag.type === 'polygon_missing' && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 mt-1">Map boundary later</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="text-xs text-muted-foreground">
            {!hasBlockingIssues && complianceFlags.length === 0
              ? 'All checks passed. You can finalize this batch.'
              : hasBlockingIssues
              ? 'Resolve the blocking issues above before finalizing. Remove rejected farms from this collection.'
              : 'Warnings noted — you can still finalize. Map missing boundaries later to strengthen traceability.'}
          </div>
        </div>

        {(() => {
          const cs = (organization?.settings || {}) as Record<string, boolean>;
          const hasGFL = !!cs.gfl_supplier_traceability || !!cs.gfl_food_safety_hazards;
          const hasOrganic = !!cs.organic_input_tracking;
          const hasFSMA = !!cs.fsma_critical_tracking_events || !!cs.fsma_key_data_elements;
          const hasLacey = !!cs.lacey_species_identification;
          if (!hasGFL && !hasOrganic && !hasFSMA && !hasLacey) return null;
          return (
            <div className="space-y-3 pt-4 border-t">
              <div className="text-sm font-medium">Framework-Specific Collection Data</div>
              {hasGFL && (
                <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Supplier Traceability</span>
                    <Badge variant="outline" className="text-xs">GFL</Badge>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" data-testid="check-one-step-back" checked={!!complianceAttestations.one_step_back} onChange={(e) => setComplianceAttestations(prev => ({...prev, one_step_back: e.target.checked}))} />
                    One-step-back supplier info documented
                  </label>
                  {cs.gfl_food_safety_hazards && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" data-testid="check-hazard-assessment" checked={!!complianceAttestations.hazard_assessment} onChange={(e) => setComplianceAttestations(prev => ({...prev, hazard_assessment: e.target.checked}))} />
                      Food safety hazard assessment completed
                    </label>
                  )}
                </div>
              )}
              {hasOrganic && (
                <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Organic Input Verification</span>
                    <Badge variant="outline" className="text-xs">EU Organic</Badge>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" data-testid="check-no-prohibited-inputs" checked={!!complianceAttestations.no_prohibited_inputs} onChange={(e) => setComplianceAttestations(prev => ({...prev, no_prohibited_inputs: e.target.checked}))} />
                    No prohibited substances or inputs used
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" data-testid="check-organic-segregation" checked={!!complianceAttestations.organic_segregation} onChange={(e) => setComplianceAttestations(prev => ({...prev, organic_segregation: e.target.checked}))} />
                    Produce segregated from conventional
                  </label>
                </div>
              )}
              {hasFSMA && (
                <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Critical Tracking Events</span>
                    <Badge variant="outline" className="text-xs">FSMA 204</Badge>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" data-testid="check-cte-growing" checked={!!complianceAttestations.cte_growing} onChange={(e) => setComplianceAttestations(prev => ({...prev, cte_growing: e.target.checked}))} />
                    Growing CTE: Location, dates, lot code recorded
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" data-testid="check-cte-receiving" checked={!!complianceAttestations.cte_receiving} onChange={(e) => setComplianceAttestations(prev => ({...prev, cte_receiving: e.target.checked}))} />
                    Receiving CTE: Source, quantity, date recorded
                  </label>
                </div>
              )}
              {hasLacey && (
                <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Species Identification</span>
                    <Badge variant="outline" className="text-xs">Lacey Act</Badge>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" data-testid="check-species-documented" checked={!!complianceAttestations.species_documented} onChange={(e) => setComplianceAttestations(prev => ({...prev, species_documented: e.target.checked}))} />
                    Species/variety name and country of harvest documented
                  </label>
                </div>
              )}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
