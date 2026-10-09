import React, { useState } from 'react';
import { MaterialInward, SpecChangeRequest } from '../types';
import { useProduction } from '../context/ProductionContext';
import {
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  FileText,
  User,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface SpecChangeApprovalModalProps {
  job: MaterialInward;
  onClose: () => void;
}

export const SpecChangeApprovalModal: React.FC<SpecChangeApprovalModalProps> = ({ job, onClose }) => {
  const { approveSpecChange, rejectSpecChange } = useProduction();

  const requests = job.specChangeRequests || [];
  const pendingRequests = requests.filter((r) => r.status === 'pending_approval');
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    pendingRequests[0]?.id || requests[0]?.id || ''
  );

  const activeRequest = requests.find((r) => r.id === selectedRequestId) || pendingRequests[0];

  const [reviewNote, setReviewNote] = useState<string>(
    'Approved. Machine blade spacing adjusted to customer specification. Operator notified.'
  );
  const [rejectionReason, setRejectionReason] = useState<string>(
    'Unable to amend specs: slitting already completed on Line 3 for this batch.'
  );
  const [reviewerName, setReviewerName] = useState<string>(
    'Sunil Patil (Production & Operations Master)'
  );
  const [activeTab, setActiveTab] = useState<'review' | 'history'>('review');

  const handleApprove = () => {
    if (!activeRequest) return;
    if (!reviewNote.trim()) {
      alert('Please provide an approval note / instructions for the shop floor.');
      return;
    }
    approveSpecChange(job.id, activeRequest.id, reviewNote, reviewerName);
    onClose();
  };

  const handleReject = () => {
    if (!activeRequest) return;
    if (!rejectionReason.trim()) {
      alert('Please enter the reason for rejecting this specification change.');
      return;
    }
    rejectSpecChange(job.id, activeRequest.id, rejectionReason, reviewerName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/30 text-purple-300 rounded-xl border border-purple-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Customer Specification Change Request</h2>
                <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                  PO #{job.customerPoNo}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {job.customerName} • Job #{job.jobNo}
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

        {/* Modal Navigation tabs if multiple requests */}
        {requests.length > 1 && (
          <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center gap-2 text-xs overflow-x-auto">
            <span className="text-slate-500 font-medium">Request History:</span>
            {requests.map((r, idx) => {
              const isSelected = r.id === activeRequest?.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRequestId(r.id)}
                  className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>Request #{idx + 1}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      r.status === 'pending_approval'
                        ? 'bg-amber-100 text-amber-900'
                        : r.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-rose-100 text-rose-900'
                    }`}
                  >
                    {r.status === 'pending_approval' ? 'Pending' : r.status}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!activeRequest ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No specification change requests found for this job.
            </div>
          ) : (
            <>
              {/* Backtrack Specification Comparison Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Backtrack Specification Comparison
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      activeRequest.status === 'pending_approval'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                        : activeRequest.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    {activeRequest.status === 'pending_approval'
                      ? 'Awaiting Factory Approval'
                      : activeRequest.status === 'approved'
                      ? 'Approved & Applied'
                      : 'Declined by Factory'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Active Specs (Backtrack Source) */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Original Production Specs
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                        Current Baseline
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Slit Cut Width:</span>
                        <strong className="text-slate-900 font-mono text-sm">
                          {activeRequest.originalSpecs.slitWidthMm || 20} mm
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Target Bundle Weight:</span>
                        <strong className="text-slate-900 font-mono">
                          ~{activeRequest.originalSpecs.targetBundleWeightKg || 25} kg
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Units per Bundle:</span>
                        <strong className="text-slate-900 font-mono">
                          {activeRequest.originalSpecs.unitsPerBundle || 10}{' '}
                          {activeRequest.originalSpecs.unitType || 'reels'}
                        </strong>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-500 text-[11px] block mb-1">
                          Original Customer Notes:
                        </span>
                        <p className="text-slate-700 italic bg-white p-2 rounded border border-slate-200">
                          {activeRequest.originalSpecs.customerInstructions || 'Standard slitting specification'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Requested Amendments */}
                  <div className="bg-purple-50/70 rounded-xl p-4 border-2 border-purple-300 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                      <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                        Requested Amendments
                      </span>
                      <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded font-mono font-bold">
                        Pending Action
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center bg-white p-2 rounded border border-purple-200">
                        <span className="text-purple-800 font-medium">New Slit Cut Width:</span>
                        <div className="text-right">
                          <span className="font-mono font-black text-purple-950 text-base">
                            {activeRequest.requestedSpecs.slitWidthMm || 'Unchanged'} mm
                          </span>
                          {activeRequest.requestedSpecs.slitWidthMm &&
                            activeRequest.originalSpecs.slitWidthMm !== activeRequest.requestedSpecs.slitWidthMm && (
                              <span className="block text-[10px] text-amber-700 font-bold">
                                (Change: {activeRequest.originalSpecs.slitWidthMm}mm ➔ {activeRequest.requestedSpecs.slitWidthMm}mm)
                              </span>
                            )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded border border-purple-200">
                        <span className="text-purple-800 font-medium">Target Bundle Weight:</span>
                        <span className="font-mono font-bold text-purple-950">
                          ~{activeRequest.requestedSpecs.targetBundleWeightKg || activeRequest.originalSpecs.targetBundleWeightKg} kg
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded border border-purple-200">
                        <span className="text-purple-800 font-medium">Packaging Units:</span>
                        <span className="font-mono font-bold text-purple-950">
                          {activeRequest.requestedSpecs.unitsPerBundle || activeRequest.originalSpecs.unitsPerBundle}{' '}
                          {activeRequest.requestedSpecs.unitType || activeRequest.originalSpecs.unitType}
                        </span>
                      </div>

                      <div className="pt-1">
                        <span className="text-purple-900 font-bold text-[11px] block mb-1">
                          Updated Instructions:
                        </span>
                        <p className="text-purple-950 bg-white p-2 rounded border border-purple-200 leading-relaxed font-medium">
                          {activeRequest.requestedSpecs.customerInstructions}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Justification / Reason */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Customer&apos;s Reason for Amendment:
                  </span>
                  <span className="text-[11px] text-amber-800 font-mono">
                    Requested on {new Date(activeRequest.requestedAt).toLocaleString()} by {activeRequest.requestedByEmail}
                  </span>
                </div>
                <p className="text-amber-900 font-medium leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200">
                  &ldquo;{activeRequest.reason}&rdquo;
                </p>
              </div>

              {/* Review Section if Pending */}
              {activeRequest.status === 'pending_approval' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-4 h-4 text-blue-600" />
                      Factory Master Approval Sign-off
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Approval automatically updates active job specs & notifies customer
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Operations Review / Floor Instructions Note:
                    </label>
                    <textarea
                      rows={2}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="e.g. Approved. Setup sheet updated for slitter operator. Blade alignment set to 25mm."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="w-full sm:w-auto text-xs text-slate-600">
                      Reviewer: <strong>{reviewerName}</strong>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={handleReject}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Decline Request</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApprove}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Apply to Floor</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Already Reviewed Sign-off details */
                <div className="bg-slate-100 rounded-xl p-4 text-xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Decision Recorded on{' '}
                    {activeRequest.reviewedAt
                      ? new Date(activeRequest.reviewedAt).toLocaleString()
                      : 'Audit Log'}
                  </div>
                  <p className="text-slate-600">
                    Reviewed By: <strong>{activeRequest.reviewedBy || 'Factory Master'}</strong>
                  </p>
                  <p className="text-slate-700 italic bg-white p-2.5 rounded border border-slate-200 mt-2">
                    &ldquo;{activeRequest.reviewNote}&rdquo;
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>All decisions permanently committed to immutable order audit log</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-800 font-semibold rounded-lg border border-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
