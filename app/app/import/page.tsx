'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  Download, Loader2, ChevronDown, ChevronUp, Info, RefreshCw,
} from 'lucide-react';

type ImportType = 'farmers' | 'farms' | 'batches';

interface ImportResult {
  success: boolean;
  type: string;
  dry_run: boolean;
  total_rows: number;
  imported: number;
  skipped: number;
  errors: string[];
  preview?: Record<string, any>[];
  message: string;
  error?: string;
  hint?: string;
}

const TYPE_INFO: Record<ImportType, { label: string; description: string; requiredCols: string[]; optionalCols: string[]; koboNote: string }> = {
  farmers: {
    label: 'Farmers & Farms',
    description: 'Import farmer registrations and farm records. Each row becomes one farm record.',
    requiredCols: ['farmer_name', 'community'],
    optionalCols: ['phone', 'farmer_id', 'commodity', 'area_hectares', 'latitude', 'longitude', 'state', 'lga'],
    koboNote: 'KoBoToolbox exports: use "_gps_latitude" / "_gps_longitude" — OriginTrace maps these automatically.',
  },
  farms: {
    label: 'Farms Only',
    description: 'Same as Farmers — import farm polygon data. Alias for the same import type.',
    requiredCols: ['farmer_name', 'community'],
    optionalCols: ['phone', 'farmer_id', 'commodity', 'area_hectares', 'latitude', 'longitude'],
    koboNote: 'Works with KoBoToolbox, ODK, and CommCare exports without any column renaming.',
  },
  batches: {
    label: 'Collection Batches',
    description: 'Import harvest collection records. Farmers must be imported first — batches are matched by farmer name.',
    requiredCols: ['farmer_name'],
    optionalCols: ['total_weight', 'bag_count', 'commodity', 'notes', 'collected_at'],
    koboNote: 'Farmer names must match existing records. Import farmers first, then batches.',
  },
};

const COLUMN_ALIASES = [
  { yours: 'farmer name / name / respondent / full name', ours: 'farmer_name' },
  { yours: 'phone / mobile / tel / telephone / contact', ours: 'phone' },
  { yours: 'village / locality / town / settlement / location', ours: 'community' },
  { yours: 'area / farm size / ha / hectares / size_ha', ours: 'area_hectares' },
  { yours: 'crop / crop type', ours: 'commodity' },
  { yours: 'farmer id / id / kobo id / farmerid', ours: 'farmer_id' },
  { yours: '_gps_latitude / gps latitude / lat', ours: 'latitude' },
  { yours: '_gps_longitude / gps longitude / lon / lng', ours: 'longitude' },
  { yours: 'weight / weight_kg / total weight', ours: 'total_weight (batches)' },
  { yours: 'bags / bag count', ours: 'bag_count (batches)' },
  { yours: 'date / collection date', ours: 'collected_at (batches)' },
];

