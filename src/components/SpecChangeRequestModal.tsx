import React, { useState } from 'react';
import { MaterialInward } from '../types';
import { useProduction } from '../context/ProductionContext';
import { toScaleKg, describeSlitSizes } from '../utils/weight';
import { SlitSizesEditor, SlitRow, rowsFromSizes, sizesFromRows, totalKg } from './SlitSizesEditor';
import { X, RotateCcw, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

interface SpecChangeRequestModalProps {
  job: MaterialInward;
  onClose: () => void;
}

// Customer asks the factory to change the slit sizes / bundle specs of an open order.
export const SpecChangeRequestModal: React.FC<SpecChangeRequestModalProps> = ({ job, onClose }) => {
  const { requestSpecChange, authenticatedEmail } = useProduction();

  const [slitRows, setSlitRows] = useState<SlitRow[]>(rowsFromSizes(job.requestedSlitSizes));
  const [bundleWeight, setBundleWeight] = useState<string>(String(job.bundleSpecs?.targetBundleWeightKg ?? ''));
  const [unitsPerBundle, setUnitsPerBundle] = useState<string>(String(job.bundleSpecs?.unitsPerBundle ?? ''));
  const [unitType, setUnitType] = useState<'reels' | 'reams'>(job.bundleSpecs?.unitType || 'reels');
  const [notes, setNotes] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const sizes = sizesFromRows(slitRows);
    if (sizes.length === 0) {
      setError('Add at least one slitting size (width in mm and quantity in kg).');
      return;
    }
    if (job.incomingWeight > 0 && totalKg(sizes) > job.incomingWeight) {
      setError('The slitting quantities add up to more than the material received.');
      return;
    }
    if (!reason.trim()) {
      setError('Please tell us why you need this change.');
      return;
    }

    setBusy(true);
    const ok = await requestSpecChange(job.id, {
      requestedSpecs: {
        slitSizes: sizes,
        targetBundleWeightKg: toScaleKg(Number(bundleWeight)) || job.bundleSpecs?.targetBundleWeightKg,
        unitsPerBundle: Number(unitsPerBundle) || job.bundleSpecs?.unitsPerBundle,
        unitType,
        customerInstructions: [`Slit sizes: ${describeSlitSizes(sizes)}.`, notes.trim()].filter(Boolean).join(' '),
      },
      reason: reason.trim(),
      requestedByEmail: authenticatedEmail || job.customerEmail,
    });
    setBusy(false);
    if (ok) {
      setSubmitted(true);
      setTimeout(onClose, 1500);
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-purple-600/30 text-purple-300 rounded-xl border border-purple-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">Request a Change</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                PO {job.customerPoNo} • {job.grade}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Change request sent</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Progressive Enterprises will review it. You'll see their decision on this order.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Slitting sizes</h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Edit the sizes below. Currently: {describeSlitSizes(job.requestedSlitSizes) || 'none recorded'}.
              </p>
              <SlitSizesEditor rows={slitRows} onChange={setSlitRows} availableKg={job.incomingWeight} />
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Bundle packing</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Max bundle (kg)</label>
                  <input
                    type="number"
                    step={0.05}
                    min={0.05}
                    value={bundleWeight}
                    onChange={(e) => setBundleWeight(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Units per bundle</label>
                  <input
                    type="number"
                    min={1}
                    value={unitsPerBundle}
                    onChange={(e) => setUnitsPerBundle(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit type</label>
                  <select value={unitType} onChange={(e) => setUnitType(e.target.value as 'reels' | 'reams')} className={inputClass}>
                    <option value="reels">Reels</option>
                    <option value="reams">Reams</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Other instructions <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Reason for the change <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Our machine now needs 25 mm instead of 20 mm"
                className={`${inputClass} border-amber-300 bg-amber-50/40`}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-900 bg-red-50 border border-red-200 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Send to Factory for Approval</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
