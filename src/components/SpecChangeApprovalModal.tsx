import React, { useState } from 'react';
import { MaterialInward, SpecChangeRequest } from '../types';
import { useProduction } from '../context/ProductionContext';
import { formatKg } from '../utils/weight';
import { X, AlertCircle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface SpecChangeApprovalModalProps {
  job: MaterialInward;
  onClose: () => void;
}

type Specs = SpecChangeRequest['originalSpecs'];

const SpecColumn: React.FC<{ title: string; specs: Specs; highlight?: boolean }> = ({ title, specs, highlight }) => (
  <div
    className={`rounded-xl p-3.5 space-y-2 text-xs ${
      highlight ? 'bg-purple-50/70 border-2 border-purple-300' : 'bg-slate-50 border border-slate-200'
    }`}
  >
    <span className={`font-bold uppercase tracking-wider text-[10px] block ${highlight ? 'text-purple-900' : 'text-slate-500'}`}>
      {title}
    </span>
    <div>
      <span className="text-slate-500 text-[11px]">Slitting sizes</span>
      {specs.slitSizes && specs.slitSizes.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5">
          {specs.slitSizes.map((s) => (
            <li key={s.id} className="font-mono font-bold text-slate-900">
              {s.widthMm} mm – {formatKg(s.quantityKg)} kg
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono font-bold text-slate-900">{specs.slitWidthMm ? `${specs.slitWidthMm} mm` : '—'}</p>
      )}
    </div>
    <div className="flex justify-between">
      <span className="text-slate-500">Max bundle</span>
      <strong className="font-mono text-slate-900">{specs.targetBundleWeightKg ? `${specs.targetBundleWeightKg} kg` : '—'}</strong>
    </div>
    <div className="flex justify-between">
      <span className="text-slate-500">Units per bundle</span>
      <strong className="font-mono text-slate-900">
        {specs.unitsPerBundle ? `${specs.unitsPerBundle} ${specs.unitType || ''}` : '—'}
      </strong>
    </div>
    {specs.customerInstructions && (
      <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 leading-snug">{specs.customerInstructions}</p>
    )}
  </div>
);

// Factory reviews a customer's change request: approve applies it to the order.
export const SpecChangeApprovalModal: React.FC<SpecChangeApprovalModalProps> = ({ job, onClose }) => {
  const { approveSpecChange, rejectSpecChange, jobs } = useProduction();
  const liveJob = jobs.find((j) => j.id === job.id) || job;

  const requests = liveJob.specChangeRequests || [];
  const pending = requests.filter((r) => r.status === 'pending_approval');
  const [selectedId, setSelectedId] = useState<string>(pending[0]?.id || requests[requests.length - 1]?.id || '');
  const active = requests.find((r) => r.id === selectedId) || pending[0];

  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleApprove = () => {
    if (!active) return;
    approveSpecChange(liveJob.id, active.id, note.trim() || 'Approved.');
    onClose();
  };

  const handleReject = () => {
    if (!active) return;
    if (!note.trim()) {
      setError('Please write a short reason for declining, so the customer knows why.');
      return;
    }
    rejectSpecChange(liveJob.id, active.id, note.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-purple-600/30 text-purple-300 rounded-xl border border-purple-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">Customer Change Request</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                PO {liveJob.customerPoNo} • {liveJob.customerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {requests.length > 1 && (
          <div className="bg-slate-100 px-5 py-2 border-b border-slate-200 flex items-center gap-2 text-xs overflow-x-auto">
            {requests.map((r, idx) => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedId(r.id);
                  setNote('');
                  setError('');
                }}
                className={`px-3 py-1 rounded-md font-bold whitespace-nowrap ${
                  r.id === active?.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                Request {idx + 1} • {r.status === 'pending_approval' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Declined'}
              </button>
            ))}
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-4">
          {!active ? (
            <p className="text-center py-12 text-slate-500 text-sm">No change requests on this order.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SpecColumn title="Current" specs={active.originalSpecs} />
                <SpecColumn title="Requested" specs={{ ...active.originalSpecs, ...active.requestedSpecs }} highlight />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Customer's reason
                  </span>
                  <span className="text-[11px] text-amber-800">
                    {new Date(active.requestedAt).toLocaleString('en-IN')} • {active.requestedByEmail}
                  </span>
                </div>
                <p className="text-amber-900 font-medium">&ldquo;{active.reason}&rdquo;</p>
              </div>

              {active.status === 'pending_approval' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Note to the customer <span className="text-slate-400 font-normal">(required if declining)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Approved, blades reset to 25 mm  /  Declined: slitting already finished"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  {error && <p className="text-xs text-red-700">{error}</p>}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleReject}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Decline
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Apply
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 rounded-xl p-3.5 text-xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    {active.status === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    {active.status === 'approved' ? 'Approved' : 'Declined'} by {active.reviewedBy || 'factory'}
                    {active.reviewedAt ? ` on ${new Date(active.reviewedAt).toLocaleString('en-IN')}` : ''}
                  </div>
                  {active.reviewNote && <p className="text-slate-700 italic">&ldquo;{active.reviewNote}&rdquo;</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
