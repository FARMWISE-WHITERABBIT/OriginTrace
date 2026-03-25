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
  Fingerprint, ChevronDown, ChevronRight, Info, AlertTriangle,
} from 'lucide-react';

const CHECKLIST = [
  {
    id: 'register_farmer',
    title: 'Register your first farmer',
    description: 'Go to Farmers → Register Farmer. Enter the farmer\'s full name, phone number, and assign a primary commodity. Select their State, LGA, and Community from the cascading dropdowns. Capture informed consent with a digital signature — this is legally required for EUDR and Rainforest Alliance compliance. Optionally upload a farmer photo and ID document (NIN card, voter ID, or passport). A unique Farmer ID (e.g. FRM-202401-A3B2) is auto-generated and stored in the profile.',
    tip: 'Phone number is optional but enables the farmer to log in via the OriginTrace Farmer App.',
    href: '/app/farmers/new',
    cta: 'Register Farmer',
    icon: UserPlus,
    roles: ['admin','aggregator','agent'],
  },
  {
    id: 'map_farm',
    title: 'Map a GPS farm boundary',
    description: 'After registering a farmer, open their profile (Farmers → select farmer) and click "Map Farm Boundary". On the satellite map, draw a polygon around the farm perimeter by placing pins at each corner. The platform auto-calculates the area in hectares once the polygon is closed. A GPS boundary is mandatory for EUDR deforestation-free declarations — every farm in your supply chain must be mapped.',
    tip: 'You can also map boundaries from the mobile app while physically on the farm for best accuracy.',
    href: '/app/farms/map',
    cta: 'Open Farm Map',
    icon: Map,
    roles: ['admin','aggregator','agent'],
  },
  {
    id: 'collect_batch',
    title: 'Record a collection batch',
    description: 'Go to Smart Collect. Select the farmer from the list (or scan their QR code), enter the number of bags and weight per bag, assign a quality grade (A/B/C/D), and submit. The batch is immediately linked to the farmer\'s profile and supply chain. Smart Collect works fully offline — batches sync automatically when connectivity is restored. From a farmer\'s profile, use the "New Collection" button to pre-fill the farmer.',
    tip: 'Use the Batches tab on a farmer\'s profile to view all collections and navigate directly to inventory.',
    href: '/app/collect',
    cta: 'Start Collection',
    icon: Package,
    roles: ['admin','aggregator','agent'],
  },
  {
    id: 'log_inputs',
    title: 'Record agricultural inputs',
    description: 'Open a farmer\'s profile (Farmers → select farmer → Inputs tab) and click "Add Input". Record fertilizers, pesticides, herbicides, seeds, or organic amendments applied to the farm. Enter the product name, quantity, unit, and application date. These records are reviewed by auditors for Rainforest Alliance certification and are required for GACC MRL (Maximum Residue Limits) compliance before export to China.',
    tip: 'Inputs with banned or restricted pesticide names will be automatically flagged in the compliance dashboard.',
    href: '/app/farmers',
    cta: 'View Farmers',
    icon: Factory,
    roles: ['admin','aggregator'],
  },
  {
    id: 'assign_training',
    title: 'Log farmer training sessions',
    description: 'Open a farmer\'s profile (Farmers → select farmer → Training tab) and click "Add Training". Select the module type (GAP, Child Labor Awareness, EUDR Awareness, Sustainability, etc.), set the status, and record any score or completion date. Completed training modules appear as green badges on the farmer profile. Rainforest Alliance requires documented evidence of GAP and child labor awareness training for every registered farmer.',
    tip: 'Mark training "In Progress" first, then update to "Completed" with a score once the session is done.',
    href: '/app/farmers',
    cta: 'View Farmers',
    icon: Users,
    roles: ['admin','aggregator'],
  },
  {
    id: 'create_processing_run',
    title: 'Log a processing run',
    description: 'Go to Processing → New Run. Select the input batches (collected produce), enter the gross input weight, processing date, and facility. The platform automatically computes the mass balance — output weight vs input weight — and flags any unexplained variance. Processing runs link your farm-level collection data to the finished goods stage, forming the core of your chain-of-custody audit trail.',
    tip: 'Mass balance must close within your configured tolerance (default 5%) before a run can be marked Complete.',
    href: '/app/processing',
    cta: 'Create Processing Run',
    icon: Factory,
    roles: ['admin','compliance_officer'],
  },
  {
    id: 'create_finished_good',
    title: 'Create a finished good (pedigree)',
    description: 'Go to Pedigree → New Finished Good. Link one or more processing runs, assign a product code, and specify the export grade and net weight. This creates an auditable pedigree record that connects farm-level origin data all the way through to the export lot. The pedigree code is used to generate the Digital Product Passport and appears on shipping documents.',
    tip: 'One pedigree record can span multiple processing runs to cover full export lot consolidation.',
    href: '/app/pedigree',
    cta: 'Create Finished Good',
    icon: FileText,
    roles: ['admin','compliance_officer'],
  },
  {
    id: 'generate_dpp',
    title: 'Generate a Digital Product Passport (DPP)',
    description: 'Go to DPP → Generate. Select the finished good (pedigree), choose which certifications to include, and publish. The DPP is a shareable, tamper-evident record of the product\'s full supply chain journey — from GPS-mapped farms through processing to the export lot. Buyers and regulators can verify it via a public URL without needing a login. Required for EU market entry under EUDR regulations.',
    tip: 'DPPs include a QR code you can print on packaging or include in shipping documentation.',
    href: '/app/dpp',
    cta: 'Generate DPP',
    icon: Fingerprint,
    roles: ['admin','compliance_officer'],
  },
  {
    id: 'create_shipment',
    title: 'Run a shipment readiness check',
    description: 'Go to Shipments → New Shipment. Attach the relevant DPPs and export documents, then run the 5-dimension compliance check. The platform scores your shipment across: Farm Compliance, GPS Coverage, Document Completeness, Chain of Custody, and Certification Validity. The result is GO (all clear), CONDITIONAL (minor gaps), or NO-GO (critical issues). Address any NO-GO findings before booking the vessel.',
    tip: 'A CONDITIONAL result lists the specific gaps — you can resolve them and re-run the check without starting over.',
    href: '/app/shipments',
    cta: 'Create Shipment',
    icon: Ship,
    roles: ['admin','logistics_coordinator','compliance_officer'],
  },
  {
    id: 'upload_document',
    title: 'Upload export documents',
    description: 'Go to Documents → Upload. Attach market-specific certificates and compliance documents: Phytosanitary Certificate (NAFDAC-issued), Fumigation Certificate with IPPC stamp, GACC facility registration, MRL lab results, Certificate of Origin (NEPC), ISO 22000 / HACCP certification, and Rainforest Alliance certificates. Documents are linked to shipments and DPPs, and expiry dates are tracked with automated alerts.',
    tip: 'Set expiry dates on all certificates — the platform will alert you 30 days before they expire.',
    href: '/app/documents',
    cta: 'Upload Document',
    icon: FileText,
    roles: ['admin','compliance_officer','logistics_coordinator'],
  },
  {
    id: 'invite_agent',
    title: 'Add field agents to your team',
    description: 'Go to Team → Invite Member. Enter the agent\'s email address and assign the "Field Agent" role. They will receive an invitation email with a link to set their password. Agents can register farmers and record collection batches from the mobile-optimised web app. They see only their own collections; admins see all activity across the organisation.',
    tip: 'For aggregators managing multiple buying centres, assign agents to specific communities using the location filter on their profile.',
    href: '/app/team',
    cta: 'Add Team Member',
    icon: Users,
    roles: ['admin','aggregator'],
  },
  {
    id: 'view_analytics',
    title: 'Review your analytics dashboard',
    description: 'Go to Analytics to monitor collection volumes by commodity, farmer, agent, and time period. Track compliance rates (% of farms approved vs pending), shipment scores, training completion rates, and DPP issuance. Use the Compliance tab to see which farmers are missing GPS boundaries, consent, or training records. The Supply Chain tab shows end-to-end traceability coverage across your operation.',
    tip: 'Export any chart to CSV or PDF for inclusion in buyer reports and audit submissions.',
    href: '/app/analytics',
    cta: 'View Analytics',
    icon: BarChart3,
    roles: ['admin','aggregator','quality_manager','compliance_officer'],
  },
];

