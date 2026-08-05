'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, FileSpreadsheet, ArrowRight, CheckCircle, AlertCircle,
  Loader2, X, Download, ChevronDown, ChevronUp, Info
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
type ImportType = 'farmers' | 'batches';

interface ColumnMapping { csvColumn: string; origintraceField: string; }
interface ImportResult { success: number; failed: number; errors: string[]; }

// ── Field definitions per import type ───────────────────────────────────────
const FIELDS: Record<ImportType, { value: string; label: string; required: boolean }[]> = {
  farmers: [
    { value: 'farmer_name',  label: 'Farmer Name',        required: true  },
    { value: 'community',    label: 'Community / Village', required: true  },
    { value: 'phone',        label: 'Phone Number',        required: false },
    { value: 'state',        label: 'State',               required: false },
    { value: 'lga',          label: 'LGA',                 required: false },
    { value: 'area_hectares',label: 'Farm Size (ha)',       required: false },
    { value: 'commodity',    label: 'Primary Commodity',   required: false },
    { value: 'farmer_id',    label: 'Farmer / KoBoToolbox ID', required: false },
    { value: 'latitude',     label: 'GPS Latitude',        required: false },
    { value: 'longitude',    label: 'GPS Longitude',       required: false },
    { value: 'skip',         label: '-- Skip this column --', required: false },
  ],
  batches: [
    { value: 'farmer_name',  label: 'Farmer Name',         required: true  },
    { value: 'total_weight', label: 'Weight (kg)',          required: false },
    { value: 'bag_count',    label: 'Bag Count',            required: false },
    { value: 'commodity',    label: 'Commodity',            required: false },
    { value: 'notes',        label: 'Notes',                required: false },
    { value: 'collected_at', label: 'Collection Date',      required: false },
    { value: 'skip',         label: '-- Skip this column --', required: false },
  ],
};

// KoBoToolbox / ODK / CommCare column aliases — auto-detect on upload
const AUTO_MAP: Record<string, string> = {
  // farmer_name
  'farmer name': 'farmer_name', 'farmer_name': 'farmer_name', 'name': 'farmer_name',
  'full name': 'farmer_name', 'fullname': 'farmer_name', 'respondent': 'farmer_name',
  'farmer': 'farmer_name', 'full_name': 'farmer_name',
  // phone
  'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone', 'tel': 'phone',
  'telephone': 'phone', 'contact': 'phone', 'phonenumber': 'phone', 'phone_number': 'phone',
  // community
  'community': 'community', 'village': 'community', 'location': 'community',
  'locality': 'community', 'town': 'community', 'settlement': 'community',
  // area_hectares
  'area_hectares': 'area_hectares', 'area': 'area_hectares', 'farm size': 'area_hectares',
  'farmsize': 'area_hectares', 'hectares': 'area_hectares', 'ha': 'area_hectares',
  'size_ha': 'area_hectares', 'farm_size': 'area_hectares', 'farm size (ha)': 'area_hectares',
  // commodity
  'commodity': 'commodity', 'crop': 'commodity', 'crop type': 'commodity', 'croptype': 'commodity',
  'primary commodity': 'commodity', 'product': 'commodity',
  // farmer_id
  'farmer_id': 'farmer_id', 'farmer id': 'farmer_id', 'kobo id': 'farmer_id',
  'farmerid': 'farmer_id', '_id': 'farmer_id', 'id': 'farmer_id',
  // GPS
  'latitude': 'latitude', 'lat': 'latitude', '_gps_latitude': 'latitude',
  'gps_latitude': 'latitude', 'gps latitude': 'latitude',
  'longitude': 'longitude', 'lon': 'longitude', 'lng': 'longitude',
  '_gps_longitude': 'longitude', 'gps_longitude': 'longitude', 'gps longitude': 'longitude',
  // state / lga
  'state': 'state', 'lga': 'lga', 'local government': 'lga', 'lga name': 'lga',
  // batches
  'weight': 'total_weight', 'weight_kg': 'total_weight', 'total weight': 'total_weight',
  'bags': 'bag_count', 'bag count': 'bag_count', 'bag_count': 'bag_count',
  'notes': 'notes', 'note': 'notes', 'remarks': 'notes',
  'date': 'collected_at', 'collection date': 'collected_at', 'collected_at': 'collected_at',
};

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += char; }
    }
    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, ''));
  });
}

