'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, Circle, ArrowRight, UserPlus, Map, Package,
  Factory, Ship, FileText, Users, BarChart3, Shield,
  Fingerprint, ChevronDown, ChevronRight,
} from 'lucide-react';

const CHECKLIST = [
  { id: 'register_farmer', title: 'Register your first farmer', description: 'Capture farmer identity, GPS farm boundary, and informed consent. Required for EUDR and Rainforest Alliance compliance.', href: '/app/farmers/new', cta: 'Register Farmer', icon: UserPlus, roles: ['admin','aggregator','agent'] },
  { id: 'map_farm', title: 'Map a farm boundary', description: 'Draw GPS polygon boundaries on the satellite map. Required for deforestation-free declarations and EUDR due diligence.', href: '/app/farms/map', cta: 'Map Farm', icon: Map, roles: ['admin','aggregator','agent'] },
  { id: 'collect_batch', title: 'Record a collection batch', description: 'Use Smart Collect to log bags from farmers. Works offline and syncs when back online.', href: '/app/collect', cta: 'Start Collection', icon: Package, roles: ['admin','aggregator','agent'] },
  { id: 'create_processing_run', title: 'Log a processing run', description: 'Record input/output weights and facility. Mass balance is computed automatically.', href: '/app/processing', cta: 'Create Processing Run', icon: Factory, roles: ['admin','compliance_officer'] },
  { id: 'create_finished_good', title: 'Create a finished good record', description: 'Assign a pedigree code to export-ready product. Links the processing run to your shipment.', href: '/app/pedigree', cta: 'Create Finished Good', icon: FileText, roles: ['admin','compliance_officer'] },
  { id: 'generate_dpp', title: 'Generate a Digital Product Passport', description: 'Issue a DPP with chain of custody and certifications. Shareable via public link.', href: '/app/dpp', cta: 'Generate DPP', icon: Fingerprint, roles: ['admin','compliance_officer'] },
  { id: 'create_shipment', title: 'Run a shipment readiness check', description: '5-dimension compliance score (GO / CONDITIONAL / NO-GO) before booking a vessel.', href: '/app/shipments', cta: 'Create Shipment', icon: Ship, roles: ['admin','logistics_coordinator','compliance_officer'] },
  { id: 'upload_document', title: 'Upload an export document', description: 'Attach phytosanitary certs, GACC registrations, MRL lab results, and other docs.', href: '/app/documents', cta: 'Upload Document', icon: FileText, roles: ['admin','compliance_officer','logistics_coordinator'] },
  { id: 'invite_agent', title: 'Add a field agent', description: 'Invite field agents to collect produce and register farmers on mobile.', href: '/app/team', cta: 'Add Team Member', icon: Users, roles: ['admin','aggregator'] },
  { id: 'view_analytics', title: 'Review your analytics dashboard', description: 'Track collection volumes, compliance rates, and shipment scores over time.', href: '/app/analytics', cta: 'View Analytics', icon: BarChart3, roles: ['admin','aggregator','quality_manager','compliance_officer'] },
];

const COMPLIANCE_TIPS = [
  { title: 'EU EUDR', color: 'border-blue-200 dark:border-blue-900', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', items: ['GPS polygon boundary for every farm in the supply chain', 'Deforestation-free declaration per farm (post-Dec 2020)', 'Full collection → processing → shipment traceability chain', 'Due Diligence Statement (DDS) submitted to EU system', 'All farms must have compliance status: Approved'] },
  { title: 'China GACC', color: 'border-red-200 dark:border-red-900', badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', items: ['GACC facility registration certificate', 'Phytosanitary certificate (NAFDAC-issued)', 'Fumigation certificate with IPPC stamp (4 days pre-shipment)', 'MRL pesticide residue lab result (GB 2763-2021 compliant)', 'ISO 22000 / HACCP certification for the processing facility', 'Certificate of Origin (issued by NEPC)'] },
  { title: 'Rainforest Alliance', color: 'border-green-200 dark:border-green-900', badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', items: ['Farmer consent captured with signature and timestamp', 'Child labor awareness training — completed per farmer', 'Good Agricultural Practices (GAP) training on record', 'Sustainability & environment module completed', 'GPS farm boundary mapped', 'Pesticide inputs documented with product names and dates'] },
];

function ChecklistStep({ item, done, onToggle }: { item: any; done: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  return (
    <div className={`rounded-xl border transition-colors ${done ? 'border-green-200 dark:border-green-900 bg-green-500/5' : 'border-border bg-card'}`}>
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpen(o => !o)} type="button">
        <span onClick={e => { e.stopPropagation(); onToggle(); }} className="shrink-0 mt-0.5 cursor-pointer">
          {done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}
        </span>
        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className={`flex-1 text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>{item.title}</p>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 ml-16">
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{item.description}</p>
          <Link href={item.href}>
            <Button size="sm" variant={done ? 'outline' : 'default'} className="gap-1.5">
              {item.cta}<ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const { profile } = useOrg();
  const role = profile?.role || 'admin';
  const storageKey = `origintrace_guide_${profile?.id || 'anon'}`;
  const [done, setDone] = useState<Set<string>>(new Set());
  const [section, setSection] = useState<'checklist' | 'compliance'>('checklist');

  useEffect(() => {
    try { const s = localStorage.getItem(storageKey); if (s) setDone(new Set(JSON.parse(s))); } catch { /**/ }
  }, [storageKey]);

  const toggle = (id: string) => {
    setDone(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      try { localStorage.setItem(storageKey, JSON.stringify([...n])); } catch { /**/ }
      return n;
    });
  };

  const items = CHECKLIST.filter((i: any) => i.roles.includes(role));
  const doneCount = items.filter((i: any) => done.has(i.id)).length;
  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Getting Started</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Setup checklist and compliance quick-reference for OriginTrace</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['checklist', 'compliance'] as const).map(s => (
          <button key={s} type="button" onClick={() => setSection(s)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${section === s ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {s === 'checklist' ? 'Setup Checklist' : 'Compliance Tips'}
          </button>
        ))}
      </div>

      {section === 'checklist' && (
        <>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Setup progress</p>
                <p className="text-sm font-bold text-primary">{doneCount} / {items.length} steps</p>
              </div>
              <Progress value={pct} className="h-2" />
              {pct === 100 && <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />All steps complete — ready to export!</p>}
            </CardContent>
          </Card>
          <div className="space-y-2">
            {items.map((item: any) => <ChecklistStep key={item.id} item={item} done={done.has(item.id)} onToggle={() => toggle(item.id)} />)}
          </div>
          <p className="text-xs text-muted-foreground">Click the circle to mark complete. Progress saved locally in your browser.</p>
        </>
      )}

      {section === 'compliance' && (
        <div className="space-y-4">
          {COMPLIANCE_TIPS.map(tip => (
            <Card key={tip.title} className={`border ${tip.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />{tip.title}
                  <Badge className={`text-xs border-0 ml-auto ${tip.badge}`}>Required</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tip.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Configure compliance profiles</p>
                <p className="text-xs text-muted-foreground mt-0.5">Set required documents per destination market in Settings.</p>
              </div>
              <Link href="/app/settings?tab=compliance">
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0">Compliance Settings<ArrowRight className="h-3.5 w-3.5" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
