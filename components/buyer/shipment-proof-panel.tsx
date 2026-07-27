'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
  Info,
  ListChecks,
  Loader2,
  Package,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface ProfileSummary {
  id: string;
  name: string;
  version: string | null;
  destination: {
    country_code: string | null;
    country: string;
    port: string | null;
  };
  destination_market: string;
  regulation_framework: string;
  is_placeholder: boolean;
  buyer_approved: boolean | null;
  disclaimer: string | null;
}

interface RequirementCheck {
  key: string;
  label: string;
  category: 'document' | 'certification' | 'geolocation' | 'traceability';
  met: boolean;
  private_requirement: boolean;
}

interface ProofStatus {
  shipment_id: string;
  shipment_code: string;
  overall_verification_status: 'verified' | 'pending' | 'incomplete';
  compliance_profile: ProfileSummary | null;
  profile_alignment: {
    status: 'aligned' | 'mismatch' | 'unassigned' | 'missing_profile';
    aligned: boolean;
    contract_profile: ProfileSummary | null;
    shipment_profile: ProfileSummary | null;
  };
  requirement_checks: RequirementCheck[];
  requirements_met: RequirementCheck[];
  requirements_missing: RequirementCheck[];
  buyer_standards: {
    risk_flags: Array<{ category: string; message: string; severity?: string }>;
    remediation: Array<{
      requirement_key: string;
      priority: string;
      title: string;
      description: string;
    }>;
  };
  readiness: {
    score: number | null;
    decision: string | null;
    ok: boolean;
  };
  lab_results: {
    total: number;
    passed: number;
    failed: number;
    conditional: number;
    latest_test_date: string | null;
    ok: boolean;
  };
  evidence_package: {
    generated: boolean;
    expired: boolean;
    share_token: string | null;
    view_count: number;
    ok: boolean;
  };
  documents: {
    total: number;
    active: number;
    expired: number;
    ok: boolean;
  };
}

function StatusIcon({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) {
    return <Clock className="h-4 w-4 text-muted-foreground" aria-label={label} />;
  }
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label={label} />
    : <XCircle className="h-4 w-4 text-destructive" aria-label={label} />;
}

const overallBadgeClass = {
  verified: 'badge-success',
  pending: 'badge-warning',
  incomplete: 'bg-destructive/10 text-destructive',
} as const;

interface ShipmentProofPanelProps {
  shipmentId: string;
}

