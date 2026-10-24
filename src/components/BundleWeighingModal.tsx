import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MaterialInward, CoreType } from '../types';
import { useProduction } from '../context/ProductionContext';
import { toScaleKg, formatKg } from '../utils/weight';
import { printBundleSticker } from '../utils/bundleSticker';
import { Scale, Plus, Trash2, X, Package, Truck, PlusCircle, Printer } from 'lucide-react';

interface BundleWeighingModalProps {
  job: MaterialInward;
  onClose: () => void;
  onOpenChallan?: () => void;
}

interface RollRow {
  id: string;
  rollCount: string;
  widthMm: string;
}

// Remembered on this device between bundles and between orders.
const PREFS_KEY = 'slitflow_bundle_prefs_v1';
interface BundlePrefs {
  coreType: CoreType;
  tareKg: string;
  printAfterSave: boolean;
}
const loadPrefs = (): BundlePrefs => {
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) return { coreType: 'paper_core', tareKg: '1.20', printAfterSave: false, ...JSON.parse(saved) };
  } catch {
    // ignore
  }
  return { coreType: 'paper_core', tareKg: '1.20', printAfterSave: false };
};

export const BundleWeighingModal: React.FC<BundleWeighingModalProps> = ({ job, onClose, onOpenChallan }) => {
  const { jobs, addBundleToJob, deleteBundleFromJob } = useProduction();

  // Always read the live job so the list updates immediately
  const currentJob = jobs.find((j) => j.id === job.id) || job;
  const bundles = currentJob.bundles || [];
  const nextBundleNumber = bundles.reduce((max, b) => Math.max(max, b.bundleNumber || 0), 0) + 1;
  const nextBundleTag = `BNDL-${String(nextBundleNumber).padStart(2, '0')}`;

  // Widths the customer ordered, offered as one-tap buttons
  const orderedWidths = Array.from(
    new Set([
      ...(currentJob.requestedSlitSizes || []).map((s) => s.widthMm),
      ...(currentJob.outputDetails?.slitCuts || []).map((c) => c.widthMm),
    ])
  );

  const [prefs, setPrefs] = useState<BundlePrefs>(loadPrefs);
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  // Empty on purpose: every bundle needs a real scale reading.
  const [grossInput, setGrossInput] = useState<string>('');
  const grossRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    grossRef.current?.focus();
  }, []);

  const [rollRows, setRollRows] = useState<RollRow[]>([
    {
      id: '1',
      rollCount: String(currentJob.bundleSpecs?.unitsPerBundle || ''),
      widthMm: orderedWidths[0] ? String(orderedWidths[0]) : '',
    },
  ]);
  const [lastSavedTag, setLastSavedTag] = useState<string>('');
  const [popupBlocked, setPopupBlocked] = useState(false);

  const updateRollRow = (id: string, field: 'rollCount' | 'widthMm', value: string) =>
    setRollRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const validRolls = rollRows.filter((r) => Number(r.rollCount) > 0 && Number(r.widthMm) > 0);
  const totalRollsCount = validRolls.reduce((sum, r) => sum + Math.round(Number(r.rollCount)), 0);
  const rollsSummaryText = validRolls
    .map((r) => `${Math.round(Number(r.rollCount))} roll${Number(r.rollCount) === 1 ? '' : 's'} × ${Number(r.widthMm)} mm`)
    .join(' + ');

  const gross = toScaleKg(Number(grossInput) || 0);
  const tare = prefs.coreType === 'paper_core' ? toScaleKg(Math.max(0, Number(prefs.tareKg) || 0)) : 0;
  const net = Math.max(0, toScaleKg(gross - tare));

  const totalNetWeighed = useMemo(() => toScaleKg(bundles.reduce((acc, b) => acc + b.netWeightKg, 0)), [bundles]);
  const readyBundlesCount = bundles.filter((b) => b.status === 'ready').length;

  const canSave = gross > 0 && net > 0 && validRolls.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const saved = addBundleToJob(currentJob.id, {
      rollItems: validRolls.map((r) => ({
        widthMm: Number(r.widthMm),
        rollCount: Math.round(Number(r.rollCount)),
        unitType: currentJob.bundleSpecs?.unitType || 'reels',
      })),
      rollsSummary: rollsSummaryText,
      totalRollsCount: totalRollsCount,
      grossWeightKg: gross,
      coreType: prefs.coreType,
      paperCoreTareWeightKg: tare,
      netWeightKg: net,
    });
    setLastSavedTag(saved.bundleTag);
    if (prefs.printAfterSave) setPopupBlocked(!printBundleSticker(saved, currentJob));
    // Ready for the next bundle: clear the reading, keep core and roll settings.
    setGrossInput('');
    grossRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-5 py-3.5 flex items-center justify-between shrink-0 gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base">Weigh Bundles</h3>
              <span className="text-xs bg-blue-900/60 text-blue-100 font-mono px-2 py-0.5 rounded font-bold">
                PO {currentJob.customerPoNo}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {currentJob.customerName} • {currentJob.grade}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenChallan && readyBundlesCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChallan();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
              >
                <Truck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Make Challan</span> ({readyBundlesCount})
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-5 py-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Received</span>
            <strong className="font-mono">{formatKg(currentJob.incomingWeight)} kg</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Packed (net)</span>
            <strong className="font-mono text-blue-700">{formatKg(totalNetWeighed)} kg</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Bundles</span>
            <strong className="font-mono">
              {bundles.length} ({readyBundlesCount} ready)
            </strong>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 grow">
          {/* Entry form: type the scale reading and press Enter */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-base font-black text-blue-700 bg-white border border-blue-300 px-3 py-1 rounded-lg font-mono">
                <Package className="w-4 h-4" /> {nextBundleTag}
              </span>
              {lastSavedTag && (
                <span className="text-xs text-emerald-700 font-semibold">
                  ✓ {lastSavedTag} saved – enter the next reading
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Scale reading (gross kg)</label>
                <input
                  ref={grossRef}
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  min="0.05"
                  value={grossInput}
                  onChange={(e) => setGrossInput(e.target.value)}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setGrossInput(toScaleKg(v).toFixed(2));
                  }}
                  className="w-full bg-white border-2 border-blue-400 rounded-lg px-3 py-2.5 font-mono font-bold text-2xl text-slate-900 focus:ring-2 focus:ring-blue-600"
                  placeholder="0.00"
                />
                <p className="text-[10px] text-slate-500 mt-1">Press Enter to save. Rounds to 50 g.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Core</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-200 p-1 rounded-lg text-xs font-semibold">
                  {(['paper_core', 'pvc_core'] as const).map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setPrefs((p) => ({ ...p, coreType: ct }))}
                      className={`py-2 rounded-md ${prefs.coreType === ct ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}
                    >
                      {ct === 'paper_core' ? 'Paper' : 'Plastic'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Core weight (kg)</label>
                {prefs.coreType === 'paper_core' ? (
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={prefs.tareKg}
                    onChange={(e) => setPrefs((p) => ({ ...p, tareKg: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                ) : (
                  <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
                    Not deducted
                  </div>
                )}
              </div>

              <div className="col-span-2 lg:col-span-1 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Net weight</span>
                <span className="text-2xl font-black font-mono text-emerald-700">{formatKg(net)} kg</span>
              </div>
            </div>

            {/* Rolls in this bundle (kept for the next bundle) */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Rolls in this bundle</span>
                <button
                  type="button"
                  onClick={() =>
                    setRollRows((prev) => [...prev, { id: String(Date.now()), rollCount: '', widthMm: '' }])
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Another size
                </button>
              </div>
              {rollRows.map((row) => (
                <div key={row.id} className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number"
                    min="1"
                    value={row.rollCount}
                    onChange={(e) => updateRollRow(row.id, 'rollCount', e.target.value)}
                    placeholder="Rolls"
                    className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-center"
                  />
                  <span className="text-slate-400 font-bold">×</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={row.widthMm}
                    onChange={(e) => updateRollRow(row.id, 'widthMm', e.target.value)}
                    placeholder="Width"
                    className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono font-bold"
                  />
                  <span className="text-xs text-slate-500">mm</span>
                  {orderedWidths.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateRollRow(row.id, 'widthMm', String(w))}
                      className={`text-[11px] font-bold px-2 py-1 rounded border ${
                        Number(row.widthMm) === w ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                  {rollRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRollRows((prev) => prev.filter((r) => r.id !== row.id))}
                      className="ml-auto text-slate-400 hover:text-red-600 p-1"
                      title="Remove this size"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {rollsSummaryText && <p className="text-[11px] text-slate-600">{rollsSummaryText} • {totalRollsCount} rolls</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.printAfterSave}
                  onChange={(e) => setPrefs((p) => ({ ...p, printAfterSave: e.target.checked }))}
                  className="w-4 h-4"
                />
                Print sticker after each save
              </label>
              <button
                type="submit"
                disabled={!canSave}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg disabled:opacity-40 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Save {nextBundleTag}
              </button>
            </div>
            {popupBlocked && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                The browser blocked the sticker window. Allow pop-ups for this site, or use the Sticker button in the list below.
              </p>
            )}
          </form>

          {/* Bundles list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-blue-600" /> Bundles ({bundles.length})
              </h4>
              <span className="text-xs font-mono text-slate-600">
                Net total: <strong>{formatKg(totalNetWeighed)} kg</strong>
              </span>
            </div>

            {bundles.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                No bundles yet. Type the first scale reading above and press Enter.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Bundle</th>
                      <th className="py-2 px-3">Rolls</th>
                      <th className="py-2 px-3 text-right">Gross</th>
                      <th className="py-2 px-3 text-right">Net</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...bundles].reverse().map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold">{b.bundleTag}</td>
                        <td className="py-2 px-3 text-slate-700">{b.rollsSummary}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatKg(b.grossWeightKg)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatKg(b.netWeightKg)}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'dispatched' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {b.status === 'dispatched' ? 'Dispatched' : 'Ready'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPopupBlocked(!printBundleSticker(b, currentJob))}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
                              title="Print this bundle's sticker"
                            >
                              <Printer className="w-3 h-3" /> Sticker
                            </button>
                            {b.status !== 'dispatched' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete ${b.bundleTag}?`)) deleteBundleFromJob(currentJob.id, b.id);
                                }}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Delete bundle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
