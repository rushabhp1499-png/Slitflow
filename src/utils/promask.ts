// ProMask (SLT-01) figures read from the QMS records Excel (QMS_Records.xlsx).
// The Excel stays the place where POs and Job Cards are typed; the portal only reads it:
//   PE-F-14 Purchase Order register (customer side)  -> open orders per size
//   PE-F-16 Job Card                                 -> what SLT-01 made, by day / operator / size
//   PE-F-35 Lot Traceability                         -> which job card rolls are dispatched (customer, invoice)

export interface PmPo {
  poNo: string;
  poDate: string;
  customer: string;
  product: string;
  size: string;
  grade: string; // A1 / Pro / Performance / Premium / Other
  widthCm: number | null;
  lengthM: number | null;
  orderedRolls: number;
  unit: string;
  deliveryDate: string;
  invoiceNo: string;
  dispatchDate: string;
  status: string;
  open: boolean;
}

export interface PmRun {
  date: string;
  machine: string;
  operator: string;
  reelNo: string;
  grade: string; // as normalised for matching
  gradeAsTyped: string;
  masterWidthCm: number;
  gsm: number;
  widthCm: number;
  lengthM: number;
  barcode: string;
  accepted: number;
  rejected: number;
  reason: string;
  customer: string;
  invoiceNo: string;
  dispatchDate: string;
}

export interface PmImport {
  fileName: string;
  importedAt: string;
  importedBy: string;
  pos: PmPo[];
  runs: PmRun[];
  warnings: string[];
}

