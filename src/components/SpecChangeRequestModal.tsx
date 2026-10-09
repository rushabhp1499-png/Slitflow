import React, { useState } from 'react';
import { MaterialInward } from '../types';
import { useProduction } from '../context/ProductionContext';
import {
  X,
  RotateCcw,
  AlertCircle,
  Scissors,
  CheckCircle2,
  Info,
  ArrowRight
} from 'lucide-react';

interface SpecChangeRequestModalProps {
  job: MaterialInward;
  onClose: () => void;
}

export const SpecChangeRequestModal: React.FC<SpecChangeRequestModalProps> = ({ job, onClose }) => {
  const { requestSpecChange, authenticatedEmail } = useProduction();

  const currentSlitWidth =
    job.outputDetails?.slitCuts?.[0]?.widthMm ||
    (job.bundleSpecs ? 20 : 20);
  const currentBundleWeight = job.bundleSpecs?.targetBundleWeightKg || 25;
  const currentUnitsPerBundle = job.bundleSpecs?.unitsPerBundle || 10;
  const currentUnitType = job.bundleSpecs?.unitType || 'reels';

  // Request form state
  const [requestedSlitWidth, setRequestedSlitWidth] = useState<number>(
    currentSlitWidth === 20 ? 25 : currentSlitWidth
  );
  const [requestedBundleWeight, setRequestedBundleWeight] = useState<number>(currentBundleWeight);
  const [requestedUnitsPerBundle, setRequestedUnitsPerBundle] = useState<number>(currentUnitsPerBundle);
  const [requestedUnitType, setRequestedUnitType] = useState<'reels' | 'reams'>(currentUnitType);
  const [customerInstructions, setCustomerInstructions] = useState<string>(
    `Change slit cut width to ${requestedSlitWidth}mm. Wrap bundles securely with moisture-barrier film. Target ~${requestedBundleWeight}kg bundles.`
  );
  const [reason, setReason] = useState<string>(
    'Plant production line tooling changed; urgent request to adjust slit width from 20mm to 25mm before processing.'
  );

  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason for the specification change.');
      return;
    }

    requestSpecChange(job.id, {
      requestedSpecs: {
        slitWidthMm: requestedSlitWidth,
        targetBundleWeightKg: requestedBundleWeight,
        unitsPerBundle: requestedUnitsPerBundle,
        unitType: requestedUnitType,
        customerInstructions,
      },
      reason,
      requestedByEmail: authenticatedEmail || job.customerEmail,
    });

    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/30 text-purple-300 rounded-xl border border-purple-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Request Specification Amendment</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Job #{job.jobNo} • PO #{job.customerPoNo} ({job.grade})
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

        {submitted ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-slate-900">Specification Change Request Submitted!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your requested changes (including width adjustment to {requestedSlitWidth}mm) have been transmitted to Progressive Enterprises factory operations. The original baseline specs are saved for audit backtracking.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            {/* Audit & Policy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold">Traceability & Approval Workflow:</strong>
                <p className="leading-relaxed text-blue-800">
                  Mistakes and spec changes are never silently overwritten. All amendments are logged in the backtrack audit ledger and require factory operations sign-off before blade slitter re-tooling.
                </p>
              </div>
            </div>

            {/* Current vs Proposed Specs Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Current Active Specs */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Current Active Specs
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Slit Width:</span>
                  <strong className="font-mono text-slate-900">{currentSlitWidth} mm</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Target Bundle Weight:</span>
                  <strong className="font-mono text-slate-900">~{currentBundleWeight} kg</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Packaging Units:</span>
                  <strong className="font-mono text-slate-900">
                    {currentUnitsPerBundle} {currentUnitType}/bundle
                  </strong>
                </div>
              </div>

              {/* Proposed New Specs */}
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-3 text-xs">
                <span className="font-bold text-purple-900 uppercase tracking-wider text-[10px] block">
                  Requested New Values
                </span>
                
                {/* Slit width input */}
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Requested Slit Width (mm):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      min="5"
                      max={job.incomingWidth}
                      value={requestedSlitWidth}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRequestedSlitWidth(val);
                        setCustomerInstructions(
                          `Change slit cut width to ${val}mm. Wrap bundles securely with moisture-barrier film. Target ~${requestedBundleWeight}kg bundles.`
                        );
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg font-mono font-black text-purple-950 text-sm focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    <span className="font-bold text-purple-900">mm</span>
                  </div>
                </div>

                {/* Target bundle weight */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-purple-900 mb-0.5">
                      Bundle Weight:
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="5"
                      max="60"
                      value={requestedBundleWeight}
                      onChange={(e) => setRequestedBundleWeight(Number(e.target.value))}
                      className="w-full px-2.5 py-1 bg-white border border-purple-300 rounded-md font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-purple-900 mb-0.5">
                      Units / Bundle:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={requestedUnitsPerBundle}
                      onChange={(e) => setRequestedUnitsPerBundle(Number(e.target.value))}
                      className="w-full px-2.5 py-1 bg-white border border-purple-300 rounded-md font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Updated Packaging & Cutting Instructions:
              </label>
              <textarea
                rows={2}
                value={customerInstructions}
                onChange={(e) => setCustomerInstructions(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium text-slate-800"
                required
              />
            </div>

            {/* Mandatory Reason for Spec Change */}
            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center justify-between">
                <span>Reason for Amendment / Mistake Correction: <strong className="text-rose-600">*</strong></span>
                <span className="text-[10px] text-slate-400 font-normal">Audit justification required</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Tooling error on customer line; customer requires 25mm rolls instead of 20mm."
                className="w-full px-3 py-2 border border-amber-300 bg-amber-50/40 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-slate-900"
                required
              />
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Submit Spec Amendment for Approval</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
