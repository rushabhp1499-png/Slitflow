import React from 'react';
import { DeliveryChallan, MaterialInward } from '../types';
import { COMPANY, companyContactLine } from '../config/company';
import { challanBundles, sizeSummary } from '../utils/challanExport';
import { formatKg } from '../utils/weight';

const orDash = (v?: string | null) => (v && v.trim() && v.trim() !== '—' ? v.trim() : '—');

// On-screen copy of the challan, laid out like the one-page PDF.
export const ChallanPreview: React.FC<{ challan: DeliveryChallan; job: MaterialInward }> = ({ challan, job }) => {
  const bundles = challanBundles(challan, job);
  const returned = challan.returnedMaterial;
  const slitNet = bundles.reduce((s, b) => s + b.netWeightKg, 0);
  const gross = bundles.reduce((s, b) => s + b.grossWeightKg, 0);
  const tare = bundles.reduce((s, b) => s + (b.paperCoreTareWeightKg || 0) + (b.otherPackagingTareKg || 0), 0);
  const sizes = sizeSummary(bundles);

  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-4 sm:p-6 shadow-sm text-slate-900 text-xs space-y-3">
      <div className="flex flex-col sm:flex-row justify-between gap-3 border-b-2 border-slate-900 pb-3">
        <div>
          <h2 className="text-lg font-black">{COMPANY.name}</h2>
          <p className="text-[11px] text-slate-600">{COMPANY.address}</p>
          <p className="text-[11px] text-slate-600">{companyContactLine()}</p>
        </div>
        <div className="sm:text-right">
          <p className="font-black text-sm">DELIVERY CHALLAN</p>
          <p className="text-[10px] text-slate-500">Job work – Rule 55, CGST Rules 2017</p>
          <p className="font-mono font-bold text-sm mt-1">{challan.challanNo}</p>
          <p className="text-[11px]">
            Date: {new Date(challan.challanDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {challan.revisionLabel && challan.revisionLabel !== 'Original' ? ` • ${challan.revisionLabel}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <p className="text-[10px] uppercase font-bold text-slate-500">Consignee (Customer)</p>
          <p className="font-bold">{challan.customerName}</p>
          <p>{orDash(challan.customerDeliveryAddress || challan.customerRegisteredAddress)}</p>
          <p>GSTIN: {orDash(challan.customerGst)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <p className="text-[10px] uppercase font-bold text-slate-500">Dispatch Details</p>
          <p>
            Customer PO: <b>{orDash(challan.customerPoNo || job.customerPoNo)}</b> • Our Job: {job.jobNo}
          </p>
          <p>
            Vehicle: {orDash(challan.vehicleNo)} • Transporter: {orDash(challan.transporterName)}
          </p>
          <p>E-Way Bill: {orDash(challan.eWayBillNo)}</p>
          <p>Inward Ref: {orDash(challan.incomingChallanRef)}</p>
        </div>
      </div>

      <table className="w-full text-left border border-slate-200">
        <thead className="bg-slate-900 text-white text-[10px] uppercase">
          <tr>
            <th className="py-1.5 px-2 w-6">#</th>
            <th className="py-1.5 px-2">Description of goods</th>
            <th className="py-1.5 px-2 text-right">Bundles</th>
            <th className="py-1.5 px-2 text-right">Rolls</th>
            <th className="py-1.5 px-2 text-right">Net kg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sizes.map((s, i) => (
            <tr key={s.label}>
              <td className="py-1.5 px-2">{i + 1}</td>
              <td className="py-1.5 px-2">
                Slitted {job.grade}, {job.thickness} {job.thicknessUnit} – {s.label}
              </td>
              <td className="py-1.5 px-2 text-right font-mono">{s.bundles}</td>
              <td className="py-1.5 px-2 text-right font-mono">{s.rolls || '—'}</td>
              <td className="py-1.5 px-2 text-right font-mono font-bold">{formatKg(s.netKg)}</td>
            </tr>
          ))}
          {returned && (
            <tr className="bg-amber-50">
              <td className="py-1.5 px-2">{sizes.length + 1}</td>
              <td className="py-1.5 px-2">
                Unslit {job.grade} returned (balance material){returned.note ? ` – ${returned.note}` : ''}
              </td>
              <td className="py-1.5 px-2 text-right font-mono">—</td>
              <td className="py-1.5 px-2 text-right font-mono">{returned.rolls || '—'}</td>
              <td className="py-1.5 px-2 text-right font-mono font-bold">{formatKg(returned.weightKg)}</td>
            </tr>
          )}
        </tbody>
        <tfoot className="bg-slate-50 font-bold">
          <tr>
            <td />
            <td className="py-1.5 px-2">Total</td>
            <td className="py-1.5 px-2 text-right font-mono">{bundles.length}</td>
            <td />
            <td className="py-1.5 px-2 text-right font-mono">{formatKg(slitNet + (returned?.weightKg || 0))}</td>
          </tr>
        </tfoot>
      </table>

      {bundles.length > 0 && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-0.5 font-mono text-[11px] border border-slate-200 rounded-lg p-2">
            {bundles.map((b) => (
              <div key={b.id} className="flex justify-between gap-2 border-b border-slate-100 py-0.5">
                <span className="font-bold">{b.bundleTag.replace('BNDL-', '#')}</span>
                <span className="text-slate-500">{b.grossWeightKg.toFixed(2)}</span>
                <span className="font-bold">{b.netWeightKg.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="text-right font-bold mt-1">
            {bundles.length} bundles • Gross {formatKg(gross)} kg • Tare (cores) {formatKg(tare)} kg • Net {formatKg(slitNet)} kg
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold">
        <span>Material received: {formatKg(challan.totalOrderWeightKg)} kg</span>
        <span>This challan: {formatKg(challan.thisDispatchWeightKg)} kg</span>
        <span>Balance with us: {formatKg(challan.remainingBalanceWeightKg)} kg</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2 text-[11px] text-slate-600">
        <div>
          <p>1. Goods returned after job work under Rule 55 of the CGST Rules, 2017. Not a sale.</p>
          <p>2. Please check bundle numbers and weights on receipt and report any difference within 24 hours.</p>
          <p>3. Subject to {COMPANY.jurisdiction} jurisdiction.</p>
        </div>
        <div className="sm:text-right shrink-0">
          <p className="font-bold text-slate-900">For {COMPANY.name}</p>
          <p className="mt-6">Prepared by: {orDash(challan.preparedBy)}</p>
        </div>
      </div>
    </div>
  );
};
