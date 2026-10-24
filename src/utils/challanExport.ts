import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';

// The plugin's default export is wrapped one level deeper when loaded as CommonJS.
const autoTable = ((autoTableImport as unknown as { default?: typeof autoTableImport }).default ??
  autoTableImport) as typeof autoTableImport;
import { DeliveryChallan, MaterialInward } from '../types';
import { COMPANY, companyContactLine } from '../config/company';

const kg = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const orDash = (v?: string | null) => (v && v.trim() && v.trim() !== '—' ? v.trim() : '—');

// Builds the delivery challan as an A4 PDF and downloads it.
// Only recorded data is printed: weighed bundles, entered vehicle / e-way bill numbers.
export function downloadChallanPdf(challan: DeliveryChallan, job: MaterialInward) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(COMPANY.name, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70);
  const addressLines = doc.splitTextToSize(COMPANY.address, 110);
  doc.text(addressLines, margin, y + 5);
  doc.text(companyContactLine(), margin, y + 5 + addressLines.length * 4);

  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DELIVERY CHALLAN', pageW - margin, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Job work – Rule 55, CGST Rules 2017', pageW - margin, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(challan.challanNo, pageW - margin, y + 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Date: ${new Date(challan.challanDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    pageW - margin,
    y + 16,
    { align: 'right' }
  );
  if (challan.revisionLabel && challan.revisionLabel !== 'Original') {
    doc.text(challan.revisionLabel, pageW - margin, y + 20, { align: 'right' });
  }

  y += 26;
  doc.setDrawColor(20);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 3;

  // Consignee and dispatch details, side by side
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.8, valign: 'top' },
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
          `Customer PO: ${orDash(challan.customerPoNo || job.customerPoNo)}`,
          `Our Job No: ${job.jobNo}`,
          `Vehicle No: ${orDash(challan.vehicleNo)}`,
          `Transporter: ${orDash(challan.transporterName)}`,
          `E-Way Bill: ${orDash(challan.eWayBillNo)}`,
          `Inward Ref: ${orDash(challan.incomingChallanRef)}`,
        ].join('\n'),
      ],
    ],
    columnStyles: { 0: { cellWidth: (pageW - margin * 2) / 2 } },
  });

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Material line
  const widths = job.outputDetails?.slitCuts?.length
    ? job.outputDetails.slitCuts.map((c) => `${c.widthMm} mm`).join(', ')
    : (job.requestedSlitSizes || []).map((s) => `${s.widthMm} mm`).join(', ');
  autoTable(doc, {
    startY: lastY() + 4,
    margin: { left: margin, right: margin },
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    head: [['#', 'Description', 'Bundles', 'Net Weight (kg)']],
    body: [
      [
        '1',
        `Slitted ${job.grade}, ${job.thickness} ${job.thicknessUnit}${widths ? `\nSlit widths: ${widths}` : ''}`,
        String(challan.totalBundles),
        kg(challan.thisDispatchWeightKg),
      ],
    ],
    columnStyles: { 0: { cellWidth: 8 }, 2: { halign: 'right', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 32 } },
  });

  // Bundle schedule: only bundles that were actually weighed and put on this challan
  const bundles =
    challan.dispatchedBundles && challan.dispatchedBundles.length > 0
      ? challan.dispatchedBundles
      : (job.bundles || []).filter(
          (b) => b.dispatchedInChallanId === challan.id || challan.selectedBundleIds?.includes(b.id)
        );
  if (bundles.length > 0) {
    const gross = bundles.reduce((s, b) => s + b.grossWeightKg, 0);
    const tare = bundles.reduce((s, b) => s + (b.paperCoreTareWeightKg || 0) + (b.otherPackagingTareKg || 0), 0);
    const net = bundles.reduce((s, b) => s + b.netWeightKg, 0);
    autoTable(doc, {
      startY: lastY() + 4,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 7.8, cellPadding: 1.4 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255 },
      head: [['#', 'Bundle', 'Contents', 'Core', 'Gross (kg)', 'Tare (kg)', 'Net (kg)']],
      body: bundles.map((b, i) => [
        String(i + 1),
        b.bundleTag,
        b.rollsSummary || `${b.totalRollsCount} rolls`,
        b.coreType === 'paper_core' ? 'Paper' : b.coreType === 'pvc_core' ? 'Plastic' : '—',
        kg(b.grossWeightKg),
        kg((b.paperCoreTareWeightKg || 0) + (b.otherPackagingTareKg || 0)),
        kg(b.netWeightKg),
      ]),
      foot: [
        [
          '',
          '',
          `Total ${bundles.length} bundles`,
          '',
          { content: kg(gross), styles: { halign: 'right' } },
          { content: kg(tare), styles: { halign: 'right' } },
          { content: kg(net), styles: { halign: 'right' } },
        ],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 7 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  // Material balance
  autoTable(doc, {
    startY: lastY() + 4,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.5, fontStyle: 'bold' },
    body: [
      [
        `Material received: ${kg(challan.totalOrderWeightKg)} kg`,
        `This challan: ${kg(challan.thisDispatchWeightKg)} kg`,
        `Balance with us: ${kg(challan.remainingBalanceWeightKg)} kg`,
      ],
    ],
  });

  // Terms and signatures (move to a new page if there is no room)
  y = lastY() + 6;
  if (y > 245) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Terms', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const terms = [
    'Goods returned after job work under Rule 55 of the CGST Rules, 2017. Not a sale.',
    'Please check bundle tags and weights on receipt and report any difference within 24 hours.',
    `Subject to ${COMPANY.jurisdiction} jurisdiction.`,
  ];
  terms.forEach((t, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${t}`, pageW - margin * 2);
    doc.text(lines, margin, y + 4.5);
    y += 4 * lines.length;
  });

  y += 22;
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + 60, y);
  doc.line(pageW - margin - 60, y, pageW - margin, y);
  doc.setFontSize(8);
  doc.text("Receiver's signature & seal", margin, y + 4);
  doc.text(`For ${COMPANY.name}`, pageW - margin, y + 4, { align: 'right' });
  doc.text(`Prepared by: ${orDash(challan.preparedBy)}`, pageW - margin, y + 8, { align: 'right' });

  doc.save(`${challan.challanNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}
