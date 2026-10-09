import React, { useState } from 'react';
import { BundleRecord, CoreType } from '../types';
import { useProduction } from '../context/ProductionContext';
import {
  X,
  Pencil,
  AlertCircle,
  CheckCircle2,
  Ban,
  Scale,
  RotateCcw,
  Info,
  Clock,
  User
} from 'lucide-react';

interface EditBundleModalProps {
  jobId: string;
  bundle: BundleRecord;
  onClose: () => void;
}

export const EditBundleModal: React.FC<EditBundleModalProps> = ({ jobId, bundle, onClose }) => {
  const { editBundleInJob, voidBundleInJob } = useProduction();

  const [grossWeight, setGrossWeight] = useState<number>(bundle.grossWeightKg);
  const [coreType, setCoreType] = useState<CoreType>(bundle.coreType);
  const [paperCoreTare, setPaperCoreTare] = useState<number>(bundle.paperCoreTareWeightKg || 1.2);
  const [totalRollsCount, setTotalRollsCount] = useState<number>(bundle.totalRollsCount || 10);
  const [rollsSummary, setRollsSummary] = useState<string>(bundle.rollsSummary || '');
  const [notes, setNotes] = useState<string>(bundle.notes || '');
  const [reason, setReason] = useState<string>('');
  const [editedBy, setEditedBy] = useState<string>('Sunil Patil (Production & Dispatch Manager)');

  // Voiding state
  const [showVoidConfirm, setShowVoidConfirm] = useState<boolean>(false);
  const [voidReason, setVoidReason] = useState<string>('');

  const activeTare = coreType === 'paper_core' ? Number(paperCoreTare) : 0;
  const calculatedNet = Number((Number(grossWeight) - activeTare).toFixed(2));

  const hasChanges =
    grossWeight !== bundle.grossWeightKg ||
    coreType !== bundle.coreType ||
    (coreType === 'paper_core' && paperCoreTare !== bundle.paperCoreTareWeightKg) ||
    rollsSummary !== bundle.rollsSummary ||
    totalRollsCount !== bundle.totalRollsCount ||
    notes !== (bundle.notes || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide an audit justification / reason for correcting this bundle record.');
      return;
    }

    editBundleInJob(jobId, bundle.id, {
      grossWeightKg: Number(grossWeight),
      coreType,
      paperCoreTareWeightKg: activeTare,
      rollsSummary,
      totalRollsCount: Number(totalRollsCount),
      notes,
      reason,
      editedBy,
    });

    onClose();
  };

  const handleVoid = () => {
    if (!voidReason.trim()) {
      alert('Please provide a reason for voiding this bundle record.');
      return;
    }

    voidBundleInJob(jobId, bundle.id, voidReason, editedBy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Correct Bundle #{bundle.bundleNumber}</h2>
                <span className="font-mono text-xs text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700">
                  {bundle.bundleTag}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Transparent Correction Audit: Mistakes are tracked, never hidden.
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

        {/* Audit Trail Policy Notice */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            This bundle will maintain an immutable edit history showing both previous and new weights with your reason.
          </span>
        </div>

        {showVoidConfirm ? (
          /* VOID BUNDLE CONFIRMATION VIEW */
          <div className="p-6 space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-950">
                <Ban className="w-5 h-5 text-rose-600" />
                <span>Mark Bundle as Void / Struck Out</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Rather than secretly deleting the bundle, it will be kept in the audit ledger marked as <strong>VOID</strong> with your explanation. This prevents missing tag numbers or hidden floor errors.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Mandatory Reason for Voiding: <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Bundle dropped on floor and damaged, material returned to scrap rewinder."
                className="w-full px-3 py-2 border border-rose-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleVoid}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                <span>Confirm Void & Strike from Active Inventory</span>
              </button>
            </div>
          </div>
        ) : (
          /* EDIT FORM VIEW */
          <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
            {/* Weight Inputs & Core Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gross Weight */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gross Weight (kg):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  max="500"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                  Original: {bundle.grossWeightKg} kg
                </span>
              </div>

              {/* Core Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Core type:
                </label>
                <select
                  value={coreType}
                  onChange={(e) => setCoreType(e.target.value as CoreType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="paper_core">Paper Tube</option>
                  <option value="pvc_core">Plastic Tube</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Original: {bundle.coreType === 'paper_core' ? 'Paper Tube' : 'Plastic Tube'}
                </span>
              </div>
            </div>

            {/* Paper Core Tare (if Paper Core) */}
            {coreType === 'paper_core' && (
              <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <span>Paper Core Total Tare Deduction (kg):</span>
                  <span className="font-mono text-amber-700">-{paperCoreTare.toFixed(2)} kg</span>
                </div>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  value={paperCoreTare}
                  onChange={(e) => setPaperCoreTare(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            )}

            {/* Live Net Weight Recalculation Strip */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">
                  Recalculated Net Weight:
                </span>
                <span className="text-[11px] text-emerald-700">
                  Gross ({grossWeight} kg) - Tare ({activeTare.toFixed(2)} kg)
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-xl text-emerald-950">
                  {calculatedNet.toFixed(2)} kg
                </span>
                {bundle.netWeightKg !== calculatedNet && (
                  <span className="text-[11px] text-amber-800 font-mono block">
                    (Was {bundle.netWeightKg.toFixed(2)} kg)
                  </span>
                )}
              </div>
            </div>

            {/* Rolls Specification */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rolls Count:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={totalRollsCount}
                  onChange={(e) => setTotalRollsCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rolls Cut Description:
                </label>
                <input
                  type="text"
                  value={rollsSummary}
                  onChange={(e) => setRollsSummary(e.target.value)}
                  placeholder="e.g. 10 reels × 25mm"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>
            </div>

            {/* Mandatory Reason for Edit / Mistake Correction */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Reason for Correction / Mistake Explanation: <strong className="text-rose-600">*</strong></span>
                <span className="text-[10px] text-slate-500">Immutable Audit Entry</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Zero-offset on floor scale calibrated; corrected tare deduction from PVC to Paper Core."
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                required
              />
            </div>

            {/* Editor Signature */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Corrections Officer / Manager:
              </label>
              <input
                type="text"
                value={editedBy}
                onChange={(e) => setEditedBy(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-medium text-slate-700"
              />
            </div>

            {/* Past Edit History if already edited */}
            {bundle.editHistory && bundle.editHistory.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Previous Corrections Log ({bundle.editHistory.length}):
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {bundle.editHistory.map((h, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] text-slate-700 space-y-0.5"
                    >
                      <div className="flex justify-between font-mono font-semibold">
                        <span>
                          Gross: {h.previousGross}kg ➔ {h.newGross}kg | Net: {h.previousNet}kg ➔ {h.newNet}kg
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(h.editedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="italic text-slate-600">&ldquo;{h.reason}&rdquo;</div>
                      <div className="text-[10px] text-slate-400">By {h.editedBy}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowVoidConfirm(true)}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Void this Bundle</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges && !reason.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Correction & Log Audit</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
