/**
 * Border Detention Evidence Package PDF Generator
 *
 * Generates a single clean PDF that packages all traceability evidence
 * for a shipment — for use when a shipment is detained at a border.
 * Follows the certificate-pdf.ts / audit-report-pdf.ts pattern.
 *
 * Returns a base64 data URI string.
 */

export interface EvidenceShipmentData {
  id: string;
  shipment_code?: string;
  destination_country: string;
  status: string;
  total_weight_kg?: number;
  commodity?: string;
  container_number?: string;
  vessel_name?: string;
  bill_of_lading_number?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  etd?: string;
  eta?: string;
  prenotif_eu_traces: string;
  prenotif_eu_traces_ref?: string;
  created_at: string;
}

export interface EvidenceFarm {
  id: string;
  farmer_name: string;
  community: string;
  state: string;
  compliance_status: string;
  boundary_geo: boolean;
  deforestation_check_risk?: string;
}

export interface EvidenceBatch {
  id: string;
  batch_code: string;
  collection_date: string;
  total_weight: number;
  bag_count: number;
  farmer_name?: string;
}

export interface EvidenceLabResult {
  lab_provider: string;
  test_type: string;
  test_date: string;
  result: string;
  certificate_number?: string;
  certificate_expiry_date?: string;
}

export interface EvidenceDocument {
  doc_type: string;
  file_name: string;
  status: string;
  expiry_date?: string;
}

export interface EvidencePackageData {
  orgName: string;
  shipment: EvidenceShipmentData;
  farms: EvidenceFarm[];
  batches: EvidenceBatch[];
  labResults: EvidenceLabResult[];
  documents: EvidenceDocument[];
  packageToken: string;
  packageExpiresAt: string;
  generatedAt: string;
}

const HEADER_COLOR: [number, number, number] = [22, 101, 52];
const TEXT_DARK:    [number, number, number] = [17, 24, 39];
const TEXT_MID:     [number, number, number] = [75, 85, 99];
const BORDER_COLOR: [number, number, number] = [209, 213, 219];

export async function generateEvidencePdf(data: EvidencePackageData): Promise<string> {
  const { jsPDF } = await import('jspdf');
  // @ts-ignore
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;

  // ─── Cover ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, pageW, 48, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('OriginTrace — Traceability Evidence Package', margin, 13);

  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('Border Detention Evidence Package', margin, 24);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.orgName, margin, 33);
  doc.text(
    `Shipment: ${data.shipment.shipment_code ?? data.shipment.id.slice(0, 12)}  |  Destination: ${data.shipment.destination_country}`,
    margin,
    41
  );

  // Shipment summary box
  let y = 56;
  doc.setFillColor(240, 253, 244);
  doc.rect(margin, y, contentW, 38, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(margin, y, contentW, 38, 'S');

  const col1 = margin + 4;
  const col2 = margin + contentW / 2;
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Shipment Details', col1, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);

  const leftLines = [
    `Container:    ${data.shipment.container_number ?? '—'}`,
    `Vessel:       ${data.shipment.vessel_name ?? '—'}`,
    `B/L Number:   ${data.shipment.bill_of_lading_number ?? '—'}`,
    `POL:          ${data.shipment.port_of_loading ?? '—'}`,
    `POD:          ${data.shipment.port_of_discharge ?? '—'}`,
  ];
  const rightLines = [
    `ETD:          ${data.shipment.etd ?? '—'}`,
    `ETA:          ${data.shipment.eta ?? '—'}`,
    `Commodity:    ${data.shipment.commodity ?? '—'}`,
    `Weight:       ${data.shipment.total_weight_kg?.toLocaleString() ?? '—'} kg`,
    `TRACES Ref:   ${data.shipment.prenotif_eu_traces_ref ?? 'Not filed'}`,
  ];

  doc.text(leftLines,  col1,  y + 13);
  doc.text(rightLines, col2,  y + 13);

  // Evidence package metadata
  y += 46;
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MID);
  doc.text(
    `Evidence package generated: ${new Date(data.generatedAt).toUTCString()}  |  Expires: ${new Date(data.packageExpiresAt).toUTCString()}`,
    margin,
    y
  );
  doc.text(`Verification token: ${data.packageToken}`, margin, y + 5);

  // ─── Section 1: Farm Traceability ───────────────────────────────────────────
  doc.addPage();
  y = 20;
  y = sectionHeader(doc, '1. Farm Traceability Records', margin, y);

  if (data.farms.length === 0) {
    y = emptyNote(doc, 'No farms linked to this shipment.', margin, y);
  } else {
    // @ts-ignore
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Farmer', 'Community', 'State', 'GPS Boundary', 'Deforestation', 'Compliance']],
      body: data.farms.map((f) => [
        f.farmer_name,
        f.community,
        f.state,
        f.boundary_geo ? 'On file' : 'Missing',
        f.deforestation_check_risk ?? 'Pending',
        f.compliance_status.charAt(0).toUpperCase() + f.compliance_status.slice(1),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── Section 2: Batch Manifests ──────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }
  y = sectionHeader(doc, '2. Collection Batch Manifests', margin, y);
  if (data.batches.length === 0) {
    y = emptyNote(doc, 'No batches linked to this shipment.', margin, y);
  } else {
    // @ts-ignore
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Batch Code', 'Collection Date', 'Farmer', 'Weight (kg)', 'Bags']],
      body: data.batches.map((b) => [
        b.batch_code,
        b.collection_date,
        b.farmer_name ?? '—',
        b.total_weight.toLocaleString(),
        b.bag_count,
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── Section 3: Lab Test Results ─────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }
  y = sectionHeader(doc, '3. Laboratory Test Results', margin, y);
  if (data.labResults.length === 0) {
    y = emptyNote(doc, 'No lab results on file for this shipment.', margin, y);
  } else {
    // @ts-ignore
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Lab Provider', 'Test Type', 'Test Date', 'Result', 'Certificate', 'Expiry']],
      body: data.labResults.map((r) => [
        r.lab_provider,
        r.test_type.replace('_', ' '),
        r.test_date,
        r.result.charAt(0).toUpperCase() + r.result.slice(1),
        r.certificate_number ?? '—',
        r.certificate_expiry_date ?? '—',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── Section 4: Compliance Documents ─────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }
  y = sectionHeader(doc, '4. Compliance Documents', margin, y);
  if (data.documents.length === 0) {
    y = emptyNote(doc, 'No compliance documents uploaded for this shipment.', margin, y);
  } else {
    // @ts-ignore
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Document Type', 'File Name', 'Status', 'Expiry']],
      body: data.documents.map((d) => [
        d.doc_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        d.file_name,
        d.status.charAt(0).toUpperCase() + d.status.slice(1),
        d.expiry_date ?? 'N/A',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── Footer on all pages ──────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MID);
    doc.text(
      `${data.orgName} — Border Detention Evidence Package — Page ${i} of ${totalPages}`,
      pageW / 2,
      293,
      { align: 'center' }
    );
    doc.text('OriginTrace | origintrace.io', margin, 293);
    doc.text(data.generatedAt.slice(0, 10), pageW - margin, 293, { align: 'right' });
  }

  return doc.output('datauristring');
}

function sectionHeader(doc: any, title: string, x: number, y: number): number {
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(x, y, 210 - x * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 3, y + 5);
  return y + 12;
}

function emptyNote(doc: any, msg: string, x: number, y: number): number {
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(msg, x, y);
  return y + 8;
}
