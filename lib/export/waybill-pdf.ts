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
  bags?: Array<{
    serial: string;
    weight: number;
    grade: string;
  }>;
  contributions?: Array<{
    farmerName: string;
    community: string;
    bagCount: number;
    weightKg: number;
    complianceStatus: string;
  }>;
}

export function generateWaybillPDF(data: WaybillData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.orgName.toUpperCase(), margin, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('DISPATCH WAYBILL', pageWidth - margin, 25, { align: 'right' });

  doc.setDrawColor(45, 90, 39);
  doc.setLineWidth(0.5);
  doc.line(margin, 30, pageWidth - margin, 30);

  let y = 40;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Batch ID:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.batchId, margin + 40, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dispatchDate || data.collectionDate, pageWidth / 2 + 25, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Commodity:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.commodity || '-', margin + 40, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Destination:', pageWidth / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.destination || '-', pageWidth / 2 + 40, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.vehicleRef || '-', margin + 40, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Driver:', pageWidth / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.driverPhone || '-', pageWidth / 2 + 25, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Collected By:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.collectedBy, margin + 48, y);

  y += 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  if (data.contributions && data.contributions.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FARMER CONTRIBUTIONS', margin, y);
    y += 6;

    doc.autoTable({
      startY: y,
      head: [['Farmer', 'Community', 'Bags', 'Weight (kg)', 'Status']],
      body: data.contributions.map(c => [
        c.farmerName,
        c.community,
        c.bagCount.toString(),
        c.weightKg.toFixed(1),
        c.complianceStatus === 'verified' ? 'Verified' : 'Pending'
      ]),
      foot: [['TOTAL', '', data.bagCount.toString(), data.totalWeight.toFixed(1), '']],
      theme: 'grid',
      headStyles: { fillColor: [45, 90, 39], fontSize: 9 },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BATCH DETAILS', margin, y);
    y += 6;

    const detailRows = [
      ['Primary Farmer', data.farmerName],
      ['Community', data.community],
      ['Total Bags', data.bagCount.toString()],
      ['Total Weight', `${data.totalWeight.toFixed(1)} kg`],
    ];

    doc.autoTable({
      startY: y,
      head: [['Detail', 'Value']],
      body: detailRows,
      theme: 'grid',
      headStyles: { fillColor: [45, 90, 39], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  if (data.bags && data.bags.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BAG MANIFEST', margin, y);
    y += 6;

    doc.autoTable({
      startY: y,
      head: [['#', 'Serial', 'Weight (kg)', 'Grade']],
      body: data.bags.map((bag, i) => [
        (i + 1).toString(),
        bag.serial || '-',
        bag.weight.toFixed(1),
        bag.grade
      ]),
      theme: 'grid',
      headStyles: { fillColor: [45, 90, 39], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  const sigY = Math.max(y + 10, 230);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  doc.line(margin, sigY, margin + 60, sigY);
  doc.text('Sender Signature', margin, sigY + 5);

  doc.line(pageWidth / 2, sigY, pageWidth / 2 + 60, sigY);
  doc.text('Receiver Signature', pageWidth / 2, sigY + 5);

  const footerY = doc.internal.pageSize.height - 15;
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated by OriginTrace on ${new Date().toLocaleDateString()} | Batch: ${data.batchId}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  return doc;
}
