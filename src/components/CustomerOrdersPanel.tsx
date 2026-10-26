import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { Customer, MaterialInward } from '../types';
import { formatKg } from '../utils/weight';
import { STATUS_LABEL, exportJobsToExcel } from '../utils/excelExport';
import { isOpenOrder } from '../utils/floorPlan';
import { ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';

const isClosed = (j: MaterialInward) => j.poStatus === 'closed' || j.status === 'po_closed';
const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

// Everything for one customer in a small space: totals, then one line per PO (click a line for its challans).
export const CustomerOrdersPanel: React.FC<{ customer: Customer }> = ({ customer }) => {
  const { jobs, machines, floorStaff } = useProduction();
  const [show, setShow] = useState<'open' | 'all'>('open');
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const mine = jobs
    .filter((j) => j.customerId === customer.id)
    .sort((a, b) => (b.receivedDate || '').localeCompare(a.receivedDate || ''));
  const pending = mine.filter(isOpenOrder);
  const shown = show === 'open' ? pending : mine;
  const today = new Date().toISOString().slice(0, 10);

  const sum = (list: MaterialInward[], f: (j: MaterialInward) => number) => list.reduce((s, j) => s + f(j), 0);
  const balance = (j: MaterialInward) => Math.max(0, j.incomingWeight - (j.dispatchedWeightKg || 0));
  const activeChallans = (j: MaterialInward) => (j.challans || []).filter((c) => !c.isSuperseded);
  const lastDispatch = mine
    .flatMap(activeChallans)
    .map((c) => c.challanDate)
    .sort()
    .pop();

  const stats = [
    { label: 'Pending POs', value: `${pending.length} of ${mine.length}` },
    { label: 'Material with us', value: `${formatKg(sum(pending, balance))} kg` },
    { label: 'Received (all time)', value: `${formatKg(sum(mine, (j) => j.incomingWeight))} kg` },
    { label: 'Dispatched (all time)', value: `${formatKg(sum(mine, (j) => j.dispatchedWeightKg || 0))} kg` },
    { label: 'Challans', value: String(sum(mine, (j) => activeChallans(j).length)) },
    { label: 'Last dispatch', value: shortDate(lastDispatch) },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportJobsToExcel(mine, machines, floorStaff);
    } catch (err) {
      console.error(err);
      alert('Could not create the Excel file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {stats.map((s) => (
          <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-wide text-slate-500 leading-tight">{s.label}</div>
            <div className="text-xs font-black text-slate-900 font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-[11px] font-bold">
          {(['open', 'all'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setShow(k)}
              className={`px-2.5 py-1 ${show === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {k === 'open' ? `Pending (${pending.length})` : `All orders (${mine.length})`}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || mine.length === 0}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg disabled:opacity-50"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> {exporting ? 'Preparing…' : 'Excel'}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-300 rounded-lg">
          {mine.length === 0 ? 'No orders from this customer yet.' : 'No pending orders. Everything has been dispatched or closed.'}
        </p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-[11px] whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] tracking-wide">
              <tr>
                <th className="text-left px-2 py-1.5">PO</th>
                <th className="text-left px-2 py-1.5 hidden lg:table-cell">Material</th>
                <th className="text-right px-2 py-1.5">In (kg)</th>
                <th className="text-right px-2 py-1.5">Sent (kg)</th>
                <th className="text-right px-2 py-1.5">Balance</th>
                <th className="text-left px-2 py-1.5">Stage</th>
                <th className="text-left px-2 py-1.5">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((j) => {
                const expanded = openId === j.id;
                const challans = activeChallans(j);
                const machine = machines.find((m) => m.id === j.assignment?.machineId)?.number;
                const late = !!j.estimatedDeliveryDate && j.estimatedDeliveryDate < today && isOpenOrder(j);
                return (
                  <React.Fragment key={j.id}>
                    <tr onClick={() => setOpenId(expanded ? null : j.id)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1 font-mono font-bold text-blue-800">
                          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {j.customerPoNo}
                        </div>
                        <div className="text-[10px] text-slate-400 pl-4">In {shortDate(j.receivedDate)}</div>
                      </td>
                      <td className="px-2 py-1.5 hidden lg:table-cell text-slate-700">
                        <div className="truncate max-w-[160px]">{j.grade}</div>
                        <div className="text-[10px] text-slate-400">
                          {j.thickness} {j.thicknessUnit} × {j.incomingWidth} mm
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{formatKg(j.incomingWeight)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-700">{formatKg(j.dispatchedWeightKg || 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold">{formatKg(balance(j))}</td>
                      <td className="px-2 py-1.5">
                        <div className={isClosed(j) ? 'text-slate-400' : 'text-slate-800 font-semibold'}>
                          {isClosed(j) ? 'PO closed' : STATUS_LABEL[j.status] || j.status}
                        </div>
                        {machine && !isClosed(j) && <div className="text-[10px] text-slate-400">{machine}</div>}
                      </td>
                      <td className={`px-2 py-1.5 ${late ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                        {j.estimatedDeliveryDate ? shortDate(j.estimatedDeliveryDate) : '—'}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={7} className="px-3 py-2 text-[11px] text-slate-700 space-y-1 whitespace-normal">
                          <div>
                            <span className="text-slate-500">Slit sizes: </span>
                            {(j.requestedSlitSizes || []).length
                              ? j.requestedSlitSizes!.map((s) => `${s.widthMm} mm – ${formatKg(s.quantityKg)} kg`).join(', ')
                              : '—'}
                          </div>
                          <div>
                            <span className="text-slate-500">Inward: </span>
                            challan {j.inwardChallanNo || '—'}, vehicle {j.vehicleNo || '—'}, {j.coilsOrRollsCount} roll
                            {j.coilsOrRollsCount === 1 ? '' : 's'} • Job {j.jobNo}
                          </div>
                          <div>
                            <span className="text-slate-500">Bundles weighed: </span>
                            {(j.bundles || []).filter((b) => !b.isVoided).length}
                          </div>
                          <div>
                            <span className="text-slate-500">Challans: </span>
                            {challans.length === 0
                              ? 'none yet'
                              : challans
                                  .map((c) => `${c.challanNo} (${shortDate(c.challanDate)}, ${formatKg(c.thisDispatchWeightKg)} kg, ${c.vehicleNo || '—'})`)
                                  .join(' • ')}
                          </div>
                          {(j.specChangeRequests || []).length > 0 && (
                            <div>
                              <span className="text-slate-500">Change requests: </span>
                              {j.specChangeRequests!.length}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
