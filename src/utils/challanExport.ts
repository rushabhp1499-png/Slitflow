import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';
import { BundleRecord, DeliveryChallan, MaterialInward } from '../types';
import { COMPANY, companyContactLine } from '../config/company';

// The plugin's default export is wrapped one level deeper when loaded as CommonJS.
const autoTable = ((autoTableImport as unknown as { default?: typeof autoTableImport }).default ??
  autoTableImport) as typeof autoTableImport;

const kg = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const orDash = (v?: string | null) => (v && v.trim() && v.trim() !== '—' ? v.trim() : '—');

// Bundles that were weighed and put on this challan (never invented).
export const challanBundles = (challan: DeliveryChallan, job: MaterialInward): BundleRecord[] =>
  challan.dispatchedBundles && challan.dispatchedBundles.length > 0
    ? challan.dispatchedBundles
    : (job.bundles || []).filter((b) => b.dispatchedInChallanId === challan.id || challan.selectedBundleIds?.includes(b.id));

// One line per slit width: bundles, rolls and net kg. Keeps big dispatches short.
export const sizeSummary = (bundles: BundleRecord[]) => {
  const byWidth = new Map<string, { label: string; bundles: number; rolls: number; netKg: number }>();
  for (const b of bundles) {
    const widths = (b.rollItems || []).map((r) => r.widthMm);
    const label = widths.length ? Array.from(new Set(widths)).map((w) => `${w} mm`).join(' + ') : b.rollsSummary || 'Mixed';
    const row = byWidth.get(label) || { label, bundles: 0, rolls: 0, netKg: 0 };
    row.bundles += 1;
    row.rolls += b.totalRollsCount || 0;
    row.netKg += b.netWeightKg;
    byWidth.set(label, row);
  }
  return Array.from(byWidth.values());
};

const bundleTare = (b: BundleRecord) => (b.paperCoreTareWeightKg || 0) + (b.otherPackagingTareKg || 0);

