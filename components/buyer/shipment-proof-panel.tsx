'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FlaskConical,
  FileText,
  Package,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

interface ProofStatus {
  shipment_id: string;
  shipment_code: string;
  overall_verification_status: 'verified' | 'pending' | 'incomplete';
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

function StatusIcon({ ok, loading }: { ok: boolean | null; loading?: boolean }) {
  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (ok === null) return <Clock className="h-4 w-4 text-muted-foreground" />;
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
    : <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
}

const overallBadge = {
  verified: { label: 'Verified', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  incomplete: { label: 'Incomplete', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
} as const;

interface ShipmentProofPanelProps {
  shipmentId: string;
}

export function ShipmentProofPanel({ shipmentId }: ShipmentProofPanelProps) {
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
        const res = await fetch(`/api/buyer/shipments/${shipmentId}/proof-status`);
        if (!res.ok) throw new Error('Failed to load proof status');
        const data = await res.json();
        setProofStatus(data);
      } catch {
        setError('Could not load proof status. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProof();
  }, [isOpen, shipmentId, proofStatus]);

  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        data-testid={`button-proof-panel-toggle-${shipmentId}`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Compliance Proof</span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading proof status...</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {proofStatus && (
            <>
              {/* Overall status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Verification Status
                </span>
                <Badge className={overallBadge[proofStatus.overall_verification_status].className} data-testid={`badge-verification-status-${shipmentId}`}>
                  {overallBadge[proofStatus.overall_verification_status].label}
                </Badge>
              </div>

              {/* Checklist */}
              <Card>
                <CardContent className="py-3 px-4 space-y-2.5">
                  {/* Shipment Readiness */}
                  <div className="flex items-center justify-between gap-2" data-testid={`row-readiness-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">Shipment Readiness</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {proofStatus.readiness.score !== null && (
                        <span className={`text-xs font-medium ${
                          proofStatus.readiness.ok
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {proofStatus.readiness.score}%
                        </span>
                      )}
                      <StatusIcon ok={proofStatus.readiness.ok} />
                    </div>
                  </div>

                  {/* Lab Results */}
                  <div className="flex items-center justify-between gap-2" data-testid={`row-lab-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">Lab Results</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {proofStatus.lab_results.total > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {proofStatus.lab_results.passed}/{proofStatus.lab_results.total} passed
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No tests</span>
                      )}
                      <StatusIcon ok={proofStatus.lab_results.total > 0 ? proofStatus.lab_results.ok : null} />
                    </div>
                  </div>

                  {/* Evidence Package */}
                  <div className="flex items-center justify-between gap-2" data-testid={`row-evidence-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">Evidence Package</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {proofStatus.evidence_package.generated ? (
                        proofStatus.evidence_package.expired ? (
                          <span className="text-xs text-red-500">Expired</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Available</span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">Not generated</span>
                      )}
                      <StatusIcon ok={proofStatus.evidence_package.generated ? proofStatus.evidence_package.ok : null} />
                    </div>
                  </div>

                  {/* Document Health */}
                  <div className="flex items-center justify-between gap-2" data-testid={`row-documents-${shipmentId}`}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">Document Health</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {proofStatus.documents.total > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {proofStatus.documents.active}/{proofStatus.documents.total} active
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No docs</span>
                      )}
                      <StatusIcon ok={proofStatus.documents.total > 0 ? proofStatus.documents.ok : null} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* View Evidence button */}
              {proofStatus.evidence_package.generated && !proofStatus.evidence_package.expired && proofStatus.evidence_package.share_token && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => window.open(`/evidence/${proofStatus.evidence_package.share_token}`, '_blank')}
                  data-testid={`button-view-evidence-${shipmentId}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Evidence Package
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
