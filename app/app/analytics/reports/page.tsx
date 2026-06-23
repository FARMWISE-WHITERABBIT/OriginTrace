'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, Ship, Users, ShieldCheck, BarChart3, Printer, Lock, ChevronRight, Download, FlaskConical } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  PieDonutChart,
  VerticalBarChart,
  HorizontalBarChart,
  RadarSpiderChart,
  TrendLineChart,
} from '@/components/charts';

type ReportType = 'shipment_dds' | 'supplier_audit' | 'regulatory_readiness' | 'buyer_intelligence' | 'period_performance' | 'compliance_audit';
type Period = '7d' | '30d' | '90d' | '1y';

const REPORT_TYPES: Array<{
  id: ReportType;
  title: string;
  description: string;
  icon: typeof FileText;
  minTier: 'basic' | 'pro' | 'enterprise';
}> = [
  { id: 'period_performance', title: 'Period Performance Report', description: 'Monthly or quarterly trend data across all dimensions — volumes, compliance, financials, traceability.', icon: BarChart3, minTier: 'basic' },
  { id: 'shipment_dds', title: 'Shipment Due Diligence Report', description: 'Per-shipment readiness score breakdown, farm data, lab results, and framework compliance status.', icon: Ship, minTier: 'pro' },
  { id: 'supplier_audit', title: 'Supplier Audit Report', description: 'Aggregated KYC status, GPS verification rate, and volume history across all farms.', icon: Users, minTier: 'pro' },
  { id: 'regulatory_readiness', title: 'Regulatory Readiness Summary', description: 'Portfolio-level compliance rate against each of the five regulatory frameworks.', icon: ShieldCheck, minTier: 'pro' },
  { id: 'buyer_intelligence', title: 'Buyer Intelligence Report', description: 'Verified provenance statistics, risk flags, and ESG metrics across sourced shipments.', icon: FileText, minTier: 'enterprise' },
  { id: 'compliance_audit', title: 'Compliance Audit Report', description: 'Full audit readiness score, lab results coverage, farm data completeness, and exportable PDF for border submissions.', icon: ShieldCheck, minTier: 'pro' },
];

const TIER_LEVELS: Record<string, number> = { starter: 0, basic: 1, pro: 2, enterprise: 3 };

