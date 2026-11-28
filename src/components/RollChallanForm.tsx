import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward } from '../types';
import { rollSpecLabel, rollsMade, rollsOnChallans } from '../utils/floorPlan';
import { AlertCircle, FileText } from 'lucide-react';

interface RollChallanFormProps {
  job: MaterialInward;
  showCancel: boolean;
  onCancel: () => void;
  onCreated: (challanId: string) => void;
}

// Challan for a roll-length order: type how many rolls of each length go on it, up to what is made
// and not yet on a challan. Weight is optional (only if the rolls or the truck were weighed).
export const RollChallanForm: React.FC<RollChallanFormProps> = ({ job, showCancel, onCancel, onCreated }) => {
  const { generateRollChallan, customers } = useProduction();
  const keepsStock = !!customers.find((c) => c.id === job.customerId)?.keepsStock;
  const specs = job.rollSpecs || [];
  const available = (id: string) => Math.max(0, rollsMade(job, id) - rollsOnChallans(job, id));

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [weight, setWeight] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [transporter, setTransporter] = useState('');
  const [eway, setEway] = useState('');
  const [remarks, setRemarks] = useState('');
  const [last, setLast] = useState(false);
  const [error, setError] = useState('');

  const total = specs.reduce((s, x) => s + (Math.round(Number(counts[x.id])) || 0), 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const created = generateRollChallan(job.id, {
        lines: specs.map((s) => ({ specId: s.id, rolls: Number(counts[s.id]) || 0 })),
        weightKg: Number(weight) || 0,
        last,
        vehicleNo: vehicle,
        transporterName: transporter,
        eWayBillNo: eway,
        remarks,
      });
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const input = 'w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600';

  return (
    <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
        <div>
          <h4 className="text-base font-extrabold text-slate-900">New Challan • by roll count</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            PO #{job.customerPoNo}. Enter any number of rolls up to what is ready.
            {keepsStock ? ' Billed on this challan; the rolls may stay with us until lifted.' : ''}
          </p>
        </div>
        {showCancel && (
          <button type="button" onClick={onCancel} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50">
            ← Back to Existing Challans
          </button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {specs.map((s) => {
            const ready = available(s.id);
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-bold text-slate-900">
                    {rollSpecLabel(s)}
                    {job.coreSize ? <span className="font-normal text-slate-500">, {job.coreSize} core</span> : ''}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Made {rollsMade(job, s.id)} • on challans {rollsOnChallans(job, s.id)} • <b className="text-slate-800">ready {ready}</b>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={ready}
                    value={counts[s.id] || ''}
                    onChange={(e) => setCounts((c) => ({ ...c, [s.id]: e.target.value }))}
                    placeholder="0"
                    disabled={ready === 0}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold text-right disabled:bg-slate-100"
                  />
                  <span className="text-xs text-slate-500">rolls</span>
                  {ready > 0 && (
                    <button type="button" onClick={() => setCounts((c) => ({ ...c, [s.id]: String(ready) }))} className="text-[11px] font-bold text-blue-700 hover:underline">
                      All {ready}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Total weight (kg) <span className="text-slate-400 font-normal">(optional, if weighed)</span>
            </label>
            <input type="number" min={0} step="any" value={weight} onChange={(e) => setWeight(e.target.value)} className={`${input} font-mono`} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Vehicle Number <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={`${input} font-mono`} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Transporter <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input value={transporter} onChange={(e) => setTransporter(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">E-Way Bill Number</label>
            <input value={eway} onChange={(e) => setEway(e.target.value)} className={`${input} font-mono`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={input} />
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer">
          <input type="checkbox" checked={last} onChange={(e) => setLast(e.target.checked)} className="mt-0.5" />
          <span>
            <strong>This is the last challan for this PO</strong> (production finished, everything sent). Leave unticked for a part challan.
          </span>
        </label>

        {error && (
          <div className="text-xs text-red-900 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          {showCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={total <= 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:text-slate-500"
          >
            <FileText className="w-4 h-4" />
            {total > 0 ? `Make Challan for ${total} rolls` : 'Enter the rolls going out'}
          </button>
        </div>
      </form>
    </div>
  );
};
