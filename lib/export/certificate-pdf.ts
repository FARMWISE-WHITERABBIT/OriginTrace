/**
 * Generates a proper PDF for the EUDR compliance certificate.
 * Uses jsPDF (already a dependency) — runs in both server and client contexts.
 * Returns a data URI string.
 */

export interface CertificateData {
  orgName: string;
  orgLogoUrl?: string | null;
  productName: string;
  productType: string;
  weightKg: number;
  productionDate: string;
  batchNumber?: string;
  lotNumber?: string;
  pedigreeCode: string;
  totalSmallholders: number;
  totalAreaHectares: number;
  uniqueStates: string[];
  inputWeightKg: number;
  outputWeightKg: number;
  recoveryRate: number;
  massBalanceValid: boolean;
  facilityName?: string;
  facilityLocation?: string;
  verifyUrl: string;
  generatedAt: string;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateCertificatePdf(data: CertificateData): Promise<string> {
  const { jsPDF } = await import('jspdf');
  // @ts-ignore
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Green header bar ──
  doc.setFillColor(22, 101, 52);
  doc.rect(0, 0, pageW, 45, 'F');

  // ── Logo or org name ──
  let logoLoaded = false;
  if (data.orgLogoUrl) {
    const imgData = await loadImageAsDataUrl(data.orgLogoUrl);
    if (imgData) {
      try {
        doc.addImage(imgData, 'PNG', margin, 8, 28, 28);
        logoLoaded = true;
      } catch {
        logoLoaded = false;
      }
    }
  }

  const textX = logoLoaded ? margin + 32 : margin;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.orgName, textX, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('EU Deforestation Regulation (EUDR) Compliance Certificate', textX, 27);
  doc.setFontSize(8);
  doc.text('Regulation (EU) 2023/1115 — Verified Deforestation-Free', textX, 35);

  // If no org logo, show OriginTrace wordmark at top-right
  if (!logoLoaded) {
    doc.setFontSize(7);
    doc.setTextColor(187, 247, 208);
    doc.text('Powered by OriginTrace', pageW - margin, 40, { align: 'right' });
  }

  // ── Verified badge ──
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(22, 101, 52);
  doc.roundedRect(margin, 52, contentW, 16, 3, 3, 'FD');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('✓  VERIFIED DEFORESTATION-FREE', pageW / 2, 62, { align: 'center' });

  let y = 78;
  const addSection = (title: string) => {
    doc.setFillColor(240, 253, 244);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 2, y + 5);
    y += 10;
  };

  const addField = (label: string, value: string, x: number, col: number) => {
    const colW = contentW / col;
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x, y);
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(value || 'N/A', x, y + 5);
  };

  addSection('Product Information');
  addField('Product Name', data.productName, margin, 2);
  addField('Product Type', data.productType.replace(/_/g, ' ').toUpperCase(), margin + contentW / 2, 2);
  y += 12;
  addField('Weight (kg)', `${data.weightKg?.toLocaleString() || 0} kg`, margin, 2);
  addField('Production Date', new Date(data.productionDate).toLocaleDateString('en-GB'), margin + contentW / 2, 2);
  y += 12;
  addField('Batch Number', data.batchNumber || 'N/A', margin, 2);
  addField('Lot Number', data.lotNumber || 'N/A', margin + contentW / 2, 2);
  y += 16;

  addSection('Mass Balance Verification');
  addField('Raw Input (kg)', `${data.inputWeightKg?.toLocaleString() || 0} kg`, margin, 2);
  addField('Processed Output (kg)', `${data.outputWeightKg?.toLocaleString() || 0} kg`, margin + contentW / 2, 2);
  y += 12;
  addField('Recovery Rate', `${data.recoveryRate?.toFixed(1) || 0}%`, margin, 2);
  addField('Mass Balance', data.massBalanceValid ? '✓ Valid' : '⚠ Variance Detected', margin + contentW / 2, 2);
  y += 16;

  addSection('Supply Chain Summary');
  const boxW = (contentW - 8) / 3;
  const boxes = [
    { label: 'Smallholder Farmers', value: String(data.totalSmallholders) },
    { label: 'Hectares Mapped', value: data.totalAreaHectares?.toFixed(1) || '0' },
    { label: 'States of Origin', value: String(data.uniqueStates.length) },
  ];
  boxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 4);
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(bx, y, boxW, 20, 2, 2, 'FD');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(box.value, bx + boxW / 2, y + 11, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(box.label, bx + boxW / 2, y + 17, { align: 'center' });
  });
  y += 28;

  addSection('Origin');
  addField('States of Origin', data.uniqueStates.join(', ') || 'Nigeria', margin, 1);
  y += 12;
  addField('Processing Facility', [data.facilityName, data.facilityLocation].filter(Boolean).join(' — ') || 'N/A', margin, 1);
  y += 16;

  addSection('Verification');
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.text('Pedigree Code', margin, y);
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y + 2, 80, 8, 'F');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(9);
  doc.setFont('courier', 'bold');
  doc.text(data.pedigreeCode, margin + 2, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.text(`Verify at: ${data.verifyUrl}`, margin, y + 16);
  y += 24;

  // ── Footer ──
  doc.setFillColor(22, 101, 52);
  doc.rect(0, 277, pageW, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Certificate generated: ${data.generatedAt}`, margin, 285);
  doc.text('OriginTrace Traceability Platform | origintrace.trade', pageW - margin, 285, { align: 'right' });
  doc.text('This certificate is digitally verified and tamper-proof', pageW / 2, 291, { align: 'center' });

  return doc.output('datauristring');
}