const COMPLIANCE_TIPS = [
  {
    title: 'EU EUDR',
    color: 'border-blue-200 dark:border-blue-900',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    intro: 'The EU Deforestation Regulation requires exporters to prove all farms are deforestation-free and GPS-mapped before shipping to the EU.',
    items: [
      'GPS polygon boundary mapped for every farm in the supply chain',
      'Deforestation-free declaration per farm (land use post December 2020)',
      'Informed farmer consent captured with signature and timestamp',
      'Full traceability chain: collection → processing → shipment linked',
      'Due Diligence Statement (DDS) submitted to the EU TRACES system',
      'All farms must have compliance status set to Approved',
    ],
  },
  {
    title: 'China GACC',
    color: 'border-red-200 dark:border-red-900',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    intro: 'The General Administration of Customs China requires facility registration and stringent phytosanitary documentation before shipment.',
    items: [
      'GACC facility registration certificate (processing plant registered with Chinese customs)',
      'Phytosanitary certificate issued by NAFDAC (per shipment)',
      'Fumigation certificate with IPPC stamp — completed 4 days before loading',
      'MRL pesticide residue lab test result compliant with GB 2763-2021',
      'ISO 22000 or HACCP certification for the processing facility',
      'Certificate of Origin issued by NEPC (Nigerian Export Promotion Council)',
    ],
  },
  {
    title: 'Rainforest Alliance',
    color: 'border-green-200 dark:border-green-900',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    intro: 'Rainforest Alliance certification requires documented evidence of farmer training, input tracking, and environmental practices.',
    items: [
      'Farmer consent captured with signature and date for every registered farmer',
      'Child Labor Awareness training completed and recorded per farmer',
      'Good Agricultural Practices (GAP) training completed per farmer',
      'Sustainability & Environment module completed per farmer',
      'GPS farm boundary mapped for every certified farm',
      'All pesticide and fertilizer inputs documented with product names and dates',
    ],
  },
];

