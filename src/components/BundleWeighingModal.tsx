import React, { useState, useMemo } from 'react';
import { MaterialInward, CoreType } from '../types';
import { useProduction } from '../context/ProductionContext';
import {
  Scale,
  Plus,
  Trash2,
  X,
  Package,
  Truck,
  PlusCircle,
  Hash,
  Sparkles
} from 'lucide-react';

interface BundleWeighingModalProps {
  job: MaterialInward;
  onClose: () => void;
  onOpenChallan?: () => void;
}

interface RollRow {
  id: string;
  rollCount: number;
  widthMm: number;
}

export const BundleWeighingModal: React.FC<BundleWeighingModalProps> = ({
  job,
  onClose,
  onOpenChallan,
}) => {
  const { jobs, addBundleToJob, addMultipleBundlesToJob, deleteBundleFromJob } = useProduction();

  // Always read reactive current job to ensure immediate bundle list updates
  const currentJob = jobs.find((j) => j.id === job.id) || job;
  const bundles = currentJob.bundles || [];

  // Next bundle number to be created
  const nextBundleNumber = bundles.length + 1;
  const nextBundleTag = `BNDL-${String(nextBundleNumber).padStart(2, '0')}`;

  // Defaults from customer order specifications
  const defaultRolls = currentJob.bundleSpecs?.unitsPerBundle || 10;
  const defaultWidth = currentJob.outputDetails?.slitCuts?.[0]?.widthMm || currentJob.incomingWidth / 10 || 20;
  const targetBundleWeight = currentJob.bundleSpecs?.targetBundleWeightKg || 28;

  // Form states
  const [grossInput, setGrossInput] = useState<string>((targetBundleWeight + 1.2).toFixed(2));
  const [coreType, setCoreType] = useState<CoreType>('paper_core');
  const [paperCoreTareInput, setPaperCoreTareInput] = useState<string>('1.20'); // Editable paper core weight!

  // Flexible roll sizes list inside the same bundle
  const [rollRows, setRollRows] = useState<RollRow[]>([
    { id: '1', rollCount: defaultRolls, widthMm: defaultWidth },
  ]);

  const addRollRow = () => {
    setRollRows((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        rollCount: 5,
        widthMm: defaultWidth,
      },
    ]);
  };

  const removeRollRow = (id: string) => {
    if (rollRows.length <= 1) return;
    setRollRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRollRow = (id: string, field: 'rollCount' | 'widthMm', value: number) => {
    setRollRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Roll summary computation
  const totalRollsCount = useMemo(
    () => rollRows.reduce((sum, r) => sum + (r.rollCount || 0), 0),
    [rollRows]
  );

  const rollsSummaryText = useMemo(() => {
    if (rollRows.length === 0) return '0 rolls';
    return rollRows
      .map((r) => `${r.rollCount} roll${r.rollCount === 1 ? '' : 's'} × ${r.widthMm}mm`)
      .join(' + ');
  }, [rollRows]);

  // Tare & Net calculations
  const grossNumber = Number(grossInput) || 0;
  const paperCoreTareKg = Math.max(0, Number(paperCoreTareInput) || 0);
  const effectiveTare = coreType === 'paper_core' ? paperCoreTareKg : 0;
  const netWeight = Math.max(0, Number((grossNumber - effectiveTare).toFixed(2)));

  // Totals across already logged bundles
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

    addBundleToJob(currentJob.id, {
      rollItems: rollRows.map((r) => ({
        widthMm: r.widthMm,
        rollCount: r.rollCount,
        unitType: currentJob.bundleSpecs?.unitType || 'reels',
      })),
      rollsSummary: rollsSummaryText,
      totalRollsCount: Math.max(1, totalRollsCount),
      grossWeightKg: grossNumber,
      coreType,
      paperCoreTareWeightKg: effectiveTare,
      netWeightKg: netWeight,
      weighedBy: 'Factory Floor Operator',
    });

    // Advance scale reading slightly for convenience on next bundle
    const delta = (Math.random() * 0.4 - 0.2).toFixed(2);
    setGrossInput(Math.max(1, Number((grossNumber + Number(delta)).toFixed(2))).toFixed(2));
  };

  const handleAddBatch5 = () => {
    if (grossNumber <= 0) return;

    const list = [];
    for (let i = 0; i < 5; i++) {
      const jitter = (Math.random() * 0.5 - 0.25).toFixed(2);
      const g = Math.max(1, Number((grossNumber + Number(jitter)).toFixed(2)));
      const n = Math.max(0, Number((g - effectiveTare).toFixed(2)));
      list.push({
        rollItems: rollRows.map((r) => ({
          widthMm: r.widthMm,
          rollCount: r.rollCount,
          unitType: currentJob.bundleSpecs?.unitType || 'reels',
        })),
        rollsSummary: rollsSummaryText,
        totalRollsCount: Math.max(1, totalRollsCount),
        grossWeightKg: g,
        coreType,
        paperCoreTareWeightKg: effectiveTare,
        netWeightKg: n,
        weighedBy: 'Factory Floor Operator',
      });
    }
    addMultipleBundlesToJob(currentJob.id, list);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base tracking-tight">Add Bundle Details & Weighment</h3>
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded font-semibold">
                  {currentJob.jobNo}
                </span>
                <span className="text-xs bg-blue-900/60 text-blue-200 font-mono px-2 py-0.5 rounded font-semibold">
                  PO: {currentJob.customerPoNo}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Customer: <strong className="text-slate-300">{currentJob.customerName}</strong>
              </p>
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow-xs"
                title="Create Delivery Challan for ready bundles"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Make Challan ({readyBundlesCount} ready)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-800"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold">Inward Raw Material:</span>
              <strong className="text-slate-900 font-mono text-sm">{currentJob.incomingWeight.toLocaleString()} kg</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold">Total Net Weighed:</span>
              <strong className="text-blue-700 font-mono text-sm">{totalNetWeighed.toLocaleString()} kg</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold">Logged Bundles:</span>
              <strong className="text-slate-900 font-mono text-sm">
                {bundles.length} ({readyBundlesCount} ready for dispatch)
              </strong>
            </div>
          </div>

          {/* Prominent Next Bundle indicator */}
          <div className="inline-flex items-center gap-1.5 bg-blue-100/90 text-blue-900 border border-blue-300 px-3 py-1 rounded-lg font-bold font-mono text-xs">
            <Hash className="w-3.5 h-3.5 text-blue-700" />
            <span>Next to Log: Bundle #{nextBundleNumber}</span>
          </div>
        </div>

        {/* Form & Logged List */}
        <div className="p-5 overflow-y-auto space-y-5 grow">
          {/* Main Bundle Entry Form Panel */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            
            {/* Top Indicator: Current Bundle ID Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/90">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Entering Details For:
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-black text-blue-700 bg-white border border-blue-300 px-3 py-1 rounded-lg shadow-2xs font-mono">
                  <Package className="w-4 h-4 text-blue-600" />
                  Bundle #{nextBundleNumber} ({nextBundleTag})
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Saving will automatically queue Bundle #{nextBundleNumber + 1}
              </span>
            </div>

            {/* Inputs: Gross Weight, Core Type, Editable Paper Core Weight, and Net Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              
              {/* 1. Scale Reading (Gross Weight) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scale Reading (Gross kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={grossInput}
                    onChange={(e) => setGrossInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="28.50"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">kg</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Direct physical balance reading</p>
              </div>

              {/* 2. Core type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Core type
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-200 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCoreType('paper_core')}
                    className={`py-2 px-1 rounded-md transition text-center ${
                      coreType === 'paper_core'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Paper Tube
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoreType('pvc_core')}
                    className={`py-2 px-1 rounded-md transition text-center ${
                      coreType === 'pvc_core'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Plastic Tube
                  </button>
                </div>
              </div>

              {/* 3. Editable Paper Core Weight */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {coreType === 'paper_core' ? 'Paper Tube Weight (kg)' : 'Core Tube Weight'}
                </label>
                {coreType === 'paper_core' ? (
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paperCoreTareInput}
                        onChange={(e) => setPaperCoreTareInput(e.target.value)}
                        className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 font-mono font-bold text-base text-slate-900 focus:ring-2 focus:ring-blue-600"
                        placeholder="1.20"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">kg</span>
                    </div>
                    {/* Quick Core Weight Presets */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {[0.8, 1.0, 1.2, 1.5].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPaperCoreTareInput(preset.toFixed(2))}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition ${
                            Number(paperCoreTareInput) === preset
                              ? 'bg-blue-100 border-blue-400 text-blue-800'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {preset.toFixed(1)}k
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-600 font-medium">
                    0.00 kg (Plastic Tube)
                  </div>
                )}
              </div>

              {/* 4. Net Dispatched Weight Preview */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Net Dispatched Weight
                </span>
                <span className="text-2xl font-black font-mono text-emerald-700 block mt-0.5">
                  {netWeight > 0 ? netWeight.toFixed(2) : '0.00'} kg
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  Core type: {coreType === 'paper_core' ? `Paper Tube (-${effectiveTare.toFixed(2)} kg)` : 'Plastic Tube'}
                </span>
              </div>
            </div>

            {/* Flexible Multiple Rolls & Different Widths within the same Bundle */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Roll Sizes Inside Bundle #{nextBundleNumber}
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Add multiple roll quantities and widths in this single bundle
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRollRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Add Another Roll Size</span>
                </button>
              </div>

              {/* List of Roll Rows */}
              <div className="space-y-2">
                {rollRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 sm:gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200/80 flex-wrap"
                  >
                    <span className="text-xs font-bold text-slate-500 font-mono w-6 text-center">
                      #{idx + 1}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-medium text-slate-600">Rolls:</label>
                      <input
                        type="number"
                        min="1"
                        value={row.rollCount}
                        onChange={(e) =>
                          updateRollRow(row.id, 'rollCount', Math.max(1, Number(e.target.value)))
                        }
                        className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                      />
                    </div>

                    <span className="text-slate-400 font-bold">×</span>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-medium text-slate-600">Width:</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          value={row.widthMm}
                          onChange={(e) =>
                            updateRollRow(row.id, 'widthMm', Math.max(1, Number(e.target.value)))
                          }
                          className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold pr-7"
                        />
                        <span className="absolute right-2 top-1 text-[10px] text-slate-400 font-bold">
                          mm
                        </span>
                      </div>
                    </div>

                    <span className="text-xs text-slate-500 font-mono">
                      ({row.rollCount} × {row.widthMm}mm)
                    </span>

                    {rollRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRollRow(row.id)}
                        className="ml-auto text-slate-400 hover:text-red-600 p-1 rounded transition"
                        title="Remove this roll size"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Rolls Summary Footer */}
              <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs font-medium text-slate-700">
                <span>
                  Bundle Summary: <strong className="text-blue-700">{rollsSummaryText}</strong>
                </span>
                <span className="font-mono text-slate-600">
                  Total Rolls: <strong className="text-slate-900">{totalRollsCount}</strong>
                </span>
              </div>
            </div>

            {/* Action Buttons: Log Single Bundle vs Add 5 Batch */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleAddBatch5}
                disabled={grossNumber <= 0}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition disabled:opacity-50"
                title="Add 5 consecutive bundles with current configuration"
              >
                + Add 5 Identical Bundles
              </button>

              <button
                type="button"
                onClick={handleAddBundle}
                disabled={grossNumber <= 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
                title={`Save Bundle #${nextBundleNumber}`}
              >
                <Plus className="w-4 h-4" />
                <span>+ Save Bundle #{nextBundleNumber}</span>
              </button>
            </div>
          </div>

          {/* Bundles Ledger Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                Logged Bundles ({bundles.length})
              </h4>
              <span className="text-xs font-mono text-slate-600">
                Total Net Weighed: <strong className="text-slate-900">{totalNetWeighed.toLocaleString()} kg</strong>
              </span>
            </div>

            {bundles.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                No bundles logged yet. Configure the weight and roll sizes above and click &quot;+ Save Bundle #1&quot;.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Bundle #</th>
                      <th className="py-2.5 px-3">Rolls & Sizes</th>
                      <th className="py-2.5 px-3">Core type</th>
                      <th className="py-2.5 px-3 text-right">Gross Wt</th>
                      <th className="py-2.5 px-3 text-right font-bold">Net Wt</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bundles.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 font-mono">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {b.bundleTag}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-sans font-medium">
                          {b.rollsSummary}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-sans font-medium">
                          {b.coreType === 'paper_core' ? 'Paper Tube' : 'Plastic Tube'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {b.grossWeightKg.toFixed(2)} kg
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
                              onClick={() => deleteBundleFromJob(currentJob.id, b.id)}
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
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Progressive Enterprises • Precision Slitting & Bundling Floor Scale
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
