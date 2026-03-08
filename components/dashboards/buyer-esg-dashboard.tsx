'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendLineChart } from '@/components/charts/trend-line-chart';
import { PieDonutChart } from '@/components/charts/pie-donut-chart';
import { HorizontalBarChart } from '@/components/charts/horizontal-bar-chart';
import {
  ShieldCheck,
  Package,
  AlertTriangle,
  FileCheck,
  Loader2,
  TrendingUp,
  Users,
  Award,
} from 'lucide-react';

interface SupplierRiskTiers {
  low: number;
  medium: number;
  high: number;
}

interface ComplianceTrendItem {
  month: string;
  score: number;
  count: number;
}

interface CommodityItem {
  name: string;
  volume: number;
  count: number;
}

interface DocumentHealth {
  valid: number;
  expiringSoon: number;
  expired: number;
  total: number;
}

interface CertificationItem {
  name: string;
  certifiedFarms: number;
  totalFarms: number;
  penetration: number;
}

interface SupplierItem {
  id: string;
  name: string;
  avgComplianceScore: number;
  contractCount: number;
  shipmentCount: number;
  totalVolumeMT: number;
  riskTier: 'low' | 'medium' | 'high';
}

interface ESGData {
  portfolioComplianceScore: number;
  avgReadinessScore: number;
  totalVolumeMT: number;
  supplierCount: number;
  supplierRiskTiers: SupplierRiskTiers;
  complianceTrend: ComplianceTrendItem[];
  commodityBreakdown: CommodityItem[];
  documentHealth: DocumentHealth;
  frameworkCoverage: Array<{ name: string; coverage: number; total: number; compliant: number }>;
  certificationCoverage: CertificationItem[];
  supplierComparison: SupplierItem[];
}

const RISK_COLORS: Record<string, string> = {
  low: '#2E7D6B',
  medium: '#D4A843',
  high: '#C75050',
};

const RISK_LABELS: Record<string, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

