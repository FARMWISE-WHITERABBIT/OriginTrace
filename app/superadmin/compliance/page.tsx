'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, AlertTriangle, FileText, Globe, ShieldCheck } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocRequirement {
  id: string;
  label: string;
  required: boolean;
  notes?: string;
}

interface MarketRuleset {
  id: string;
  name: string;
  shortCode: string;
  color: string;
  description: string;
  docs: DocRequirement[];
}

// ── Default rulesets (editable in-UI; in production, persist to DB) ───────────

const DEFAULT_RULESETS: MarketRuleset[] = [
  {
    id: 'eudr',
    name: 'EU Deforestation Regulation',
    shortCode: 'EUDR',
    color: 'bg-blue-900/40 text-blue-300 border-blue-700',
    description: 'Regulation (EU) 2023/1115 — applies to cocoa, coffee, palm oil, soy, cattle, wood, rubber and derived products.',
    docs: [
      { id: 'gps_boundary', label: 'GPS farm boundary (GeoJSON polygon)', required: true },
      { id: 'deforestation_check', label: 'Deforestation-free satellite check', required: true },
      { id: 'farmer_consent', label: 'Farmer consent timestamp', required: true },
      { id: 'kyc_approved', label: 'Organisation KYC approved', required: true },
      { id: 'no_conflict', label: 'No unresolved boundary conflicts', required: true },
      { id: 'dds_statement', label: 'Due Diligence Statement (DDS) submitted', required: true },
      { id: 'supplier_list', label: 'Full supply chain supplier list', required: false, notes: 'Required for Tier 1 operators' },
    ],
  },
  {
    id: 'uk_tr',
    name: 'UK Timber Regulation / Forest Risk',
    shortCode: 'UK-FRC',
    color: 'bg-red-900/40 text-red-300 border-red-700',
    description: 'UK Forest Risk Commodities (FRC) framework — mirrors EUDR scope for UK market access.',
    docs: [
      { id: 'gps_boundary', label: 'GPS farm boundary', required: true },
      { id: 'deforestation_check', label: 'Deforestation-free check', required: true },
      { id: 'farmer_consent', label: 'Farmer consent', required: true },
      { id: 'local_laws', label: 'Compliance with local land use laws', required: true },
      { id: 'due_diligence', label: 'Due Diligence Statement', required: true },
    ],
  },
  {
    id: 'gacc',
    name: 'China GACC Registration',
    shortCode: 'GACC',
    color: 'bg-red-900/40 text-red-300 border-red-800',
    description: 'General Administration of Customs China — food safety registration for exporters.',
    docs: [
      { id: 'facility_registration', label: 'Processing facility GACC registration number', required: true },
      { id: 'phytosanitary', label: 'Phytosanitary certificate per shipment', required: true },
      { id: 'pesticide_mrls', label: 'Pesticide MRL test results within 6 months', required: true },
      { id: 'heavy_metals', label: 'Heavy metals test (Pb, Cd, Hg, As)', required: true },
      { id: 'aflatoxin', label: 'Aflatoxin B1 test (≤5 ppb)', required: true },
      { id: 'label_chinese', label: 'Chinese-language product label', required: false },
    ],
  },
  {
    id: 'uae',
    name: 'UAE / GCC Market',
    shortCode: 'UAE',
    color: 'bg-amber-900/40 text-amber-300 border-amber-700',
    description: 'UAE food import requirements for agri-commodities via Dubai / Abu Dhabi ports.',
    docs: [
      { id: 'halal_cert', label: 'Halal certification (where applicable)', required: false },
      { id: 'phytosanitary', label: 'Phytosanitary certificate', required: true },
      { id: 'coo', label: 'Certificate of Origin', required: true },
      { id: 'pesticide_mrls', label: 'Pesticide MRL compliance', required: true },
      { id: 'moisture', label: 'Moisture content certificate', required: true },
    ],
  },
  {
    id: 'us_fda',
    name: 'US FDA / FSMA',
    shortCode: 'US-FDA',
    color: 'bg-slate-700 text-slate-300 border-slate-600',
    description: 'US Food Safety Modernization Act — FSVP requirements for importers.',
    docs: [
      { id: 'fsvp_plan', label: 'Foreign Supplier Verification Program (FSVP) documentation', required: true },
      { id: 'hazard_analysis', label: 'Hazard analysis records', required: true },
      { id: 'supplier_verification', label: 'Supplier verification activities', required: true },
      { id: 'food_defense', label: 'Food defense plan', required: false },
      { id: 'aflatoxin', label: 'Aflatoxin test results', required: true },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') ?? 'eudr';

  const [rulesets, setRulesets] = useState<MarketRuleset[]>(DEFAULT_RULESETS);

  function toggleRequirement(marketId: string, docId: string) {
    setRulesets(prev => prev.map(m => m.id !== marketId ? m : {
      ...m,
      docs: m.docs.map(d => d.id !== docId ? d : { ...d, required: !d.required }),
    }));
  }

  const currentMarket = rulesets.find(m => m.id === activeTab) ?? rulesets[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-cyan-400" />Compliance Rulesets
        </h1>
        <p className="text-slate-400">Configure document and data requirements per export market</p>
      </div>

      <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 px-4 py-3 text-sm text-amber-300 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        Changes here are in-memory only (demonstration). Persistence to database requires the compliance_rulesets migration.
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {rulesets.map(m => (
          <button key={m.id}
            onClick={() => router.replace(`?tab=${m.id}`)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${m.id === activeTab ? m.color : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
            {m.shortCode}
          </button>
        ))}
      </div>

      {currentMarket && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-slate-400" />
                  {currentMarket.name}
                  <Badge variant="outline" className={`text-xs ml-1 ${currentMarket.color}`}>{currentMarket.shortCode}</Badge>
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1">{currentMarket.description}</CardDescription>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">{currentMarket.docs.filter(d => d.required).length} required</p>
                <p className="text-xs text-slate-600">{currentMarket.docs.filter(d => !d.required).length} optional</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentMarket.docs.map(doc => (
                <div key={doc.id}
                  className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border transition-colors ${doc.required ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-800/20 border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    {doc.required
                      ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      : <XCircle className="h-4 w-4 text-slate-600 shrink-0" />}
                    <div>
                      <p className="text-sm text-slate-200">{doc.label}</p>
                      {doc.notes && <p className="text-xs text-slate-500 mt-0.5">{doc.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Label className="text-xs text-slate-500">{doc.required ? 'Required' : 'Optional'}</Label>
                    <Switch checked={doc.required}
                      onCheckedChange={() => toggleRequirement(currentMarket.id, doc.id)}
                      data-testid={`switch-${currentMarket.id}-${doc.id}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-slate-700 flex items-center justify-between">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                These rules feed into the farm eligibility gate on batch creation.
              </p>
              <Button className="bg-[#2E7D6B] hover:bg-[#1F5F52]" size="sm"
                onClick={() => alert('Save to DB — requires compliance_rulesets migration')}>
                Save Ruleset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
