'use client';

import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, 
  Map, 
  Package, 
  ClipboardCheck, 
  Search, 
  FileText,
  Smartphone,
  Wifi,
  WifiOff,
  Camera,
  CheckCircle2,
  ArrowRight,
  Shield,
  UserCheck,
  User
} from 'lucide-react';

export default function GuidePage() {
  const { profile } = useOrg();
  const role = profile?.role || 'agent';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Getting Started Guide</h1>
        <p className="text-muted-foreground">
          Learn how to use OriginTrace for agricultural traceability
        </p>
      </div>

      <Tabs defaultValue={role} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="admin" data-testid="tab-admin-guide">
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </TabsTrigger>
          <TabsTrigger value="aggregator" data-testid="tab-aggregator-guide">
            <UserCheck className="h-4 w-4 mr-2" />
            Aggregator
          </TabsTrigger>
          <TabsTrigger value="agent" data-testid="tab-agent-guide">
            <User className="h-4 w-4 mr-2" />
            Field Agent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-primary">Admin Setup</Badge>
                Quick Start Guide
              </CardTitle>
              <CardDescription>
                Follow these steps to set up your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Step number={1} title="Add Your Team" icon={UserPlus}>
                  <p>Go to <strong>Team</strong> in the sidebar to invite your team members:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li><strong>Aggregators</strong> - Manage field agents and oversee collections</li>
                    <li><strong>Field Agents</strong> - Register farms and collect produce in the field</li>
                    <li><strong>Admins</strong> - Full access to all features</li>
                  </ul>
                </Step>

                <Step number={2} title="Generate Bag IDs" icon={Package}>
                  <p>Go to <strong>Bags</strong> to generate unique bag serial numbers:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Click "Generate Batch" to create up to 100 bag IDs at once</li>
                    <li>Print QR codes or labels for physical bags</li>
                    <li>Bags track produce from farm to warehouse</li>
                  </ul>
                </Step>

                <Step number={3} title="Review Farm Compliance" icon={ClipboardCheck}>
                  <p>When field agents register farms, review them in <strong>Compliance</strong>:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Verify farm boundaries are correctly mapped</li>
                    <li>Check legality documents if uploaded</li>
                    <li>Approve farms to allow collections</li>
                  </ul>
                </Step>

                <Step number={4} title="Track Collections" icon={Search}>
                  <p>Use <strong>Traceability</strong> to search for any bag:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Enter bag serial to see its full journey</li>
                    <li>View farm origin, collection date, and agent</li>
                    <li>Track status from collection to processing</li>
                  </ul>
                </Step>

                <Step number={5} title="Export for Compliance" icon={FileText}>
                  <p>Generate Due Diligence Statements in <strong>DDS Export</strong>:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Export approved farm boundaries as GeoJSON</li>
                    <li>Use for EU TRACES compliance reporting</li>
                    <li>Include collection and traceability data</li>
                  </ul>
                </Step>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aggregator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-blue-500">Aggregator</Badge>
                Quick Start Guide
              </CardTitle>
              <CardDescription>
                Manage your field agents and oversee collections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Step number={1} title="Add Field Agents" icon={UserPlus}>
                  <p>Go to <strong>Team</strong> to create accounts for your field agents:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Enter their name and email</li>
                    <li>Set a temporary password (share it with them)</li>
                    <li>Agents can log in from any device</li>
                  </ul>
                </Step>

                <Step number={2} title="Monitor Agent Activity" icon={Search}>
                  <p>Track your team's work in <strong>Traceability</strong>:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Search for collections by bag serial</li>
                    <li>View which agent made each collection</li>
                    <li>Check collection weights and grades</li>
                  </ul>
                </Step>

                <Step number={3} title="Brief Your Agents" icon={Smartphone}>
                  <p>Make sure your field agents know how to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Log in to their OriginTrace account</li>
                    <li>Map farms using GPS on their phone</li>
                    <li>Collect produce and scan bag IDs</li>
                    <li>Work offline when there's no internet</li>
                  </ul>
                </Step>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-green-600">Field Agent</Badge>
                Quick Start Guide
              </CardTitle>
              <CardDescription>
                Register farms and collect produce in the field
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Step number={1} title="Register a New Farm" icon={Map}>
                  <p>Go to <strong>Map Farm</strong> to register a farmer:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Use <strong>Scan ID</strong> to auto-fill farmer details from their ID card</li>
                    <li>Enter farmer name and community</li>
                    <li>Walk around the farm boundary, tapping "Add Point" at each corner</li>
                    <li>Submit for compliance review</li>
                  </ul>
                </Step>

                <Step number={2} title="Collect Produce" icon={Package}>
                  <p>Go to <strong>Collect</strong> to record bag collections:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Select the farm you're collecting from</li>
                    <li>Scan or enter bag serial numbers</li>
                    <li>Record weight and quality grade for each bag</li>
                    <li>Complete the batch when done</li>
                  </ul>
                </Step>

                <Step number={3} title="Working Offline" icon={WifiOff}>
                  <p>OriginTrace works even without internet:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Collections are saved to your phone</li>
                    <li>Look for "Syncing..." status on your dashboard</li>
                    <li>Data uploads automatically when you're back online</li>
                    <li>Never lose data due to poor connection</li>
                  </ul>
                </Step>

                <Step number={4} title="Install as App" icon={Smartphone}>
                  <p>Add OriginTrace to your phone home screen:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li><strong>Android:</strong> Tap menu → "Add to Home Screen"</li>
                    <li><strong>iPhone:</strong> Tap share → "Add to Home Screen"</li>
                    <li>Works like a native app, even offline</li>
                  </ul>
                </Step>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contact your organization administrator if you need assistance or have questions about using OriginTrace.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ 
  number, 
  title, 
  icon: Icon, 
  children 
}: { 
  number: number; 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
