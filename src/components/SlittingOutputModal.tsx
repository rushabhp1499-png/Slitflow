import React, { useState } from 'react';
import { MaterialInward, SlitCut, SlittingOutput } from '../types';
import { useProduction } from '../context/ProductionContext';
import { Scissors, Plus, Trash2, X, Package, ShieldCheck, Scale } from 'lucide-react';

interface SlittingOutputModalProps {
  job: MaterialInward;
  onClose: () => void;
}

export const SlittingOutputModal: React.FC<SlittingOutputModalProps> = ({ job, onClose }) => {
  const { recordSlittingOutput } = useProduction();

  // Initial slit cut if output already recorded or default based on incoming
  const defaultCuts: SlitCut[] = job.outputDetails?.slitCuts || [
    {
      id: 'cut-1',
      widthMm: Math.round(job.incomingWidth / 4),
      numberOfCuts: 4,
      remarks: 'Primary precision slit width',
    },
  ];

  const [slitCuts, setSlitCuts] = useState<SlitCut[]>(defaultCuts);
  const [totalFinishedWeight, setTotalFinishedWeight] = useState<number>(
    job.outputDetails?.totalFinishedWeightKg || Math.round(job.incomingWeight * 0.975)
  );
  const [scrapWeight, setScrapWeight] = useState<number>(
    job.outputDetails?.scrapWeightKg || Math.round(job.incomingWeight * 0.025)
  );
  const [totalBundles, setTotalBundles] = useState<number>(
    job.outputDetails?.totalBundles || 12
  );
  const [reelsOrReamsPerBundle, setReelsOrReamsPerBundle] = useState<number>(
    job.outputDetails?.reelsOrReamsPerBundle || 4
  );
  const [packagingType, setPackagingType] = useState<SlittingOutput['packagingType']>(
    job.outputDetails?.packagingType || 'Corrugated Boxes'
  );
  const [operatorName, setOperatorName] = useState<string>(
    job.outputDetails?.operatorName || 'Suresh Patil (Sr. Slitter)'
  );
  const [machineId, setMachineId] = useState<string>(
    job.outputDetails?.machineId || job.assignedMachine || 'Precision Slitter #1'
  );
  const [qualityPassed, setQualityPassed] = useState<boolean>(
    job.outputDetails ? job.outputDetails.qualityPassed : true
  );
  const [productionNotes, setProductionNotes] = useState<string>(
    job.outputDetails?.productionNotes ||
      'Edge burr < 0.02mm, widths verified with digital vernier, tightly wrapped with anti-corrosion film.'
  );

  const handleAddCut = () => {
    const newCut: SlitCut = {
      id: 'cut-' + Date.now(),
      widthMm: 50,
      numberOfCuts: 2,
      remarks: '',
    };
    setSlitCuts([...slitCuts, newCut]);
  };

  const handleRemoveCut = (id: string) => {
    if (slitCuts.length === 1) return;
    setSlitCuts(slitCuts.filter((c) => c.id !== id));
  };

  const handleCutChange = (id: string, field: keyof SlitCut, value: any) => {
    setSlitCuts(
      slitCuts.map((cut) => {
        if (cut.id !== id) return cut;
        return { ...cut, [field]: value };
      })
    );
  };

  const calculateYield = () => {
    if (!job.incomingWeight || job.incomingWeight === 0) return 100;
    const y = (totalFinishedWeight / job.incomingWeight) * 100;
    return Math.min(100, Math.max(0, Number(y.toFixed(1))));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const output: SlittingOutput = {
      grade: job.grade,
      thickness: job.thickness,
      thicknessUnit: job.thicknessUnit,
      slitCuts,
      totalFinishedWeightKg: Number(totalFinishedWeight),
      scrapWeightKg: Number(scrapWeight),
      yieldPercentage: calculateYield(),
      bundleWeightKg: job.outputDetails?.bundleWeightKg || (job.bundleSpecs?.targetBundleWeightKg || 28),
      bundleUnitType: (job.bundleSpecs?.unitType === 'reams' ? 'reams' : 'reels'),
      unitsPerBundle: Number(reelsOrReamsPerBundle),
      reelsOrReamsPerBundle: Number(reelsOrReamsPerBundle),
      totalBundles: Number(totalBundles),
      packagingType,
      operatorName,
      machineId,
      qualityPassed,
      productionNotes,
    };

    recordSlittingOutput(job.id, output);
    onClose();
  };

  const totalSlitWidthCalculated = slitCuts.reduce(
    (sum, cut) => sum + (Number(cut.widthMm) || 0) * (Number(cut.numberOfCuts) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/30 border border-purple-400/30 rounded-lg text-purple-300">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Record Slitting & Packaging Output</h3>
              <p className="text-xs text-slate-300 font-mono">
                Job #{job.jobNo} • {job.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Incoming Material Reference Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Grade</span>
              <span className="font-bold text-slate-800">{job.grade}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Incoming Size</span>
              <span className="font-bold text-slate-800">
                {job.thickness}{job.thicknessUnit} × {job.incomingWidth}mm
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Incoming Weight</span>
              <span className="font-bold text-slate-800">{job.incomingWeight.toLocaleString()} kg</span>
            </div>
            <div>
              <span className="text-slate-500 block">Customer Target</span>
              <span className="font-medium text-slate-700 truncate block" title={job.customerInstructions}>
                {job.customerInstructions || 'Standard'}
              </span>
            </div>
          </div>

          {/* Slit Cuts Specification */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Finished Slit Sizes (Width & Cuts)
                </label>
                <span className="text-xs text-slate-500 ml-2">
                  (Total slit span: {totalSlitWidthCalculated}mm / Parent: {job.incomingWidth}mm)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddCut}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Slit Size
              </button>
            </div>

            <div className="space-y-2">
              {slitCuts.map((cut, index) => (
                <div
                  key={cut.id}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg"
                >
                  <span className="text-xs font-bold text-slate-400 w-5">#{index + 1}</span>
                  <div className="w-32">
                    <label className="text-[10px] text-slate-500 block">Width (mm)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      step={0.1}
                      value={cut.widthMm}
                      onChange={(e) => handleCutChange(cut.id, 'widthMm', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-slate-500 block">No. of Cuts</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={cut.numberOfCuts}
                      onChange={(e) => handleCutChange(cut.id, 'numberOfCuts', parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 block">Application / Tag / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Primary strip, edge trim, coil #1"
                      value={cut.remarks || ''}
                      onChange={(e) => handleCutChange(cut.id, 'remarks', e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700"
                    />
                  </div>
                  {slitCuts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCut(cut.id)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded transition self-end"
                      title="Remove cut row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weight & Yield Reconciliation */}
          <div className="border-t border-slate-200 pt-4">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-3">
              Weight & Yield Reconciliation
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  Total Finished Weight (kg) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    step={0.5}
                    value={totalFinishedWeight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTotalFinishedWeight(val);
                      if (job.incomingWeight > val) {
                        setScrapWeight(job.incomingWeight - val);
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                  />
                  <Scale className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  Scrap / Edge Trim Loss (kg)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={scrapWeight}
                  onChange={(e) => setScrapWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex flex-col justify-center">
                <span className="text-[11px] text-emerald-800 font-medium">Process Recovery Yield</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {calculateYield()}%
                </span>
                <span className="text-[10px] text-emerald-600">
                  Input: {job.incomingWeight} kg → Output: {totalFinishedWeight} kg
                </span>
              </div>
            </div>
          </div>

          {/* Packaging Details (Requested by user: how many bundles, reels per bundle, boxes) */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-purple-600" />
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Packaging & Bundling Configuration
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  Total Bundles / Boxes / Packets <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={totalBundles}
                  onChange={(e) => setTotalBundles(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  Reels / Reams per Bundle <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={reelsOrReamsPerBundle}
                  onChange={(e) => setReelsOrReamsPerBundle(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  Packaging Material Style
                </label>
                <select
                  value={packagingType}
                  onChange={(e) => setPackagingType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                >
                  <option value="Corrugated Boxes">Corrugated Boxes</option>
                  <option value="Bundles with Strapping">Bundles with Strapping</option>
                  <option value="Wooden Crates">Palletized Wooden Crates</option>
                  <option value="Packets with Stretch Film">Packets with VCI Stretch Film</option>
                  <option value="Custom Pallets">Custom Heavy Duty Pallets</option>
                </select>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              Total manufactured items: {totalBundles * reelsOrReamsPerBundle} individual slit reels/reams arranged in {totalBundles} {packagingType.toLowerCase()}.
            </div>
          </div>

          {/* Machine & Operator Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Slitting Machine Used</label>
              <input
                type="text"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Operator / Lead In-charge</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white"
              />
            </div>
          </div>

          {/* Quality Pass & Notes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
              <input
                type="checkbox"
                checked={qualityPassed}
                onChange={(e) => setQualityPassed(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Quality Inspection Passed (Widths, Burr Height & Packaging verified according to customer instructions)
              </span>
            </label>

            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">
                Production & Slitting Remarks (Visible on Delivery Slip & Customer App)
              </label>
              <textarea
                rows={2}
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white"
                placeholder="Remarks regarding tolerances, burr removal, strapping..."
              />
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 shrink-0">
            <span className="text-xs text-slate-500">
              Saving moves status to <strong className="text-emerald-700 font-semibold">Ready for Dispatch</strong>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Scissors className="w-3.5 h-3.5" />
                Save Slitting Output
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
