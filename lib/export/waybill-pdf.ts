import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface WaybillData {
  batchId: string;
  commodity: string;
  farmerName: string;
  community: string;
  bagCount: number;
  totalWeight: number;
  destination: string;
  vehicleRef?: string;
  driverPhone?: string;
  collectedBy: string;
  collectionDate: string;
  dispatchDate?: string;
  orgName: string;
  orgLogoUrl?: string | null;
  bags?: Array<{ serial: string; weight: number; grade: string }>;
  contributions?: Array<{ farmerName: string; community: string; bagCount: number; weightKg: number; complianceStatus: string }>;
}

export function generateWaybillPDF(data: WaybillData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // ── Header ──
  doc.setFillColor(22, 101, 52);
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Logo placeholder or org name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.orgName.toUpperCase(), margin, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('DISPATCH WAYBILL', pageWidth - margin, 14, { align: 'right' });

  // Batch ID under header
  doc.setFontSize(8);
  doc.setTextColor(187, 247, 208);
  doc.text(`Batch: ${data.batchId}`, margin, 25);
  doc.text(data.dispatchDate || data.collectionDate, pageWidth - margin, 25, { align: 'right' });

  // "Powered by OriginTrace" if no custom logo
  if (!data.orgLogoUrl) {
    doc.setFontSize(7);
    doc.setTextColor(187, 247, 208);
    doc.text('Powered by OriginTrace', pageWidth / 2, 32, { align: 'center' });
  }

  let y = 46;

  // ── Logistics details grid ──
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const fields: [string, string, number][] = [
    ['Commodity', data.commodity || '-', margin],
    ['Destination', data.destination || '-', pageWidth / 2],
    ['Vehicle Ref', data.vehicleRef || '-', margin],
    ['Driver Phone', data.driverPhone || '-', pageWidth / 2],
    ['Collected By', data.collectedBy, margin],
    ['Collection Date', data.collectionDate, pageWidth / 2],
  ];

  for (let i = 0; i < fields.length; i += 2) {
    const [label1, val1, x1] = fields[i];
    const [label2, val2, x2] = fields[i + 1] || ['', '', pageWidth / 2];
    doc.setFont('helvetica', 'bold');
    doc.text(`${label1}:`, x1, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val1, x1 + 38, y);
    if (label2) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label2}:`, x2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val2, x2 + 38, y);
    }
    y += 8;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Farmer contributions or batch details ──
  if (data.contributions && data.contributions.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FARMER CONTRIBUTIONS', margin, y);
    y += 5;

    doc.autoTable({
      startY: y,
      head: [['Farmer', 'Community', 'Bags', 'Weight (kg)', 'Status']],
      body: data.contributions.map(c => [
        c.farmerName, c.community, c.bagCount.toString(),
        c.weightKg.toFixed(1),
        c.complianceStatus === 'verified' ? 'Verified' : 'Pending',
      ]),
      foot: [['TOTAL', '', data.bagCount.toString(), data.totalWeight.toFixed(1), '']],
      theme: 'grid',
      headStyles: { fillColor: [22, 101, 52], fontSize: 9 },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BATCH DETAILS', margin, y);
    y += 5;
    doc.autoTable({
      startY: y,
      head: [['Detail', 'Value']],
      body: [
        ['Primary Farmer', data.farmerName],
        ['Community', data.community],
        ['Total Bags', data.bagCount.toString()],
        ['Total Weight', `${data.totalWeight.toFixed(1)} kg`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [22, 101, 52], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Bag manifest ──
  if (data.bags && data.bags.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BAG MANIFEST', margin, y);
    y += 5;
    doc.autoTable({
      startY: y,
      head: [['#', 'Serial', 'Weight (kg)', 'Grade']],
      body: data.bags.map((bag, i) => [(i + 1).toString(), bag.serial || '-', bag.weight.toFixed(1), bag.grade]),
      theme: 'grid',
      headStyles: { fillColor: [22, 101, 52], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Signatures ──
  const sigY = Math.max(y + 10, 230);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.line(margin, sigY, margin + 60, sigY);
  doc.text('Sender Signature', margin, sigY + 5);
  doc.line(pageWidth / 2, sigY, pageWidth / 2 + 60, sigY);
  doc.text('Receiver Signature', pageWidth / 2, sigY + 5);

  // ── Footer ──
  const footerY = doc.internal.pageSize.height - 12;
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated by OriginTrace | ${data.orgName} | Batch: ${data.batchId} | ${new Date().toLocaleDateString()}`,
    pageWidth / 2, footerY, { align: 'center' }
  );

  return doc;
}