// Builds the delivery challan as one A4 page (also for 40-50 bundles).
// Only recorded data is printed: weighed bundles, entered vehicle / e-way bill numbers.
export function buildChallanPdf(challan: DeliveryChallan, job: MaterialInward): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = 14;

  // Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(COMPANY.name, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70);
  const addressLines = doc.splitTextToSize(COMPANY.address, 112);
  doc.text(addressLines, margin, y + 4.5);
  doc.text(companyContactLine(), margin, y + 4.5 + addressLines.length * 3.6);

  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('DELIVERY CHALLAN', pageW - margin, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Job work – Rule 55, CGST Rules 2017', pageW - margin, y + 4.5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(challan.challanNo, pageW - margin, y + 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Date: ${new Date(challan.challanDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` +
      (challan.revisionLabel && challan.revisionLabel !== 'Original' ? `  •  ${challan.revisionLabel}` : ''),
    pageW - margin,
    y + 14.5,
    { align: 'right' }
  );

  y += 19;
  doc.setDrawColor(20);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);

  // Consignee and dispatch details
  autoTable(doc, {
    startY: y + 2,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.4, valign: 'top', lineColor: [210, 214, 220] },
    headStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
    head: [['Consignee (Customer)', 'Dispatch Details']],
    body: [
      [
        [
          challan.customerName,
          orDash(challan.customerDeliveryAddress || challan.customerRegisteredAddress),
          `GSTIN: ${orDash(challan.customerGst)}`,
        ].join('\n'),
        [
          `Customer PO: ${orDash(challan.customerPoNo || job.customerPoNo)}    Our Job: ${job.jobNo}`,
          `Vehicle: ${orDash(challan.vehicleNo)}    Transporter: ${orDash(challan.transporterName)}`,
          `E-Way Bill: ${orDash(challan.eWayBillNo)}`,
          `Inward Ref: ${orDash(challan.incomingChallanRef)}`,
        ].join('\n'),
      ],
    ],
    columnStyles: { 0: { cellWidth: (pageW - margin * 2) / 2 } },
  });

  const bundles = challanBundles(challan, job);
  const returned = challan.returnedMaterial;
  const slitNet = bundles.reduce((s, b) => s + b.netWeightKg, 0);

  // Goods: one line per slit size, plus the returned unslit material
  const goodsRows: string[][] = sizeSummary(bundles).map((s, i) => [
    String(i + 1),
    `Slitted ${job.grade}, ${job.thickness} ${job.thicknessUnit} – ${s.label}`,
    String(s.bundles),
    s.rolls ? String(s.rolls) : '—',
    kg(s.netKg),
  ]);
  if (returned) {
    goodsRows.push([
      String(goodsRows.length + 1),
      `Unslit ${job.grade} returned (balance material)${returned.note ? ` – ${returned.note}` : ''}`,
      '—',
      returned.rolls ? String(returned.rolls) : '—',
      kg(returned.weightKg),
    ]);
  }
  autoTable(doc, {
    startY: lastY() + 3,
    margin: { left: margin, right: margin },
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 1.4 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    head: [['#', 'Description of goods', 'Bundles', 'Rolls', 'Net kg']],
    body: goodsRows,
    foot: [
      [
        '',
        'Total',
        String(bundles.length),
        '',
        { content: kg(slitNet + (returned?.weightKg || 0)), styles: { halign: 'right' } },
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 7 },
      2: { halign: 'right', cellWidth: 17 },
      3: { halign: 'right', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
    },
  });

  // Bundle list in three side-by-side columns: No. | Gross | Net
  if (bundles.length > 0) {
    const perCol = Math.ceil(bundles.length / 3);
    const rows: string[][] = [];
    for (let r = 0; r < perCol; r++) {
      const row: string[] = [];
      for (let c = 0; c < 3; c++) {
        const b = bundles[c * perCol + r];
        row.push(b ? b.bundleTag.replace('BNDL-', '') : '', b ? kg(b.grossWeightKg) : '', b ? kg(b.netWeightKg) : '');
      }
      rows.push(row);
    }
    const gross = bundles.reduce((s, b) => s + b.grossWeightKg, 0);
    const tare = bundles.reduce((s, b) => s + bundleTare(b), 0);
    const right = { halign: 'right' as const };
    autoTable(doc, {
      startY: lastY() + 3,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 7.3, cellPadding: 0.9, lineColor: [215, 219, 225] },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7.3 },
      head: [['Bundle', 'Gross kg', 'Net kg', 'Bundle', 'Gross kg', 'Net kg', 'Bundle', 'Gross kg', 'Net kg']],
      body: rows,
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: right,
        2: { ...right, fontStyle: 'bold' },
        3: { fontStyle: 'bold' },
        4: right,
        5: { ...right, fontStyle: 'bold' },
        6: { fontStyle: 'bold' },
        7: right,
        8: { ...right, fontStyle: 'bold' },
      },
    });
    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${bundles.length} bundles  •  Gross ${kg(gross)} kg  •  Tare (cores) ${kg(tare)} kg  •  Net ${kg(slitNet)} kg`,
      pageW - margin,
      lastY() + 4,
      { align: 'right' }
    );
    doc.setFont('helvetica', 'normal');
  }

  // Material balance
  y = (bundles.length > 0 ? lastY() + 6 : lastY() + 2) + 2;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.2, fontStyle: 'bold' },
    body: [
      [
        `Material received: ${kg(challan.totalOrderWeightKg)} kg`,
        `This challan: ${kg(challan.thisDispatchWeightKg)} kg`,
        `Balance with us: ${kg(challan.remainingBalanceWeightKg)} kg`,
      ],
    ],
  });

  // Terms and signatures
  y = lastY() + 4;
  if (y > 262) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(7.3);
  [
    'Goods returned after job work under Rule 55 of the CGST Rules, 2017. Not a sale.',
    'Please check bundle numbers and weights on receipt and report any difference within 24 hours.',
    `Subject to ${COMPANY.jurisdiction} jurisdiction.`,
  ].forEach((t, i) => doc.text(`${i + 1}. ${t}`, margin, y + i * 3.6));

  y += 20;
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + 55, y);
  doc.line(pageW - margin - 55, y, pageW - margin, y);
  doc.setFontSize(7.8);
  doc.text("Receiver's signature & seal", margin, y + 3.8);
  doc.text(`For ${COMPANY.name}`, pageW - margin, y + 3.8, { align: 'right' });
  doc.text(`Prepared by: ${orDash(challan.preparedBy)}`, pageW - margin, y + 7.4, { align: 'right' });

  return doc;
}

const fileName = (challan: DeliveryChallan) => `${challan.challanNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

export function downloadChallanPdf(challan: DeliveryChallan, job: MaterialInward) {
  buildChallanPdf(challan, job).save(fileName(challan));
}

// Opens the PDF in a new tab with the print dialog. Returns false if the browser blocked the tab.
export function printChallanPdf(challan: DeliveryChallan, job: MaterialInward): boolean {
  const doc = buildChallanPdf(challan, job);
  doc.autoPrint();
  const url = doc.output('bloburl') as unknown as string;
  return !!window.open(url, '_blank');
}