function downloadTemplate(type: ImportType) {
  const templates: Record<ImportType, string> = {
    farmers: 'farmer_name,phone,community,commodity,area_hectares,farmer_id,latitude,longitude,state,lga\nKwame Asante,+233201234567,Asankrangwa,cocoa,2.5,KW001,5.6832,-2.4051,Western Region,Amenfi East\nAbena Mensah,+233241234567,Sefwi Wiawso,cocoa,3.2,KW002,6.1954,-2.7384,Western North,Sefwi Wiawso',
    farms: 'farmer_name,phone,community,commodity,area_hectares,farmer_id,latitude,longitude\nKwame Asante,+233201234567,Asankrangwa,cocoa,2.5,KW001,5.6832,-2.4051',
    batches: 'farmer_name,total_weight,bag_count,commodity,notes,collected_at\nKwame Asante,320,8,cocoa,Grade A harvest,2026-01-15\nAbena Mensah,180,5,cocoa,,2026-01-16',
  };
  const csv = templates[type];
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `origintrace_${type}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState<ImportType>('farmers');
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showAliases, setShowAliases] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const info = TYPE_INFO[importType];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast({ title: 'Unsupported file type', description: 'Please use .csv or .xlsx', variant: 'destructive' });
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', importType);
      form.append('dry_run', dryRun ? 'true' : 'false');

      const res = await fetch('/api/import', { method: 'POST', body: form });
      const data: ImportResult = await res.json();
      setResult(data);

      if (!res.ok) {
        toast({ title: data.error || 'Import failed', variant: 'destructive' });
      } else if (!dryRun) {
        toast({ title: `${data.imported} records imported`, description: data.skipped ? `${data.skipped} rows skipped` : undefined });
      }
    } catch (e: any) {
      toast({ title: 'Network error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Import Data</h1>
        <p className="text-muted-foreground mt-1">
          Migrate from KoBoToolbox, ODK, CommCare, or any spreadsheet. Upload CSV or Excel files.
        </p>
      </div>

      {/* Import type selector */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(TYPE_INFO) as ImportType[]).map(t => (
          <button
            key={t}
            onClick={() => { setImportType(t); setResult(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              importType === t
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                : 'border-border hover:border-emerald-300'
            }`}
          >
            <p className="font-semibold text-sm">{TYPE_INFO[t].label}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{TYPE_INFO[t].description.split('.')[0]}</p>
          </button>
        ))}
      </div>

      {/* Column guide + template */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{info.label} — Column Guide</CardTitle>
              <CardDescription className="mt-1">{info.koboNote}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(importType)}>
              <Download className="h-4 w-4 mr-2" />Template CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Required:</span>
            {info.requiredCols.map(c => (
              <Badge key={c} variant="destructive" className="text-xs font-mono">{c}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Optional:</span>
            {info.optionalCols.map(c => (
              <Badge key={c} variant="secondary" className="text-xs font-mono">{c}</Badge>
            ))}
          </div>

          {/* Column aliases accordion */}
          <button
            onClick={() => setShowAliases(v => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            {showAliases ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            View all accepted column name aliases (KoBoToolbox, ODK, CommCare…)
          </button>
          {showAliases && (
            <div className="rounded border bg-muted/40 overflow-hidden mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="text-left px-3 py-2 font-medium">Your column name(s)</th>
                    <th className="text-left px-3 py-2 font-medium">OriginTrace field</th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMN_ALIASES.map((a, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{a.yours}</td>
                      <td className="px-3 py-2 font-mono text-emerald-600 dark:text-emerald-400">{a.ours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              file ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' : 'border-border hover:border-emerald-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="space-y-1">
                <FileText className="h-8 w-8 mx-auto text-emerald-500" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">CSV or Excel (.csv, .xlsx) · Max 5,000 rows</p>
              </div>
            )}
          </div>

          {/* Dry run toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Preview mode</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {dryRun ? 'Preview is ON — no data will be saved. Review results, then run the actual import.' : 'Preview is OFF — data will be inserted into your account.'}
              </p>
            </div>
            <button
              onClick={() => setDryRun(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dryRun ? 'bg-amber-500' : 'bg-emerald-500'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dryRun ? 'translate-x-1' : 'translate-x-6'}`} />
            </button>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{dryRun ? 'Previewing…' : 'Importing…'}</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />{dryRun ? 'Preview Import' : 'Run Import'}</>
              )}
            </Button>
            {file && (
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" />Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className={result.success ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {result.error ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : result.skipped > 0 ? (
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              )}
              <div>
                <CardTitle className="text-base">{result.error ? 'Import Error' : result.dry_run ? 'Preview Results' : 'Import Complete'}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{result.message || result.error}</p>
                {result.hint && <p className="text-xs text-amber-600 mt-1">{result.hint}</p>}
              </div>
            </div>
          </CardHeader>

          {!result.error && (
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded bg-muted">
                  <p className="text-2xl font-bold">{result.total_rows}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="text-center p-3 rounded bg-emerald-50 dark:bg-emerald-950">
                  <p className="text-2xl font-bold text-emerald-600">{result.imported}</p>
                  <p className="text-xs text-muted-foreground">{result.dry_run ? 'Ready' : 'Imported'}</p>
                </div>
                <div className="text-center p-3 rounded bg-red-50 dark:bg-red-950">
                  <p className="text-2xl font-bold text-red-500">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowErrors(v => !v)}
                    className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                  >
                    {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {result.errors.length} row error{result.errors.length !== 1 ? 's' : ''}
                  </button>
                  {showErrors && (
                    <div className="mt-2 rounded border bg-red-50 dark:bg-red-950 p-3 max-h-48 overflow-y-auto space-y-1">
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-xs font-mono text-red-700 dark:text-red-300">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview table */}
              {result.dry_run && result.preview && result.preview.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">First {result.preview.length} rows preview:</p>
                  <div className="rounded border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          {Object.keys(result.preview[0]).filter(k => k !== 'org_id' && k !== 'created_by' && k !== 'compliance_status').map(k => (
                            <th key={k} className="text-left px-3 py-2 font-medium capitalize">{k.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.preview.map((row, i) => (
                          <tr key={i} className="border-t">
                            {Object.entries(row).filter(([k]) => k !== 'org_id' && k !== 'created_by' && k !== 'compliance_status').map(([k, v]) => (
                              <td key={k} className="px-3 py-2 text-muted-foreground">{String(v ?? '—')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CTA after preview */}
              {result.dry_run && result.imported > 0 && (
                <div className="flex items-center gap-3 p-3 rounded bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Looks good! Ready to import {result.imported} records.</p>
                    <p className="text-xs text-muted-foreground">Toggle preview off and click Run Import to save.</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { setDryRun(false); setResult(null); }}
                  >
                    Run Import
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
