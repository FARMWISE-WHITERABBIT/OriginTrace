interface BatchCSVRow {
  batchId: string;
  farmerName: string;
  community: string;
  commodity: string;
  bagCount: number;
  totalWeight: number;
  status: string;
  collectionDate: string;
  collectedBy: string;
}

interface BagCSVRow {
  batchId: string;
  serial: string;
  weight: number;
  grade: string;
  farmerName: string;
}

function escapeCSV(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCSV(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export function generateBatchManifestCSV(batches: BatchCSVRow[]): string {
  const headers = ['Batch ID', 'Farmer', 'Community', 'Commodity', 'Bags', 'Weight (kg)', 'Status', 'Collection Date', 'Collected By'];
  const rows = batches.map(b => [
    b.batchId,
    b.farmerName,
    b.community,
    b.commodity,
    b.bagCount,
    b.totalWeight,
    b.status,
    b.collectionDate,
    b.collectedBy
  ]);
  return arrayToCSV(headers, rows);
}

export function generateBagManifestCSV(bags: BagCSVRow[]): string {
  const headers = ['Batch ID', 'Serial', 'Weight (kg)', 'Grade', 'Farmer'];
  const rows = bags.map(b => [
    b.batchId,
    b.serial,
    b.weight,
    b.grade,
    b.farmerName
  ]);
  return arrayToCSV(headers, rows);
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
