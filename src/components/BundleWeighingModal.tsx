import React, { useState, useMemo } from 'react';
import { MaterialInward, CoreType } from '../types';
import { useProduction } from '../context/ProductionContext';
import { Scale, Plus, Trash2, X, Package, Check, Truck } from 'lucide-react';

interface BundleWeighingModalProps {
  job: MaterialInward;
  onClose: () => void;
  onOpenChallan?: () => void;
}

export const BundleWeighingModal: React.FC<BundleWeighingModalProps> = ({
  job,
  onClose,
  onOpenChallan,
}) => {
  const { addBundleToJob, addMultipleBundlesToJob, deleteBundleFromJob } = useProduction();

  const bundles = job.bundles || [];

  // Default target weight & rolls
  const defaultRolls = job.bundleSpecs?.unitsPerBundle || 10;
  const defaultWidth = job.outputDetails?.slitCuts?.[0]?.widthMm || 20;
  const targetBundleWeight = job.bundleSpecs?.targetBundleWeightKg || 28;

  const [grossInput, setGrossInput] = useState<string>((targetBundleWeight + 1.2).toFixed(2));
  const [rollCount, setRollCount] = useState<number>(defaultRolls);
  const [widthMm, setWidthMm] = useState<number>(defaultWidth);
  const [coreType, setCoreType] = useState<CoreType>('paper_core');
  const tarePerCoreKg = 0.12;

  // Tare & Net calculations
  const grossNumber = Number(grossInput) || 0;
  const tareWeight = coreType === 'paper_core' ? Number((rollCount * tarePerCoreKg).toFixed(2)) : 0;
  const netWeight = Math.max(0, Number((grossNumber - tareWeight).toFixed(2)));

  // Totals
  const totalNetWeighed = useMemo(
    () => Number(bundles.reduce((acc, b) => acc + b.netWeightKg, 0).toFixed(2)),
    [bundles]
  );
  const readyBundlesCount = useMemo(
    () => bundles.filter((b) => b.status === 'ready').length,
    [bundles]
  );

  const handleAddBundle = () => {
    if (grossNumber <= 0) return;

    addBundleToJob(job.id, {
      rollItems: [
        {
          widthMm,
          rollCount,
          unitType: job.bundleSpecs?.unitType || 'reels',
        },
      ],
      rollsSummary: `${rollCount} ${job.bundleSpecs?.unitType || 'reels'} × ${widthMm}mm`,
      totalRollsCount: rollCount,
      grossWeightKg: grossNumber,
      coreType,
      paperCoreTareWeightKg: tareWeight,
      netWeightKg: netWeight,
      weighedBy: 'Factory Scale Operator',
    });

    // Bump gross weight slightly for next entry convenience
    const delta = (Math.random() * 0.4 - 0.2).toFixed(2);
    setGrossInput(Math.max(1, Number((grossNumber + Number(delta)).toFixed(2))).toFixed(2));
  };

  const handleAddBatch5 = () => {
    if (grossNumber <= 0) return;

    const list = [];
    for (let i = 0; i < 5; i++) {
      const jitter = (Math.random() * 0.6 - 0.3).toFixed(2);
      const g = Math.max(1, Number((grossNumber + Number(jitter)).toFixed(2)));
      const n = Math.max(0, Number((g - tareWeight).toFixed(2)));
      list.push({
        rollItems: [
          {
            widthMm,
            rollCount,
            unitType: job.bundleSpecs?.unitType || 'reels',
          },
        ],
        rollsSummary: `${rollCount} ${job.bundleSpecs?.unitType || 'reels'} × ${widthMm}mm`,
        totalRollsCount: rollCount,
        grossWeightKg: g,
        coreType,
        paperCoreTareWeightKg: tareWeight,
        netWeightKg: n,
        weighedBy: 'Factory Scale Operator',
      });
    }
    addMultipleBundlesToJob(job.id, list);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Weigh Scale</h3>
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                  {job.jobNo}
                </span>
                <span className="text-xs bg-blue-900/60 text-blue-200 font-mono px-2 py-0.5 rounded">
                  PO: {job.customerPoNo}
                </span>
              </div>
              <p className="text-xs text-slate-400">Customer: {job.customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChallan && readyBundlesCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChallan();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Create Challan ({readyBundlesCount} ready)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500 block text-[11px]">Inward Raw Material:</span>
              <strong className="text-slate-800 font-mono">{job.incomingWeight.toLocaleString()} kg</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Net Weighed:</span>
              <strong className="text-blue-700 font-mono">{totalNetWeighed.toLocaleString()} kg</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Logged Bundles:</span>
              <strong className="text-slate-800 font-mono">{bundles.length} ({readyBundlesCount} ready)</strong>
            </div>
          </div>
        </div>

        {/* Form & Logged List */}
        <div className="p-5 overflow-y-auto space-y-5 grow">
          {/* Direct Input Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scale Reading (Gross kg)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={grossInput}
                  onChange={(e) => setGrossInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Core Type
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCoreType('paper_core')}
                    className={`py-2 rounded-md transition ${
                      coreType === 'paper_core'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Paper (-{tareWeight}kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoreType('pvc_core')}
                    className={`py-2 rounded-md transition ${
                      coreType === 'pvc_core'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PVC (0 tare)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rolls per Bundle
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={rollCount}
                    onChange={(e) => setRollCount(Math.max(1, Number(e.target.value)))}
                    className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-mono text-center text-sm font-bold"
                  />
                  <span className="text-xs text-slate-500 font-mono">× {widthMm}mm</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Net Weight
                </span>
                <span className="text-xl font-black font-mono text-emerald-700">
                  {netWeight > 0 ? netWeight.toFixed(2) : '0.00'} kg
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleAddBatch5}
                disabled={grossNumber <= 0}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                + Add 5 Identical Bundles
              </button>
              <button
                type="button"
                onClick={handleAddBundle}
                disabled={grossNumber <= 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Log Bundle</span>
              </button>
            </div>
          </div>

          {/* Bundles Ledger */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Logged Bundles ({bundles.length})
              </h4>
              <span className="text-xs font-mono text-slate-500">
                Total Net: <strong className="text-slate-900">{totalNetWeighed} kg</strong>
              </span>
            </div>

            {bundles.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                No bundles logged yet. Enter the scale reading above and click &quot;Log Bundle&quot;.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Bundle Tag</th>
                      <th className="py-2 px-3">Rolls & Width</th>
                      <th className="py-2 px-3 text-right">Gross Wt</th>
                      <th className="py-2 px-3 text-right">Tare Wt</th>
                      <th className="py-2 px-3 text-right font-bold">Net Wt</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bundles.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 font-mono">
                        <td className="py-2 px-3 font-bold text-slate-800">{b.bundleTag}</td>
                        <td className="py-2 px-3 text-slate-600 font-sans">{b.rollsSummary}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{b.grossWeightKg.toFixed(2)} kg</td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {b.paperCoreTareWeightKg > 0 ? `-${b.paperCoreTareWeightKg.toFixed(2)}` : '0.00'} kg
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700">
                          {b.netWeightKg.toFixed(2)} kg
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'dispatched'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {b.status === 'dispatched' ? 'Dispatched' : 'Ready'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {b.status !== 'dispatched' && (
                            <button
                              type="button"
                              onClick={() => deleteBundleFromJob(job.id, b.id)}
                              className="text-slate-400 hover:text-red-600 transition p-1"
                              title="Delete bundle"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
