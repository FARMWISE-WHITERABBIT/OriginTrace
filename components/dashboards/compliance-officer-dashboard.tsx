'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useOrg } from '@/lib/contexts/org-context';
import {
  ShieldCheck,
  FileText,
  Clock,
  FileDown,
  ArrowRight,
  ClipboardCheck,
  Globe,
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface ComplianceStats {
  totalFarms: number;
  approvedFarms: number;
  pendingFarms: number;
  rejectedFarms: number;
  complianceRate: number;
  ddsExportCount: number;
  complianceFilesCount: number;
  recentActivity: Array<{
    id: string;
    farmer_name: string;
    compliance_status: string;
    updated_at: string;
  }>;
}

interface AuditScore {
  overall: number;
  grade: string;
  components: Record<string, { score: number; detail: string }>;
}

export function ComplianceOfficerDashboard() {
  const [stats, setStats] = useState<ComplianceStats>({
    totalFarms: 0,
    approvedFarms: 0,
    pendingFarms: 0,
    rejectedFarms: 0,
    complianceRate: 0,
    ddsExportCount: 0,
    complianceFilesCount: 0,
    recentActivity: [],
  });
  const [auditScore, setAuditScore] = useState<AuditScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();

  useEffect(() => {
    async function fetchStats() {
      if (!organization) return;

      try {
        const [dashRes, auditRes] = await Promise.all([
          fetch('/api/dashboard?role=compliance_officer'),
          fetch('/api/audit-readiness'),
        ]);
        if (dashRes.ok) setStats(await dashRes.json());
        if (auditRes.ok) setAuditScore(await auditRes.json());
      } catch (error) {
        console.error('Failed to fetch compliance stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [organization]);

  const statCards = [
    { title: 'Compliance Rate', value: `${stats.complianceRate}%`, icon: ShieldCheck, iconClass: 'icon-bg-green',  accent: 'card-accent-green' },
    { title: 'Pending Reviews', value: stats.pendingFarms,          icon: Clock,       iconClass: 'icon-bg-amber',  accent: 'card-accent-amber' },
    { title: 'DDS Exports',     value: stats.ddsExportCount,        icon: FileDown,    iconClass: 'icon-bg-blue',   accent: 'card-accent-blue' },
    { title: 'Documents',       value: stats.complianceFilesCount,  icon: FileText,    iconClass: 'icon-bg-violet', accent: 'card-accent-violet' },
  ];

  return (
    <div className="space-y-6" data-testid="compliance-officer-dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className={`transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${stat.accent}`} data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${stat.iconClass}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight" data-testid={`value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {isLoading ? '—' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Farm Compliance Overview
            </CardTitle>
            <CardDescription>Compliance status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600" data-testid="value-compliance-rate-large">
                {isLoading ? '...' : `${stats.complianceRate}%`}
              </div>
              <p className="text-sm text-muted-foreground">Farm Compliance Rate</p>
            </div>
            <Progress value={stats.complianceRate} className="h-2" />
            <div className="grid grid-cols-3 gap-4 pt-2" data-testid="compliance-breakdown">
              <div className="text-center p-3 rounded-md bg-muted/50">
                <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold" data-testid="value-approved">{isLoading ? '...' : stats.approvedFarms}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/50">
                <Clock className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                <p className="text-lg font-bold" data-testid="value-pending">{isLoading ? '...' : stats.pendingFarms}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/50">
                <AlertTriangle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold" data-testid="value-rejected">{isLoading ? '...' : stats.rejectedFarms}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
              Recent Compliance Activity
            </CardTitle>
            <CardDescription>Latest farm compliance updates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-activity">No recent compliance activity.</p>
            ) : (
              <div className="space-y-3" data-testid="recent-compliance-list">
                {stats.recentActivity.map((farm) => (
                  <div key={farm.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50" data-testid={`compliance-farm-${farm.id}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{farm.farmer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(farm.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                      farm.compliance_status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
                      farm.compliance_status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                    }`}>
                      {farm.compliance_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit Readiness Score */}
      <Card data-testid="audit-readiness-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Audit Readiness Score
          </CardTitle>
          <CardDescription>5-component readiness across traceability, lab coverage, and document health</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !auditScore ? (
            <p className="text-sm text-muted-foreground">Loading audit score…</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-bold w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                  auditScore.grade === 'A' ? 'border-green-500 text-green-700' :
                  auditScore.grade === 'B' ? 'border-blue-500 text-blue-700' :
                  auditScore.grade === 'C' ? 'border-amber-500 text-amber-700' :
                  'border-red-500 text-red-700'
                }`} data-testid="audit-grade">
                  {auditScore.grade}
                </div>
                <div>
                  <p className="text-3xl font-bold" data-testid="audit-overall">{auditScore.overall}<span className="text-lg font-normal text-muted-foreground">/100</span></p>
                  <p className="text-sm text-muted-foreground">Overall audit readiness</p>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(auditScore.components).map(([key, comp]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium">{comp.score}%</span>
                    </div>
                    <Progress value={comp.score} className="h-1.5" />
                  </div>
                ))}
              </div>
              <Link href="/app/analytics/reports">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <FileDown className="h-4 w-4 mr-2" />
                  Generate Audit Report
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common compliance tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/app/compliance">
            <Button variant="outline" data-testid="button-review-compliance">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Review Compliance
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/app/dds">
            <Button variant="outline" data-testid="button-dds-exports">
              <FileDown className="h-4 w-4 mr-2" />
              DDS Exports
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/app/pedigree">
            <Button variant="outline" data-testid="button-pedigree">
              <Globe className="h-4 w-4 mr-2" />
              Pedigree
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/app/data-vault">
            <Button variant="outline" data-testid="button-documents">
              <FolderOpen className="h-4 w-4 mr-2" />
              Documents
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