export default function ReportBuilderPage() {
  const { organization, profile } = useOrg();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [auditScore, setAuditScore] = useState<any>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const currentTier = (organization as any)?.subscription_tier || 'starter';
  const currentTierLevel = TIER_LEVELS[currentTier] ?? 0;

  const downloadAuditPdf = useCallback(async () => {
    if (!organization) return;
    setIsDownloadingPdf(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365) * 86400000).toISOString().split('T')[0];
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: 'compliance_audit', startDate, endDate }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const { base64, fileName } = await res.json();
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${base64}`;
      link.download = fileName;
      link.click();
    } catch (e) {
      console.error('PDF download error:', e);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [organization, period]);

  const generateReport = useCallback(async () => {
    if (!selectedReport) return;
    setIsLoading(true);
    try {
      if (selectedReport === 'compliance_audit') {
        const [scoreRes, analyticsRes] = await Promise.all([
          fetch('/api/audit-readiness'),
          fetch(`/api/reports?type=period_performance&period=${period}`),
        ]);
        const scoreData = scoreRes.ok ? await scoreRes.json() : null;
        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;
        setAuditScore(scoreData);
        setData(analyticsData);
      } else {
        const res = await fetch(`/api/reports?type=${selectedReport}&period=${period}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedReport, period]);

  useEffect(() => {
    if (selectedReport) {
      generateReport();
    }
  }, [generateReport, selectedReport]);

  if (!selectedReport) {
    return (
      <div className="space-y-6" data-testid="report-builder-page">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-reports-title">Report Builder</h1>
          <p className="text-sm text-muted-foreground">Generate structured reports for regulatory submission, buyer presentation, and internal review.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map((report) => {
            const isLocked = currentTierLevel < TIER_LEVELS[report.minTier];
            const Icon = report.icon;
            return (
              <Card
                key={report.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isLocked ? 'opacity-60' : 'hover:border-[#2E7D6B]'}`}
                onClick={() => !isLocked && setSelectedReport(report.id)}
                data-testid={`card-report-${report.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-[#2E7D6B]/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[#2E7D6B]" />
                    </div>
                    {isLocked ? (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        {report.minTier}
                      </Badge>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle className="text-base mt-3">{report.title}</CardTitle>
                  <CardDescription className="text-xs">{report.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const reportConfig = REPORT_TYPES.find(r => r.id === selectedReport)!;

  return (
    <div className="space-y-6 print:space-y-4" data-testid="report-preview-page">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)} data-testid="button-back-reports">
            ← Back
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{reportConfig.title}</h1>
            <p className="text-sm text-muted-foreground">{reportConfig.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[130px]" data-testid="select-report-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          {selectedReport === 'compliance_audit' && (
            <Button variant="outline" size="sm" onClick={downloadAuditPdf} disabled={isDownloadingPdf} data-testid="button-download-audit-pdf">
              {isDownloadingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download PDF
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print-report">
            <Printer className="h-4 w-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div>
            <h1 className="text-lg font-bold text-[#1F5F52]">OriginTrace</h1>
            <h2 className="text-base font-semibold">{reportConfig.title}</h2>
            <p className="text-xs text-muted-foreground">Period: {period} | Generated: {new Date().toLocaleDateString()} | Organization: {(organization as any)?.name || ''}</p>
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center min-h-[300px]" data-testid="report-loading">
          <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-16 bg-muted animate-pulse rounded-xl"/>)}</div>
        </div>
      ) : (
        <ReportContent type={selectedReport} data={data} period={period} auditScore={auditScore} />
      )}

      <style jsx global>{`
        @media print {
          nav, header, aside, .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .recharts-responsive-container { page-break-inside: avoid; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}

function ReportContent({ type, data, period, auditScore }: { type: ReportType; data: any; period: string; auditScore?: any }) {
  switch (type) {
    case 'period_performance':
      return <PeriodPerformanceReport data={data} period={period} />;
    case 'shipment_dds':
      return <ShipmentDDSReport data={data} />;
    case 'supplier_audit':
      return <SupplierAuditReport data={data} />;
    case 'regulatory_readiness':
      return <RegulatoryReadinessReport data={data} />;
    case 'buyer_intelligence':
      return <BuyerIntelligenceReport data={data} />;
    case 'compliance_audit':
      return <ComplianceAuditReport data={data} auditScore={auditScore} />;
    default:
      return null;
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 mt-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#1F5F52]">{children}</h3>
      <Separator className="mt-1" />
    </div>
  );
}

function DataRow({ label, value, testId }: { label: string; value: string | number; testId: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm" data-testid={testId}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PeriodPerformanceReport({ data, period }: { data: any; period: string }) {
  return (
    <div className="space-y-6" data-testid="report-period-performance">
      <SectionTitle>Executive Summary</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Collection Volume</p>
            <p className="text-xl font-bold">{(data.weightSummary?.current || 0).toLocaleString()} kg</p>
            <TrendBadge value={data.weightSummary?.trend} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Batches</p>
            <p className="text-xl font-bold">{data.batchSummary?.current || 0}</p>
            <TrendBadge value={data.batchSummary?.trend} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Farm Compliance</p>
            <p className="text-xl font-bold">{data.compliance?.farmRate || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Payments</p>
            <p className="text-xl font-bold">${(data.paymentSummary?.total || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <SectionTitle>Volume Trends</SectionTitle>
      <Card>
        <CardContent className="pt-4">
          <TrendLineChart
            data={(data.volumeTrends || []).map((v: any) => ({ date: v.date, value: v.weight }))}
            xKey="date"
            series={[{ dataKey: 'value', label: 'Weight (kg)', color: '#2E7D6B' }]}
            height={250}
          />
        </CardContent>
      </Card>

      <SectionTitle>Commodity Breakdown</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Volume by Commodity</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data.commodityBreakdown || []).filter((c: any) => c.weight > 0).map((c: any) => ({ name: c.name, value: c.weight }))}
              donut height={240}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance by Commodity</CardTitle></CardHeader>
          <CardContent>
            <VerticalBarChart
              data={(data.commodityBreakdown || []).filter((c: any) => c.totalFarms > 0).map((c: any) => ({ name: c.name, value: c.complianceRate }))}
              dataKey="value"
              categoryKey="name"
              height={240} valueFormatter={(v) => `${v}%`}
            />
          </CardContent>
        </Card>
      </div>

      <SectionTitle>Compliance Overview</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Farm Status</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data.farmComplianceBreakdown || []).map((f: any) => ({
                name: f.status, value: f.count,
                color: f.status === 'Approved' ? '#2E7D6B' : f.status === 'Pending' ? '#F59E0B' : f.status === 'Rejected' ? '#EF4444' : '#9CA3AF',
              }))}
              donut height={240}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Key Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <DataRow label="Farm Compliance Rate" value={`${data.compliance?.farmRate || 0}%`} testId="row-farm-rate" />
            <DataRow label="Batch Compliance Rate" value={`${data.compliance?.batchRate || 0}%`} testId="row-batch-rate" />
            <DataRow label="Bag Compliance Rate" value={`${data.compliance?.bagRate || 0}%`} testId="row-bag-rate" />
            <DataRow label="Flagged Batches" value={data.compliance?.flaggedBatches || 0} testId="row-flagged" />
            <DataRow label="Total Farms" value={data.farmSummary?.total || 0} testId="row-farms" />
            <DataRow label="Verified Hectares" value={`${(data.supplyChainNodes?.totalHectares || 0).toLocaleString()}`} testId="row-hectares" />
          </CardContent>
        </Card>
      </div>

      <SectionTitle>Financial Summary</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payments by Status</CardTitle></CardHeader>
          <CardContent>
            <VerticalBarChart
              data={(data.paymentsByStatus || []).map((p: any) => ({ name: p.status, value: p.amount }))}
              dataKey="value"
              categoryKey="name"
              height={200} valueFormatter={(v) => `₦${v.toLocaleString()}`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data.paymentsByMethod || []).map((p: any) => ({ name: p.method, value: p.amount }))}
              donut height={200}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ShipmentDDSReport({ data }: { data: any }) {
  const shipments = data.shipmentScores || [];
  return (
    <div className="space-y-6" data-testid="report-shipment-dds">
      <SectionTitle>Shipment Due Diligence Overview</SectionTitle>
      {shipments.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No shipments with readiness scores available.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Readiness Score Comparison</CardTitle></CardHeader>
            <CardContent>
              <HorizontalBarChart
                data={shipments.slice(0, 10).map((s: any) => ({ name: s.name, value: s.overall }))}
                dataKey="value"
                categoryKey="name"
                height={Math.max(200, shipments.slice(0, 10).length * 40)}
                valueFormatter={(v) => `${v}/100`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Score Dimensions (Top 3 Shipments)</CardTitle></CardHeader>
            <CardContent>
              <RadarSpiderChart
                data={[
                  { dimension: 'Traceability', ...Object.fromEntries(shipments.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.traceability])) },
                  { dimension: 'Contamination', ...Object.fromEntries(shipments.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.contamination])) },
                  { dimension: 'Documentation', ...Object.fromEntries(shipments.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.documentation])) },
                  { dimension: 'Regulatory', ...Object.fromEntries(shipments.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.regulatory])) },
                  { dimension: 'Storage', ...Object.fromEntries(shipments.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.storage])) },
                ]}
                angleKey="dimension"
                series={shipments.slice(0, 3).map((s: any, i: number) => ({ dataKey: `s${i}`, label: s.name }))}
                height={300}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Decision Distribution</CardTitle></CardHeader>
            <CardContent>
              <PieDonutChart
                data={(data.shipmentDecisions || []).map((d: any) => ({
                  name: d.decision, value: d.count,
                  color: d.decision === 'Go' ? '#2E7D6B' : d.decision === 'Conditional' ? '#F59E0B' : d.decision === 'No Go' ? '#EF4444' : '#9CA3AF',
                }))}
                donut height={240}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SupplierAuditReport({ data }: { data: any }) {
  return (
    <div className="space-y-6" data-testid="report-supplier-audit">
      <SectionTitle>Supplier Network Overview</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Farms</p><p className="text-xl font-bold">{data.supplyChainNodes?.totalFarms || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">GPS Verified</p><p className="text-xl font-bold">{data.supplyChainNodes?.verifiedFarms || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Verification Rate</p><p className="text-xl font-bold">{data.supplyChainNodes?.totalFarms ? Math.round((data.supplyChainNodes.verifiedFarms / data.supplyChainNodes.totalFarms) * 100) : 0}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Hectares</p><p className="text-xl font-bold">{(data.supplyChainNodes?.totalHectares || 0).toLocaleString()}</p></CardContent></Card>
      </div>

      <SectionTitle>Compliance Status</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Farm Compliance</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data.farmComplianceBreakdown || []).map((f: any) => ({
                name: f.status, value: f.count,
                color: f.status === 'Approved' ? '#2E7D6B' : f.status === 'Pending' ? '#F59E0B' : f.status === 'Rejected' ? '#EF4444' : '#9CA3AF',
              }))}
              donut height={240}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Deforestation Risk</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data.deforestationRisk || []).map((d: any) => ({
                name: d.level, value: d.count,
                color: d.level === 'None Detected' ? '#2E7D6B' : d.level === 'Low' ? '#6FB8A8' : d.level === 'Medium' ? '#F59E0B' : '#EF4444',
              }))}
              donut height={240}
            />
          </CardContent>
        </Card>
      </div>

      <SectionTitle>Agent Performance</SectionTitle>
      <Card>
        <CardContent className="pt-4">
          <HorizontalBarChart
            data={(data.agentPerformance || []).slice(0, 10).map((a: any) => ({ name: a.name, value: a.weight }))}
            dataKey="value"
            categoryKey="name"
            height={Math.max(200, (data.agentPerformance || []).slice(0, 10).length * 40)}
            valueFormatter={(v) => `${v.toLocaleString()} kg`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RegulatoryReadinessReport({ data }: { data: any }) {
  const frameworks = [
    { name: 'EUDR', description: 'EU Deforestation Regulation' },
    { name: 'FSMA 204', description: 'US Food Safety Modernization Act' },
    { name: 'UK Environment Act', description: 'UK Due Diligence' },
    { name: 'Lacey Act / UFLPA', description: 'US Supply Chain Transparency' },
    { name: 'Buyer Standards', description: 'Custom Buyer Requirements' },
  ];

  const farmRate = data.compliance?.farmRate || 0;
  const gpsRate = data.supplyChainNodes?.totalFarms ? Math.round((data.supplyChainNodes.verifiedFarms / data.supplyChainNodes.totalFarms) * 100) : 0;
  const defoRisk = (data.deforestationRisk || []).find((d: any) => d.level === 'None Detected');
  const defoRate = data.farmSummary?.total ? Math.round(((defoRisk?.count || 0) / data.farmSummary.total) * 100) : 0;
  const docValid = (data.documentHealth || []).find((d: any) => d.status === 'Valid');
  const totalDocs = (data.documentHealth || []).reduce((s: number, d: any) => s + d.count, 0);
  const docRate = totalDocs > 0 ? Math.round(((docValid?.count || 0) / totalDocs) * 100) : 0;

  const frameworkScores = [
    { name: 'EUDR', score: Math.round((gpsRate * 0.3 + defoRate * 0.4 + docRate * 0.3)) },
    { name: 'FSMA 204', score: Math.round((farmRate * 0.3 + docRate * 0.4 + data.compliance?.batchRate * 0.3) || 0) },
    { name: 'UK Env Act', score: Math.round((gpsRate * 0.3 + farmRate * 0.3 + docRate * 0.4)) },
    { name: 'Lacey/UFLPA', score: Math.round((gpsRate * 0.4 + farmRate * 0.3 + docRate * 0.3)) },
    { name: 'Buyer Std', score: Math.round((farmRate * 0.25 + docRate * 0.25 + data.compliance?.batchRate * 0.25 + gpsRate * 0.25) || 0) },
  ];

  return (
    <div className="space-y-6" data-testid="report-regulatory-readiness">
      <SectionTitle>Regulatory Readiness Summary</SectionTitle>
      <Card>
        <CardContent className="pt-4">
          <VerticalBarChart
            data={frameworkScores.map(f => ({ name: f.name, value: f.score }))}
            dataKey="value"
            categoryKey="name"
            height={280}
            valueFormatter={(v) => `${v}%`}
            colors={frameworkScores.map(f => f.score >= 75 ? '#2E7D6B' : f.score >= 50 ? '#F59E0B' : '#EF4444')}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {frameworks.map((fw, i) => (
          <Card key={fw.name} data-testid={`card-framework-${i}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fw.name}</CardTitle>
              <CardDescription className="text-xs">{fw.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{frameworkScores[i]?.score || 0}%</span>
                <Badge className={frameworkScores[i]?.score >= 75 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : frameworkScores[i]?.score >= 50 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                  {frameworkScores[i]?.score >= 75 ? 'Ready' : frameworkScores[i]?.score >= 50 ? 'Partial' : 'Gaps'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle>Supporting Metrics</SectionTitle>
      <Card>
        <CardContent className="pt-4 space-y-2">
          <DataRow label="GPS Verification Rate" value={`${gpsRate}%`} testId="row-gps-rate" />
          <DataRow label="Deforestation-Free Rate" value={`${defoRate}%`} testId="row-defo-rate" />
          <DataRow label="Document Validity Rate" value={`${docRate}%`} testId="row-doc-rate" />
          <DataRow label="Farm Compliance Rate" value={`${farmRate}%`} testId="row-farm-rate-reg" />
          <DataRow label="Batch Compliance Rate" value={`${data.compliance?.batchRate || 0}%`} testId="row-batch-rate-reg" />
        </CardContent>
      </Card>
    </div>
  );
}

function BuyerIntelligenceReport({ data }: { data: any }) {
  return (
    <div className="space-y-6" data-testid="report-buyer-intelligence">
      <SectionTitle>Provenance & Verification Summary</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Verified Farms</p><p className="text-xl font-bold">{data.supplyChainNodes?.verifiedFarms || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Hectares</p><p className="text-xl font-bold">{(data.supplyChainNodes?.totalHectares || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Commodities Sourced</p><p className="text-xl font-bold">{data.commodityBreakdown?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Farm Compliance</p><p className="text-xl font-bold">{data.compliance?.farmRate || 0}%</p></CardContent></Card>
      </div>

      <SectionTitle>ESG & Risk Metrics</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Deforestation Risk Profile</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data.deforestationRisk || []).map((d: any) => ({
                name: d.level, value: d.count,
                color: d.level === 'None Detected' ? '#2E7D6B' : d.level === 'Low' ? '#6FB8A8' : d.level === 'Medium' ? '#F59E0B' : '#EF4444',
              }))}
              donut height={240}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Commodity Mix</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data.commodityBreakdown || []).filter((c: any) => c.weight > 0).map((c: any) => ({ name: c.name, value: c.weight }))}
              donut height={240}
            />
          </CardContent>
        </Card>
      </div>

      <SectionTitle>Shipment Intelligence</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Shipment Destinations</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data.shipmentsByDestination || []).map((s: any) => ({ name: s.country, value: s.count }))}
              height={240}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Flag Categories</CardTitle></CardHeader>
          <CardContent>
            {(data.shipmentRiskFlags || []).length > 0 ? (
              <HorizontalBarChart
                data={(data.shipmentRiskFlags || []).map((r: any) => ({ name: r.category, value: r.count }))}
                dataKey="value"
                categoryKey="name"
                height={200}
                colors={['#EF4444', '#F59E0B', '#F97316', '#DC2626']}
              />
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="font-medium text-sm">No risk flags recorded</p>
              <p className="text-xs text-muted-foreground mt-0.5">All compliance checks are passing for this period.</p>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-orange-100 text-orange-800',
  F: 'bg-red-100 text-red-800',
};

const SCORE_COMPONENTS = [
  { key: 'farmDataCompleteness', label: 'Farm Data Completeness', weight: 25 },
  { key: 'batchRecordQuality', label: 'Batch Record Quality', weight: 20 },
  { key: 'labTestCoverage', label: 'Lab Test Coverage', weight: 20 },
  { key: 'documentHealth', label: 'Document Health', weight: 20 },
  { key: 'cleanShipmentRate', label: 'Clean Shipment Rate', weight: 15 },
];

function ComplianceAuditReport({ data, auditScore }: { data: any; auditScore: any }) {
  const grade = auditScore?.grade || '—';
  const overall = auditScore?.overallScore || 0;
  const components = auditScore?.components || {};

  return (
    <div className="space-y-6" data-testid="report-compliance-audit">
      <SectionTitle>Audit Readiness Score</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 flex flex-col items-center justify-center py-6">
          <div className={`h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold mb-2 ${GRADE_COLOR[grade] || 'bg-muted'}`}>
            {grade}
          </div>
          <p className="text-2xl font-bold">{overall}/100</p>
          <p className="text-xs text-muted-foreground mt-1">Overall Readiness Score</p>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="pt-4 space-y-3">
            {SCORE_COMPONENTS.map(({ key, label, weight }) => {
              const val = components[key] ?? 0;
              const scaled = Math.round(val * weight / 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span className="text-muted-foreground">{val}% <span className="text-xs">(×{weight}% = {scaled}pts)</span></span>
                  </div>
                  <Progress value={val} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <SectionTitle>Lab Results Coverage</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Batches</p><p className="text-xl font-bold">{data?.batchSummary?.current || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Compliance Rate</p><p className="text-xl font-bold">{data?.compliance?.batchRate || 0}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Flagged Batches</p><p className="text-xl font-bold">{data?.compliance?.flaggedBatches || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Verified Farms</p><p className="text-xl font-bold">{data?.supplyChainNodes?.verifiedFarms || 0}</p></CardContent></Card>
      </div>

      <SectionTitle>Compliance Posture</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Farm Compliance</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data?.farmComplianceBreakdown || []).map((f: any) => ({
                name: f.status, value: f.count,
                color: f.status === 'Approved' ? '#2E7D6B' : f.status === 'Pending' ? '#F59E0B' : f.status === 'Rejected' ? '#EF4444' : '#9CA3AF',
              }))}
              donut height={220}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Deforestation Risk</CardTitle></CardHeader>
          <CardContent>
            <PieDonutChart
              data={(data?.deforestationRisk || []).map((d: any) => ({
                name: d.level, value: d.count,
                color: d.level === 'None Detected' ? '#2E7D6B' : d.level === 'Low' ? '#6FB8A8' : d.level === 'Medium' ? '#F59E0B' : '#EF4444',
              }))}
              donut height={220}
            />
          </CardContent>
        </Card>
      </div>

      <SectionTitle>Shipment & Document Health</SectionTitle>
      <Card>
        <CardContent className="pt-4 space-y-2">
          <DataRow label="Total Shipments" value={data?.shipmentsByDestination?.reduce((s: number, d: any) => s + d.count, 0) || 0} testId="row-total-shipments" />
          <DataRow label="Farm Compliance Rate" value={`${data?.compliance?.farmRate || 0}%`} testId="row-farm-rate-audit" />
          <DataRow label="Batch Compliance Rate" value={`${data?.compliance?.batchRate || 0}%`} testId="row-batch-rate-audit" />
          <DataRow label="GPS Verified Farms" value={data?.supplyChainNodes?.verifiedFarms || 0} testId="row-gps-verified" />
          <DataRow label="Total Hectares Mapped" value={(data?.supplyChainNodes?.totalHectares || 0).toLocaleString()} testId="row-hectares-audit" />
        </CardContent>
      </Card>
    </div>
  );
}

function TrendBadge({ value }: { value?: number }) {
  if (value === undefined || value === null) return null;
  return (
    <span className={`text-xs font-medium ${value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {value > 0 ? '+' : ''}{value}% vs prior period
    </span>
  );
}