// ── Template downloader ──────────────────────────────────────────────────────
function downloadTemplate(type: ImportType) {
  const templates: Record<ImportType, string> = {
    farmers: 'farmer_name,phone,community,commodity,area_hectares,farmer_id,latitude,longitude,state,lga\nKwame Asante,+234801234567,Asankrangwa,cocoa,2.5,KW001,5.6832,-2.4051,Ogun State,Sagamu\nAbena Mensah,+234811234567,Sefwi Wiawso,cocoa,3.2,KW002,6.1954,-2.7384,Enugu State,Enugu North',
    batches: 'farmer_name,total_weight,bag_count,commodity,notes,collected_at\nKwame Asante,320,8,cocoa,Grade A,2026-01-15\nAbena Mensah,180,5,cocoa,,2026-01-16',
  };
  const blob = new Blob([templates[type]], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `origintrace_${type}_template.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Props ────────────────────────────────────────────────────────────────────
interface CSVImporterProps {
  onImport: (data: Record<string, string>[], type: ImportType) => Promise<ImportResult>;
}

// ── Component ────────────────────────────────────────────────────────────────
export function CSVImporter({ onImport }: CSVImporterProps) {
  const [importType, setImportType] = useState<ImportType>('farmers');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'result'>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showAliases, setShowAliases] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fields = FIELDS[importType];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast({ title: 'Unsupported file', description: 'Use .csv or .xlsx', variant: 'destructive' });
      return;
    }

    setFile(f);
    let parsed: string[][] = [];

    if (ext === 'csv') {
      const text = await f.text();
      parsed = parseCSV(text);
    } else {
      // Excel: send to API for parsing, get back CSV-like rows
      const form = new FormData();
      form.append('file', f);
      form.append('type', importType);
      form.append('dry_run', 'true');
      try {
        const res = await fetch('/api/import', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) {
          toast({ title: data.error || 'Could not read Excel file', variant: 'destructive' });
          return;
        }
        // Use preview rows to infer headers
        if (data.preview?.length > 0) {
          const hdrs = Object.keys(data.preview[0]).filter(k => k !== 'org_id' && k !== 'created_by' && k !== 'compliance_status');
          setHeaders(hdrs);
          setCsvData(data.preview.map((r: any) => hdrs.map((h: string) => String(r[h] ?? ''))));
          setMappings(hdrs.map(h => ({ csvColumn: h, origintraceField: AUTO_MAP[h.toLowerCase()] || 'skip' })));
          setStep('map');
          return;
        }
      } catch {
        toast({ title: 'Failed to read Excel file', variant: 'destructive' });
        return;
      }
    }

    if (parsed.length < 2) {
      toast({ title: 'Empty file', description: 'File has no data rows', variant: 'destructive' });
      return;
    }

    const fileHeaders = parsed[0];
    const data = parsed.slice(1).filter(r => r.some(c => c.trim()));
    setHeaders(fileHeaders);
    setCsvData(data);
    setMappings(fileHeaders.map(h => ({
      csvColumn: h,
      origintraceField: AUTO_MAP[h.toLowerCase().trim()] || 'skip',
    })));
    setStep('map');
  };

  const updateMapping = (i: number, field: string) => {
    const m = [...mappings]; m[i].origintraceField = field; setMappings(m);
  };

  const validateMappings = (): boolean => {
    const required = fields.filter(f => f.required && f.value !== 'skip').map(f => f.value);
    const mapped = mappings.map(m => m.origintraceField);
    for (const r of required) {
      if (!mapped.includes(r)) {
        toast({ title: 'Missing required field', description: `Map "${fields.find(f => f.value === r)?.label}"`, variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const getMappedData = (): Record<string, string>[] =>
    csvData.map(row => {
      const record: Record<string, string> = {};
      mappings.forEach((m, i) => { if (m.origintraceField !== 'skip') record[m.origintraceField] = row[i] || ''; });
      return record;
    });

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const r = await onImport(getMappedData(), importType);
      setResult(r);
      setStep('result');
    } catch {
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null); setCsvData([]); setHeaders([]); setMappings([]);
    setStep('upload'); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Data Import
            </CardTitle>
            <CardDescription className="mt-1">
              Import from KoBoToolbox, ODK, CommCare, or any spreadsheet — CSV or Excel
            </CardDescription>
          </div>
          {step === 'upload' && (
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(importType)}>
              <Download className="h-4 w-4 mr-2" />Template
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Type selector */}
        {step === 'upload' && (
          <div className="grid grid-cols-2 gap-3">
            {(['farmers', 'batches'] as ImportType[]).map(t => (
              <button
                key={t}
                onClick={() => setImportType(t)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  importType === t ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <p className="font-medium text-sm capitalize">{t === 'farmers' ? 'Farmers & Farms' : 'Collection Batches'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t === 'farmers' ? 'Farmer registry + farm records' : 'Harvest / collection data (import farmers first)'}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Column aliases info */}
        {step === 'upload' && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <button
              onClick={() => setShowAliases(v => !v)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline w-full text-left"
            >
              <Info className="h-3 w-3" />
              KoBoToolbox / ODK / CommCare columns mapped automatically
              {showAliases ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </button>
            {showAliases && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                {[
                  ['respondent / farmer / name', 'farmer_name'],
                  ['phone / mobile / tel', 'phone'],
                  ['village / locality / town', 'community'],
                  ['_gps_latitude / gps latitude / lat', 'latitude'],
                  ['_gps_longitude / gps longitude / lng', 'longitude'],
                  ['farm size / ha / area / hectares', 'area_hectares'],
                  ['crop / crop type', 'commodity'],
                  ['_id / kobo id / farmerid', 'farmer_id'],
                ].map(([from, to]) => (
                  <div key={to} className="flex items-center gap-1 text-xs">
                    <span className="font-mono text-muted-foreground truncate">{from}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">{to}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload zone */}
        {step === 'upload' && (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Click to upload or drag and drop</p>
            <p className="text-sm text-muted-foreground mt-1">CSV or Excel (.csv, .xlsx) · Max 5,000 rows</p>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} data-testid="input-csv-file" />
          </div>
        )}

        {/* Column mapping */}
        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">{csvData.length} rows · map your columns below</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}><X className="h-4 w-4 mr-1" />Cancel</Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {mappings.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 p-2 bg-muted rounded text-sm font-mono truncate text-muted-foreground">{m.csvColumn}</div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={m.origintraceField} onValueChange={v => updateMapping(i, v)}>
                    <SelectTrigger className={`flex-1 ${m.origintraceField !== 'skip' ? 'border-primary/40' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map(f => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}{f.required ? ' *' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={() => { if (validateMappings()) setStep('preview'); }}>
                Preview <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Preview — first 5 rows</p>
              <Badge>{csvData.length} total rows</Badge>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {mappings.filter(m => m.origintraceField !== 'skip').map((m, i) => (
                      <TableHead key={i} className="text-xs">{fields.find(f => f.value === m.origintraceField)?.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, ri) => (
                    <TableRow key={ri}>
                      {mappings.map((m, ci) => m.origintraceField !== 'skip' && (
                        <TableCell key={ci} className="text-xs max-w-[150px] truncate">{row[ci]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
              <Button onClick={handleImport} disabled={isImporting} className="bg-emerald-600 hover:bg-emerald-700">
                {isImporting
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Importing…</>
                  : <><Upload className="h-4 w-4 mr-1" />Import {csvData.length} {importType === 'farmers' ? 'Farmers' : 'Batches'}</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {step === 'result' && result && (
          <div className="space-y-4 text-center py-4">
            {result.success > 0 && result.failed === 0
              ? <CheckCircle className="h-14 w-14 mx-auto text-emerald-500" />
              : <AlertCircle className="h-14 w-14 mx-auto text-amber-500" />
            }
            <div>
              <p className="text-2xl font-bold">{result.success} imported</p>
              {result.failed > 0 && <p className="text-red-500 text-sm mt-1">{result.failed} failed</p>}
            </div>
            {result.errors.length > 0 && (
              <div className="text-left bg-red-50 dark:bg-red-950 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="font-medium text-red-600 text-sm mb-1">Row errors:</p>
                {result.errors.slice(0, 20).map((e, i) => (
                  <p key={i} className="text-xs font-mono text-red-500">{e}</p>
                ))}
                {result.errors.length > 20 && <p className="text-xs text-red-400">…and {result.errors.length - 20} more</p>}
              </div>
            )}
            <Button onClick={reset} variant="outline">Import More</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
