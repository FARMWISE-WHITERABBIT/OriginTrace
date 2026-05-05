'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Globe, ShieldCheck, FileText, Loader2, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { COMPLIANCE_TEMPLATES, TEMPLATE_ORDER, type ComplianceTemplate, type ComplianceDocument } from '@/lib/compliance-templates';

// ── Component ─────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const activeTab = searchParams.get('tab') ?? TEMPLATE_ORDER[0];

  // Start with template defaults; override docs from DB rulesets on load
  const [templates, setTemplates] = useState<ComplianceTemplate[]>(
    TEMPLATE_ORDER.map(k => COMPLIANCE_TEMPLATES[k])
  );
  const [loadingDb, setLoadingDb] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirtyMarkets, setDirtyMarkets] = useState<Set<string>>(new Set());
  const [savedAt, setSavedAt] = useState<Record<string, string | null>>({});

  const loadRulesets = useCallback(async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/superadmin/compliance-rulesets');
      if (!res.ok) return;
      const { rulesets } = await res.json();
      if (!Array.isArray(rulesets) || rulesets.length === 0) return;

      // Merge DB overrides into the canonical templates
      const savedAtMap: Record<string, string | null> = {};
      setTemplates(prev => prev.map(tpl => {
        const row = rulesets.find((r: any) => r.market_id === tpl.market_id);
        if (!row) return tpl;
        savedAtMap[tpl.market_id] = row.updated_at ?? null;
        // DB docs array overrides template defaults
        return Array.isArray(row.docs) && row.docs.length > 0
          ? { ...tpl, docs: row.docs as ComplianceDocument[] }
          : tpl;
      }));
      setSavedAt(savedAtMap);
    } catch {
      // Non-fatal — fall back to template defaults
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => { loadRulesets(); }, [loadRulesets]);

  function toggleRequirement(marketId: string, docId: string) {
    setTemplates(prev => prev.map(tpl => tpl.market_id !== marketId ? tpl : {
      ...tpl,
      docs: tpl.docs.map(d => d.id !== docId ? d : { ...d, required: !d.required }),
    }));
    setDirtyMarkets(prev => new Set(prev).add(marketId));
  }

  async function saveRuleset() {
    if (!currentTemplate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/compliance-rulesets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: currentTemplate.market_id,
          market_name: currentTemplate.market_name,
          short_code: currentTemplate.short_code,
          description: currentTemplate.description,
          docs: currentTemplate.docs,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Save failed', description: err.error ?? 'Unknown error', variant: 'destructive' });
        return;
      }

      const { ruleset } = await res.json();
      setSavedAt(prev => ({ ...prev, [currentTemplate.market_id]: ruleset.updated_at }));
      setDirtyMarkets(prev => { const s = new Set(prev); s.delete(currentTemplate.market_id); return s; });
      toast({ title: 'Ruleset saved', description: `${currentTemplate.market_name} requirements updated.` });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message ?? 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefaults() {
    if (!currentTemplate) return;
    const base = COMPLIANCE_TEMPLATES[currentTemplate.market_id];
    if (!base) return;
    setTemplates(prev => prev.map(tpl => tpl.market_id !== currentTemplate.market_id ? tpl : { ...tpl, docs: base.docs }));
    setDirtyMarkets(prev => new Set(prev).add(currentTemplate.market_id));
    toast({ title: 'Reset to defaults', description: 'Toggle Required/Optional as needed, then save.' });
  }

  const currentTemplate = templates.find(t => t.market_id === activeTab) ?? templates[0];
  const isDirty = dirtyMarkets.has(currentTemplate?.market_id ?? '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-cyan-400" />Compliance Rulesets
        </h1>
        <p className="text-slate-400">
          Configure document requirements per regulation framework — these feed into the farm eligibility gate and org compliance profiles.
        </p>
      </div>

      {loadingDb && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />Loading saved overrides…
        </div>
      )}

      {/* Framework selector */}
      <div className="flex flex-wrap gap-2">
        {templates.map(tpl => (
          <button
            key={tpl.market_id}
            onClick={() => router.replace(`?tab=${tpl.market_id}`)}
            className={`relative px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              tpl.market_id === activeTab ? tpl.color : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {tpl.short_code}
            {dirtyMarkets.has(tpl.market_id) && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" title="Unsaved changes" />
            )}
          </button>
        ))}
      </div>

      {currentTemplate && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-slate-400" />
                  {currentTemplate.market_name}
                  <Badge variant="outline" className={`text-xs ml-1 ${currentTemplate.color}`}>
                    {currentTemplate.short_code}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1 max-w-2xl">
                  {currentTemplate.description}
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[11px] text-slate-600">Framework: <code className="font-mono text-slate-500">{currentTemplate.regulation_framework}</code></span>
                  <span className="text-[11px] text-slate-600">Market: {currentTemplate.destination_market}</span>
                  <span className="text-[11px] text-slate-600">Geo: {currentTemplate.geo_verification_level}</span>
                  <span className="text-[11px] text-slate-600">Traceability depth: {currentTemplate.min_traceability_depth}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">{currentTemplate.docs.filter(d => d.required).length} required</p>
                <p className="text-xs text-slate-600">{currentTemplate.docs.filter(d => !d.required).length} optional</p>
                {savedAt[currentTemplate.market_id] && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    Saved {new Date(savedAt[currentTemplate.market_id]!).toLocaleDateString('en-GB')}
                  </p>
                )}
                {!savedAt[currentTemplate.market_id] && !loadingDb && (
                  <p className="text-[10px] text-slate-600 mt-1">Using template defaults</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentTemplate.docs.map(doc => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border transition-colors ${
                    doc.required ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-800/20 border-slate-800'
                  }`}
                >
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
                    <Switch
                      checked={doc.required}
                      onCheckedChange={() => toggleRequirement(currentTemplate.market_id, doc.id)}
                      data-testid={`switch-${currentTemplate.market_id}-${doc.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Certifications reference */}
            {currentTemplate.required_certifications.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Recognised certifications for this framework</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentTemplate.required_certifications.map(cert => (
                    <Badge key={cert} variant="outline" className="text-xs border-slate-700 text-slate-400">{cert}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-700 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                These rules override the defaults shown when orgs create compliance profiles via templates.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:bg-slate-800"
                  onClick={resetToDefaults}
                  disabled={saving}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Reset Defaults
                </Button>
                <Button
                  className="bg-[#2E7D6B] hover:bg-[#1F5F52]"
                  size="sm"
                  onClick={saveRuleset}
                  disabled={saving || !isDirty}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  {saving ? 'Saving…' : isDirty ? 'Save Ruleset' : 'Saved'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