export function ShipmentProofPanel({ shipmentId }: ShipmentProofPanelProps) {
  const t = useTranslations('BuyerProof');
  const [isOpen, setIsOpen] = useState(false);
  const [proofStatus, setProofStatus] = useState<ProofStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || proofStatus) return;

    async function fetchProof() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/buyer/shipments/${shipmentId}/proof-status`);
        if (!response.ok) throw new Error('proof-status-request-failed');
        setProofStatus(await response.json());
      } catch {
        setError(t('loadError'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProof();
  }, [isOpen, shipmentId, proofStatus, t]);

  const statusLabel = proofStatus
    ? t(`status.${proofStatus.overall_verification_status}`)
    : '';

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={isOpen}
        data-testid={`button-proof-panel-toggle-${shipmentId}`}
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t('title')}</span>
        {isOpen
          ? <ChevronUp className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
          : <ChevronDown className="ml-auto h-3.5 w-3.5" aria-hidden="true" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3" aria-live="polite">
          {isLoading && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{t('loading')}</span>
            </div>
          )}

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          {proofStatus && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('verificationStatus')}
                </span>
                <Badge
                  className={overallBadgeClass[proofStatus.overall_verification_status]}
                  data-testid={`badge-verification-status-${shipmentId}`}
                >
                  {statusLabel}
                </Badge>
              </div>

              {proofStatus.compliance_profile ? (
                <Card data-testid={`buyer-profile-${shipmentId}`}>
                  <CardContent className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {proofStatus.compliance_profile.name}
                      </p>
                      {proofStatus.compliance_profile.version && (
                        <Badge variant="outline">{proofStatus.compliance_profile.version}</Badge>
                      )}
                      {proofStatus.compliance_profile.is_placeholder && (
                        <Badge variant="secondary">{t('illustrativePlaceholder')}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('destination')}: {proofStatus.compliance_profile.destination_market}
                    </p>
                    {proofStatus.compliance_profile.is_placeholder && (
                      <p className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-2 text-xs text-muted-foreground" role="note">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{proofStatus.compliance_profile.disclaimer || t('placeholderDisclaimer')}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <p className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                  {t('profileNotAssigned')}
                </p>
              )}

              <Card>
                <CardContent className="space-y-2.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2" data-testid={`row-profile-alignment-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm">{t('profileAlignment')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t(`alignment.${proofStatus.profile_alignment.status}`)}
                      </span>
                      <StatusIcon
                        ok={proofStatus.profile_alignment.aligned}
                        label={t(`alignment.${proofStatus.profile_alignment.status}`)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2" data-testid={`row-readiness-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm">{t('shipmentReadiness')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {proofStatus.readiness.score !== null && (
                        <span className="text-xs font-medium text-foreground">
                          {proofStatus.readiness.score}%
                        </span>
                      )}
                      <StatusIcon
                        ok={proofStatus.readiness.ok}
                        label={proofStatus.readiness.ok ? t('passed') : t('requiresAttention')}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2" data-testid={`row-lab-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm">{t('labResults')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {proofStatus.lab_results.total > 0
                          ? t('passedCount', {
                              passed: proofStatus.lab_results.passed,
                              total: proofStatus.lab_results.total,
                            })
                          : t('noTests')}
                      </span>
                      <StatusIcon
                        ok={proofStatus.lab_results.total > 0 ? proofStatus.lab_results.ok : null}
                        label={proofStatus.lab_results.total > 0
                          ? (proofStatus.lab_results.ok ? t('passed') : t('requiresAttention'))
                          : t('pending')}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2" data-testid={`row-evidence-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm">{t('evidencePackage')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {proofStatus.evidence_package.generated
                          ? (proofStatus.evidence_package.expired ? t('expired') : t('available'))
                          : t('notGenerated')}
                      </span>
                      <StatusIcon
                        ok={proofStatus.evidence_package.generated ? proofStatus.evidence_package.ok : null}
                        label={proofStatus.evidence_package.ok ? t('available') : t('pending')}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2" data-testid={`row-documents-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm">{t('documentHealth')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {proofStatus.documents.total > 0
                          ? t('activeCount', {
                              active: proofStatus.documents.active,
                              total: proofStatus.documents.total,
                            })
                          : t('noDocuments')}
                      </span>
                      <StatusIcon
                        ok={proofStatus.documents.total > 0 ? proofStatus.documents.ok : null}
                        label={proofStatus.documents.total > 0
                          ? (proofStatus.documents.ok ? t('passed') : t('requiresAttention'))
                          : t('pending')}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid={`requirements-${shipmentId}`}>
                <CardContent className="space-y-3 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm font-medium">{t('profileRequirements')}</span>
                    </div>
                    <Badge variant="outline">
                      {t('requirementsCount', {
                        met: proofStatus.requirements_met.length,
                        total: proofStatus.requirement_checks.length,
                      })}
                    </Badge>
                  </div>
                  {proofStatus.requirement_checks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('requirementsUnavailable')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {proofStatus.requirement_checks.map((check) => (
                        <li key={check.key} className="flex items-start justify-between gap-3 text-sm">
                          <span className="flex items-start gap-2">
                            <StatusIcon
                              ok={check.met}
                              label={check.met ? t('met') : t('missing')}
                            />
                            <span>
                              {check.label}
                              {check.private_requirement && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({t('privatePlaceholderRequirement')})
                                </span>
                              )}
                            </span>
                          </span>
                          <Badge variant={check.met ? 'secondary' : 'destructive'}>
                            {check.met ? t('met') : t('missing')}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {(proofStatus.buyer_standards.risk_flags.length > 0
                || proofStatus.buyer_standards.remediation.length > 0) && (
                <Card>
                  <CardContent className="space-y-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                      <span className="text-sm font-medium">{t('risksAndRemediation')}</span>
                    </div>
                    {proofStatus.buyer_standards.risk_flags.map((flag, index) => (
                      <p key={`${flag.message}-${index}`} className="text-xs text-destructive">
                        {flag.message}
                      </p>
                    ))}
                    {proofStatus.buyer_standards.remediation.map((item) => (
                      <div key={item.requirement_key} className="rounded-md border border-border bg-muted/40 p-2">
                        <p className="text-xs font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {proofStatus.evidence_package.generated
                && !proofStatus.evidence_package.expired
                && proofStatus.evidence_package.share_token && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => window.open(
                      `/evidence/${proofStatus.evidence_package.share_token}`,
                      '_blank',
                      'noopener,noreferrer'
                    )}
                    data-testid={`button-view-evidence-${shipmentId}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('viewEvidencePackage')}
                  </Button>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
