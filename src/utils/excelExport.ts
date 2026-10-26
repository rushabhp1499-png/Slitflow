import { FloorStaff, Machine, MaterialInward, ProductionStatus } from '../types';
import { challanBundles } from './challanExport';

export const STATUS_LABEL: Record<ProductionStatus, string> = {
  received: 'Received',
  pending_production: 'In queue',
  in_production: 'Under slitting',
  slitting_completed: 'Slitting done',
  ready_for_dispatch: 'Ready to dispatch',
  partially_dispatched: 'Part dispatched',
  dispatched: 'Dispatched',
  po_closed: 'PO closed',
};

const PO_STATUS_LABEL: Record<MaterialInward['poStatus'], string> = {
  open: 'Open',
  partially_dispatched: 'Part dispatched',
  closed: 'Closed',
};

const CORE_LABEL: Record<string, string> = { paper_core: 'Paper core', pvc_core: 'PVC core', none: 'No core' };

const kg = (n: number | undefined) => Math.round((n || 0) * 100) / 100;
const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : '');
const dateTime = (iso: string | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

// One workbook with three sheets: orders, challans, bundles. Everything comes from the database rows already loaded.
export async function exportJobsToExcel(jobs: MaterialInward[], machines: Machine[], staff: FloorStaff[]) {
  // Loaded only when someone exports, so the dashboard doesn't carry it.
  const XLSX = await import('xlsx');
  const machineName = (id?: string) => machines.find((m) => m.id === id)?.number || '';
  const staffName = (id?: string) => staff.find((s) => s.id === id)?.name || '';
  const sorted = [...jobs].sort((a, b) => (b.receivedDate || '').localeCompare(a.receivedDate || ''));

  const orders = sorted.map((j) => {
    const activeChallans = (j.challans || []).filter((c) => !c.isSuperseded);
    return {
      'PO No': j.customerPoNo,
      'Job No': j.jobNo,
      Customer: j.customerName,
      'Received On': day(j.receivedDate),
      'Inward Challan': j.inwardChallanNo,
      Vehicle: j.vehicleNo,
      Material: j.grade,
      Thickness: j.thickness ? `${j.thickness} ${j.thicknessUnit}` : '',
      'Width (mm)': j.incomingWidth,
      'Incoming (kg)': kg(j.incomingWeight),
      'Coils / Rolls': j.coilsOrRollsCount,
      'Slit Sizes': (j.requestedSlitSizes || []).map((s) => `${s.widthMm} mm – ${kg(s.quantityKg)} kg`).join(', '),
      Stage: STATUS_LABEL[j.status] || j.status,
      Machine: machineName(j.assignment?.machineId),
      Operator: staffName(j.assignment?.operatorId),
      'Delivery Date (EDD)': j.estimatedDeliveryDate || '',
      'Bundles Weighed': (j.bundles || []).filter((b) => !b.isVoided).length,
      'Dispatched (kg)': kg(j.dispatchedWeightKg),
      'Balance (kg)': kg(Math.max(0, j.incomingWeight - (j.dispatchedWeightKg || 0))),
      Challans: activeChallans.map((c) => c.challanNo).join(', '),
      'PO Status': PO_STATUS_LABEL[j.poStatus] || j.poStatus,
      'Closed On': day(j.poClosedAt),
    };
  });

  const challans = sorted.flatMap((j) =>
    (j.challans || [])
      .filter((c) => !c.isSuperseded)
      .map((c) => {
        const returned = c.returnedMaterial?.weightKg || 0;
        return {
          'Challan No': c.challanNo,
          Date: day(c.challanDate),
          'PO No': c.customerPoNo || j.customerPoNo,
          Customer: c.customerName,
          Vehicle: c.vehicleNo,
          Transporter: c.transporterName,
          'E-way Bill': c.eWayBillNo || '',
          Bundles: challanBundles(c, j).length || c.totalBundles,
          'Slit Net (kg)': kg(c.slitNetWeightKg ?? c.thisDispatchWeightKg - returned),
          'Returned Unslit (kg)': kg(returned),
          'Total Dispatched (kg)': kg(c.thisDispatchWeightKg),
          'Balance After (kg)': kg(c.remainingBalanceWeightKg),
          Type: c.dispatchType === 'final' ? 'Final' : 'Partial',
          Revision: c.revisionLabel,
        };
      })
  );

  const bundles = sorted.flatMap((j) =>
    (j.bundles || [])
      .filter((b) => !b.isVoided)
      .sort((a, b) => a.bundleNumber - b.bundleNumber)
      .map((b) => ({
        'PO No': j.customerPoNo,
        Customer: j.customerName,
        'Bundle No': b.bundleNumber,
        Rolls: b.rollsSummary,
        'Roll Count': b.totalRollsCount,
        'Gross (kg)': kg(b.grossWeightKg),
        Core: CORE_LABEL[b.coreType] || b.coreType,
        'Tare (kg)': kg((b.paperCoreTareWeightKg || 0) + (b.otherPackagingTareKg || 0)),
        'Net (kg)': kg(b.netWeightKg),
        Status: b.status === 'dispatched' ? 'Dispatched' : 'Ready',
        Challan: b.dispatchedInChallanNo || '',
        'Weighed At': dateTime(b.weighedAt),
        'Weighed By': b.weighedBy,
      }))
  );

  const book = XLSX.utils.book_new();
  const addSheet = (rows: Record<string, unknown>[], name: string, header: string[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows, { header });
    // Column widths from the longest value, capped so notes don't make huge columns
    sheet['!cols'] = header.map((h) => ({
      wch: Math.min(45, Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)) + 2),
    }));
    XLSX.utils.book_append_sheet(book, sheet, name);
  };
  addSheet(orders, 'Orders', Object.keys(orders[0] || { 'PO No': '' }));
  addSheet(challans, 'Challans', Object.keys(challans[0] || { 'Challan No': '' }));
  addSheet(bundles, 'Bundles', Object.keys(bundles[0] || { 'PO No': '' }));

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `SlitFlow-orders-${stamp}.xlsx`);
}