export function BuyerESGDashboard() {
  const [data, setData] = useState<ESGData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/buyer/analytics');
        if (!response.ok) throw new Error('Failed to fetch');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch ESG analytics:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="loading-esg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground" data-testid="text-esg-error">
          Unable to load ESG analytics. Please try again later.
        </p>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Portfolio Compliance',
      value: `${data.portfolioComplianceScore}%`,
      icon: ShieldCheck,
      description: 'Volume-weighted score',
      color: data.portfolioComplianceScore >= 80 ? 'text-green-600' : data.portfolioComplianceScore >= 50 ? 'text-yellow-600' : 'text-red-600',
    },
    {
      title: 'Total Sourced Volume',
      value: `${data.totalVolumeMT.toLocaleString()} MT`,
      icon: Package,
      description: `${data.supplierCount} active suppliers`,
    },
    {
      title: 'Supplier Risk Profile',
      value: `${data.supplierRiskTiers.high}`,
      icon: AlertTriangle,
      description: `${data.supplierRiskTiers.high} high / ${data.supplierRiskTiers.medium} medium / ${data.supplierRiskTiers.low} low`,
      color: data.supplierRiskTiers.high > 0 ? 'text-red-600' : 'text-green-600',
    },
    {
      title: 'Document Coverage',
      value: `${data.documentHealth.total > 0 ? Math.round((data.documentHealth.valid / data.documentHealth.total) * 100) : 0}%`,
      icon: FileCheck,
      description: `${data.documentHealth.valid} valid, ${data.documentHealth.expiringSoon} expiring, ${data.documentHealth.expired} expired`,
    },
  ];

  const riskPieData = [
    { name: 'Low Risk', value: data.supplierRiskTiers.low, color: RISK_COLORS.low },
    { name: 'Medium Risk', value: data.supplierRiskTiers.medium, color: RISK_COLORS.medium },
    { name: 'High Risk', value: data.supplierRiskTiers.high, color: RISK_COLORS.high },
  ].filter(d => d.value > 0);

  const docPieData = [
    { name: 'Valid', value: data.documentHealth.valid, color: '#2E7D6B' },
    { name: 'Expiring', value: data.documentHealth.expiringSoon, color: '#D4A843' },
    { name: 'Expired', value: data.documentHealth.expired, color: '#C75050' },
  ].filter(d => d.value > 0);

  const commodityPieData = data.commodityBreakdown.map((c, i) => ({
    name: c.name,
    value: c.volume,
  }));

  return (
    <div className="space-y-6" data-testid="esg-dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} data-testid={`stat-esg-${kpi.title.toLowerCase().replace(/\s/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.color || ''}`} data-testid={`text-esg-value-${kpi.title.toLowerCase().replace(/\s/g, '-')}`}>
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Compliance Trend (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-compliance-trend">
            {data.complianceTrend.some(t => t.count > 0) ? (
              <TrendLineChart
                data={data.complianceTrend as Array<Record<string, string | number>>}
                xKey="month"
                series={[{ dataKey: 'score', label: 'Avg Score', color: '#2E7D6B' }]}
                height={250}
                valueFormatter={(v) => `${v}%`}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No shipment data for trend analysis</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Supplier Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-supplier-risk">
            {riskPieData.length > 0 ? (
              <PieDonutChart
                data={riskPieData}
                donut
                height={250}
                showLabels
                showLegend
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No supplier risk data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commodity Breakdown</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-commodity-breakdown">
            {commodityPieData.length > 0 ? (
              <PieDonutChart
                data={commodityPieData}
                donut
                height={220}
                showLabels={false}
                showLegend
                labelFormatter={(name, value) => `${value.toLocaleString()} MT`}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No commodity data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Health</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-document-health">
            {docPieData.length > 0 ? (
              <PieDonutChart
                data={docPieData}
                donut
                height={220}
                showLabels={false}
                showLegend
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No document data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" />
              Certification Coverage
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-certification-coverage">
            {data.certificationCoverage.length > 0 ? (
              <div className="space-y-3">
                {data.certificationCoverage.map((cert) => (
                  <div key={cert.name}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm">{cert.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {cert.certifiedFarms}/{cert.totalFarms} farms ({cert.penetration}%)
                      </span>
                    </div>
                    <Progress value={cert.penetration} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No certification data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data.frameworkCoverage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Framework Coverage Rates</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-framework-coverage">
            <HorizontalBarChart
              data={data.frameworkCoverage.map(f => ({
                name: f.name.replace(/_/g, ' '),
                coverage: f.coverage,
              }))}
              dataKey="coverage"
              categoryKey="name"
              height={200}
              barLabel="Coverage %"
              valueFormatter={(v) => `${v}%`}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supplier Comparison</CardTitle>
        </CardHeader>
        <CardContent data-testid="table-supplier-comparison">
          {data.supplierComparison.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Supplier</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Compliance</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Risk</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Contracts</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Shipments</th>
                    <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Volume (MT)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.supplierComparison.map((supplier) => (
                    <tr key={supplier.id} className="border-b last:border-0" data-testid={`row-supplier-${supplier.id}`}>
                      <td className="py-2 pr-4 font-medium" data-testid={`text-supplier-name-${supplier.id}`}>
                        {supplier.name}
                      </td>
                      <td className="py-2 px-4 text-center" data-testid={`text-supplier-score-${supplier.id}`}>
                        <span className={
                          supplier.avgComplianceScore >= 80 ? 'text-green-600' :
                          supplier.avgComplianceScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }>
                          {supplier.avgComplianceScore}%
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <Badge
                          variant={supplier.riskTier === 'low' ? 'default' : supplier.riskTier === 'high' ? 'destructive' : 'secondary'}
                          data-testid={`badge-supplier-risk-${supplier.id}`}
                        >
                          {RISK_LABELS[supplier.riskTier]}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-center">{supplier.contractCount}</td>
                      <td className="py-2 px-4 text-center">{supplier.shipmentCount}</td>
                      <td className="py-2 pl-4 text-right">{supplier.totalVolumeMT.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-suppliers">
              No active suppliers to compare.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
