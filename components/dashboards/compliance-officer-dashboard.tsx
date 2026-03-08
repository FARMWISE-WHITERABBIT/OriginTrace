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
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();

  useEffect(() => {
    async function fetchStats() {
      if (!organization) return;

      try {
        const res = await fetch('/api/dashboard?role=compliance_officer');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch compliance stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [organization]);

  const statCards = [
    { title: 'Compliance Rate', value: `${stats.complianceRate}%`, icon: ShieldCheck, color: 'text-green-600' },
    { title: 'Pending Reviews', value: stats.pendingFarms, icon: Clock, color: 'text-orange-600' },
    { title: 'DDS Exports', value: stats.ddsExportCount, icon: FileDown, color: 'text-blue-600' },
    { title: 'Documents', value: stats.complianceFilesCount, icon: FileText, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6" data-testid="compliance-officer-dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {isLoading ? '...' : stat.value}
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