const ROLE_QUICKSTART: Record<string, { label: string; steps: string[] }> = {
  agent: {
    label: 'Field Agent Quick Start',
    steps: ['Register farmers using the Register Farmer button', 'Record their consent and upload ID documents', 'Start a collection via Smart Collect after each harvest'],
  },
  aggregator: {
    label: 'Aggregator Quick Start',
    steps: ['Register all farmers in your catchment area', 'Map GPS boundaries for each farm', 'Log agricultural inputs and training per farmer', 'Record collection batches after buying sessions'],
  },
  compliance_officer: {
    label: 'Compliance Officer Quick Start',
    steps: ['Review farm compliance status in Analytics', 'Log processing runs and create pedigree records', 'Generate Digital Product Passports before shipment', 'Upload and maintain all export certificates in Documents'],
  },
  logistics_coordinator: {
    label: 'Logistics Quick Start',
    steps: ['Create shipment records and link DPPs', 'Run the 5-dimension readiness check', 'Ensure all export documents are uploaded and unexpired'],
  },
};

function ChecklistStep({ item, done, onToggle }: { item: typeof CHECKLIST[0]; done: boolean; onToggle: () => void }) {
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
        <div className="px-4 pb-4 ml-16 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          {item.tip && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/8 border border-amber-200/50 dark:border-amber-900/50 px-3 py-2">
              <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{item.tip}</p>
            </div>
          )}
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

  const items = CHECKLIST.filter(i => i.roles.includes(role));
  const doneCount = items.filter(i => done.has(i.id)).length;
  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
  const quickstart = ROLE_QUICKSTART[role];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Getting Started</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Step-by-step workflow guide and compliance quick-reference for OriginTrace</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['checklist', 'compliance'] as const).map(s => (
          <button key={s} type="button" onClick={() => setSection(s)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${section === s ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {s === 'checklist' ? 'Workflow Checklist' : 'Compliance Requirements'}
          </button>
        ))}
      </div>

      {section === 'checklist' && (
        <>
          {quickstart && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" />{quickstart.label}</p>
                <ol className="space-y-1">
                  {quickstart.steps.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0">{i + 1}.</span>{s}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

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
            {items.map(item => <ChecklistStep key={item.id} item={item} done={done.has(item.id)} onToggle={() => toggle(item.id)} />)}
          </div>
          <p className="text-xs text-muted-foreground">Click the circle icon to mark a step complete. Progress is saved in your browser.</p>
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
                {tip.intro && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.intro}</p>}
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
                <p className="text-xs text-muted-foreground mt-0.5">Set required documents per destination market in Settings → Compliance.</p>
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