type Row = unknown[];

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());
const num = (v: unknown) => {
  if (typeof v === 'number') return v;
  const n = parseFloat(text(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Excel date serial (or a typed date) -> YYYY-MM-DD
const isoDate = (v: unknown): string => {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const s = text(v);
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
};

// The job card types the supplier "Navkar" in the grade column for Performance paper.
export const normaliseGrade = (s: string): string => {
  const t = s.toLowerCase();
  if (/\bpro\b/.test(t)) return 'Pro';
  if (/\ba1\b/.test(t)) return 'A1';
  if (t.includes('perform') || t.includes('navkar')) return 'Performance';
  if (t.includes('premium')) return 'Premium';
  return s.trim() || 'Other';
};

// "110 cm x 200 mtr", "45cm x 200 mtr", "900 mm x 25 mtr" -> width in cm and length in m
export const parseSize = (s: string): { widthCm: number | null; lengthM: number | null } => {
  const m = s.match(/(\d+(?:\.\d+)?)\s*(mm|cm)?\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return { widthCm: null, lengthM: null };
  const w = parseFloat(m[1]);
  return { widthCm: m[2]?.toLowerCase() === 'mm' ? w / 10 : w, lengthM: parseFloat(m[3]) };
};

export const skuKey = (grade: string, widthCm: number | null, lengthM: number | null) =>
  `${grade}|${widthCm ?? '?'}|${lengthM ?? '?'}`;

export const skuLabel = (grade: string, widthCm: number | null, lengthM: number | null) =>
  `${grade} ${widthCm ?? '?'} cm × ${lengthM ?? '?'} m`;

// Paper weight of one roll in kg: width (m) x length (m) x GSM / 1000 (same as PE-F-46).
export const rollKg = (widthCm: number, lengthM: number, gsm: number) => (widthCm / 100) * lengthM * gsm / 1000;

// Finds the header row (the one containing `marker`) and maps each wanted heading to its first column.
const locate = (rows: Row[], marker: string, wanted: Record<string, string>) => {
  const headerIdx = rows.findIndex(r => r.some(c => text(c).toLowerCase().startsWith(marker.toLowerCase())));
  if (headerIdx === -1) return null;
  const header = rows[headerIdx].map(c => text(c).toLowerCase());
  const cols: Record<string, number> = {};
  for (const [key, label] of Object.entries(wanted)) {
    cols[key] = header.findIndex(h => h.startsWith(label.toLowerCase()));
  }
  return { headerIdx, cols };
};

const cell = (r: Row, i: number) => (i >= 0 ? r[i] : null);

export async function readQmsWorkbook(file: File, importedBy: string): Promise<PmImport> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = (prefix: string) => {
    const name = wb.SheetNames.find(n => n.replace(/\s+/g, '').toUpperCase().startsWith(prefix));
    return name ? (XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null }) as Row[]) : null;
  };
  const warnings: string[] = [];

  // --- PE-F-16 Job Card ---------------------------------------------------
  const f16 = sheet('PE-F-16');
  if (!f16) throw new Error('This file has no PE-F-16 Job Card sheet. Pick QMS_Records.xlsx.');
  const jc = locate(f16, 'Barcode', {
    date: 'Date of Production',
    machine: 'Machine Code',
    operator: 'Operator',
    reel: 'Supplier Master Reel',
    grade: 'Paper Grade',
    master: 'Master Reel Width',
    gsm: 'GSM',
    width: 'Finished Roll Width',
    length: 'Finished Roll Length',
    barcode: 'Barcode',
    accepted: 'No. of Accepted',
    rejected: 'No. of Rejected',
    reason: 'Reason of Rejection',
  });
  if (!jc) throw new Error('Could not find the header row of the PE-F-16 Job Card sheet.');
  const runs: PmRun[] = [];
  for (const r of f16.slice(jc.headerIdx + 1)) {
    const date = isoDate(cell(r, jc.cols.date));
    const accepted = num(cell(r, jc.cols.accepted));
    const rejected = num(cell(r, jc.cols.rejected));
    if (!date || accepted + rejected === 0) continue;
    const gradeAsTyped = text(cell(r, jc.cols.grade));
    runs.push({
      date,
      machine: text(cell(r, jc.cols.machine)),
      operator: text(cell(r, jc.cols.operator)),
      reelNo: text(cell(r, jc.cols.reel)),
      grade: normaliseGrade(gradeAsTyped),
      gradeAsTyped,
      masterWidthCm: num(cell(r, jc.cols.master)),
      gsm: num(cell(r, jc.cols.gsm)),
      widthCm: num(cell(r, jc.cols.width)),
      lengthM: num(cell(r, jc.cols.length)),
      barcode: text(cell(r, jc.cols.barcode)),
      accepted,
      rejected,
      reason: text(cell(r, jc.cols.reason)),
      customer: '',
      invoiceNo: '',
      dispatchDate: '',
    });
  }

  // --- PE-F-35 Lot Traceability: dispatch of each barcode ------------------
  const f35 = sheet('PE-F-35');
  if (f35) {
    const lt = locate(f35, 'Barcode', { barcode: 'Barcode', customer: 'Customer', invoice: 'Invoice No', dispatch: 'Dispatch Date' });
    if (lt) {
      const byBarcode = new Map<string, { customer: string; invoiceNo: string; dispatchDate: string }>();
      for (const r of f35.slice(lt.headerIdx + 1)) {
        const bc = text(cell(r, lt.cols.barcode));
        const invoiceNo = text(cell(r, lt.cols.invoice));
        if (bc && invoiceNo) {
          byBarcode.set(bc, {
            customer: text(cell(r, lt.cols.customer)),
            invoiceNo,
            dispatchDate: isoDate(cell(r, lt.cols.dispatch)),
          });
        }
      }
      for (const run of runs) Object.assign(run, byBarcode.get(run.barcode) || {});
    }
  } else {
    warnings.push('No PE-F-35 Lot Traceability sheet: finished stock could not be worked out.');
  }

  // --- PE-F-14 customer POs -------------------------------------------------
  const pos: PmPo[] = [];
  const f14 = sheet('PE-F-14');
  if (f14) {
    const po = locate(f14, 'Customer PO No', {
      poNo: 'Customer PO No',
      poDate: 'PO Date',
      customer: 'Customer Name',
      product: 'Product / Grade',
      size: 'Size / Specification',
      qty: 'Ordered Qty',
      unit: 'Unit',
      delivery: 'Required Delivery Date',
      invoice: 'Sales Invoice No',
      dispatch: 'Dispatch Date',
      status: 'PO Status',
    });
    if (po) {
      for (const r of f14.slice(po.headerIdx + 1)) {
        const poNo = text(cell(r, po.cols.poNo));
        const customer = text(cell(r, po.cols.customer));
        if (!poNo || !customer) continue;
        const product = text(cell(r, po.cols.product));
        const size = text(cell(r, po.cols.size));
        const unit = text(cell(r, po.cols.unit));
        const status = text(cell(r, po.cols.status));
        const invoiceNo = text(cell(r, po.cols.invoice));
        const { widthCm, lengthM } = parseSize(size);
        pos.push({
          poNo,
          poDate: isoDate(cell(r, po.cols.poDate)),
          customer,
          product,
          size,
          grade: normaliseGrade(product),
          widthCm,
          lengthM,
          orderedRolls: /roll/i.test(unit) || !unit ? num(cell(r, po.cols.qty)) : 0,
          unit,
          deliveryDate: isoDate(cell(r, po.cols.delivery)),
          invoiceNo,
          dispatchDate: isoDate(cell(r, po.cols.dispatch)),
          status,
          open: !invoiceNo && !/dispatched|closed|cancel/i.test(status),
        });
        if (unit && !/roll/i.test(unit)) warnings.push(`PO ${poNo}: ordered in ${unit}, not rolls, so it is not counted in "To run".`);
        if (widthCm === null) warnings.push(`PO ${poNo}: size "${size}" could not be read as width x length.`);
      }
    }
  } else {
    warnings.push('No PE-F-14 Purchase Order sheet: open orders are not shown.');
  }

  return { fileName: file.name, importedAt: new Date().toISOString(), importedBy, pos, runs, warnings };
}
