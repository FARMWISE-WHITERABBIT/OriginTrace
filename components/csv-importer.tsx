'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileSpreadsheet, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  X 
} from 'lucide-react';

interface ColumnMapping {
  csvColumn: string;
  origintraceField: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const ORIGINTRACE_FIELDS = [
  { value: 'farmer_name', label: 'Farmer Name', required: true },
  { value: 'phone_number', label: 'Phone Number', required: false },
  { value: 'community', label: 'Community', required: true },
  { value: 'state', label: 'State', required: true },
  { value: 'lga', label: 'LGA', required: true },
  { value: 'farm_size', label: 'Farm Size (ha)', required: false },
  { value: 'commodity', label: 'Primary Commodity', required: false },
  { value: 'national_id', label: 'National ID', required: false },
  { value: 'skip', label: '-- Skip this column --', required: false },
];

interface CSVImporterProps {
  onImport: (data: Record<string, string>[]) => Promise<ImportResult>;
}

export function CSVImporter({ onImport }: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'result'>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file',
        variant: 'destructive'
      });
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      
      if (parsed.length < 2) {
        toast({
          title: 'Empty File',
          description: 'The CSV file appears to be empty',
          variant: 'destructive'
        });
        return;
      }

      const fileHeaders = parsed[0];
      const data = parsed.slice(1);
      
      setHeaders(fileHeaders);
      setCsvData(data);
      
      const autoMappings: ColumnMapping[] = fileHeaders.map(header => {
        const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');
        
        let matchedField = 'skip';
        
        if (normalizedHeader.includes('name') || normalizedHeader.includes('farmer')) {
          matchedField = 'farmer_name';
        } else if (normalizedHeader.includes('phone') || normalizedHeader.includes('mobile')) {
          matchedField = 'phone_number';
        } else if (normalizedHeader.includes('community') || normalizedHeader.includes('village')) {
          matchedField = 'community';
        } else if (normalizedHeader.includes('state')) {
          matchedField = 'state';
        } else if (normalizedHeader.includes('lga') || normalizedHeader.includes('localgovt')) {
          matchedField = 'lga';
        } else if (normalizedHeader.includes('size') || normalizedHeader.includes('hectare') || normalizedHeader.includes('area')) {
          matchedField = 'farm_size';
        } else if (normalizedHeader.includes('commodity') || normalizedHeader.includes('crop')) {
          matchedField = 'commodity';
        } else if (normalizedHeader.includes('nationalid') || normalizedHeader.includes('nin')) {
          matchedField = 'national_id';
        }

        return { csvColumn: header, origintraceField: matchedField };
      });

      setMappings(autoMappings);
      setStep('map');
    };

    reader.readAsText(selectedFile);
  };

  const updateMapping = (index: number, field: string) => {
    const newMappings = [...mappings];
    newMappings[index].origintraceField = field;
    setMappings(newMappings);
  };

  const validateMappings = (): boolean => {
    const requiredFields = ORIGINTRACE_FIELDS.filter(f => f.required).map(f => f.value);
    const mappedFields = mappings.map(m => m.origintraceField);
    
    for (const required of requiredFields) {
      if (!mappedFields.includes(required)) {
        toast({
          title: 'Missing Required Field',
          description: `Please map the "${ORIGINTRACE_FIELDS.find(f => f.value === required)?.label}" field`,
          variant: 'destructive'
        });
        return false;
      }
    }
    return true;
  };

  const proceedToPreview = () => {
    if (validateMappings()) {
      setStep('preview');
    }
  };

  const getMappedData = (): Record<string, string>[] => {
    return csvData.map(row => {
      const record: Record<string, string> = {};
      mappings.forEach((mapping, index) => {
        if (mapping.origintraceField !== 'skip') {
          record[mapping.origintraceField] = row[index] || '';
        }
      });
      return record;
    });
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const data = getMappedData();
      const importResult = await onImport(data);
      setResult(importResult);
      setStep('result');
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'An error occurred during import',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMappings([]);
    setStep('upload');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Farmer Import
        </CardTitle>
        <CardDescription>
          Upload a CSV file to import legacy farmer data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'upload' && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-csv-file"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Expected columns:</p>
              <div className="flex flex-wrap gap-1">
                {ORIGINTRACE_FIELDS.filter(f => f.value !== 'skip').map(field => (
                  <Badge key={field.value} variant={field.required ? 'default' : 'secondary'}>
                    {field.label} {field.required && '*'}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">{csvData.length} rows detected</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>

            <div className="space-y-3">
              <Label>Map your CSV columns to OriginTrace fields:</Label>
              {mappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1 p-2 bg-muted rounded text-sm font-mono truncate">
                    {mapping.csvColumn}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select
                    value={mapping.origintraceField}
                    onValueChange={(value) => updateMapping(index, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGINTRACE_FIELDS.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={proceedToPreview}>
                Preview Import
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Preview: First 5 rows</p>
              <Badge>{csvData.length} total rows</Badge>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {mappings.filter(m => m.origintraceField !== 'skip').map((m, i) => (
                      <TableHead key={i}>
                        {ORIGINTRACE_FIELDS.find(f => f.value === m.origintraceField)?.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {mappings.map((mapping, colIndex) => 
                        mapping.origintraceField !== 'skip' && (
                          <TableCell key={colIndex}>{row[colIndex]}</TableCell>
                        )
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Import {csvData.length} Farmers
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4 text-center py-4">
            {result.success > 0 ? (
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            ) : (
              <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
            )}
            
            <div>
              <p className="text-2xl font-bold">{result.success} imported</p>
              {result.failed > 0 && (
                <p className="text-red-500">{result.failed} failed</p>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="text-left bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                <p className="font-medium text-red-600 mb-2">Errors:</p>
                <ul className="text-sm text-red-500 space-y-1">
                  {result.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>...and {result.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <Button onClick={reset}>Import More</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
