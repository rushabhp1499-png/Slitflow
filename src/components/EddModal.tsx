import React, { useState } from 'react';
import { MaterialInward } from '../types';
import { useProduction } from '../context/ProductionContext';
import { Calendar, Clock, X, Bell, History } from 'lucide-react';

interface EddModalProps {
  job: MaterialInward;
  onClose: () => void;
}

export const EddModal: React.FC<EddModalProps> = ({ job, onClose }) => {
  const { updateEstimatedDeliveryDate } = useProduction();

  // Calculate default helper dates
  const today = new Date();
  const getOffsetDate = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [eddDate, setEddDate] = useState<string>(
    job.estimatedDeliveryDate || getOffsetDate(3)
  );
  const [note, setNote] = useState<string>('');
  const [changedBy, setChangedBy] = useState<string>('Factory Production Manager');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handlePresetSelect = (days: number) => {
    setEddDate(getOffsetDate(days));
    setNote(`Scheduled for ${days} days turnaround.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eddDate) return;

    updateEstimatedDeliveryDate(job.id, eddDate, note, changedBy);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-400/30 rounded-lg text-blue-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Estimated Delivery Date (EDD)</h3>
              <p className="text-xs text-slate-300 font-mono">Job #{job.jobNo} • {job.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Material Quick Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Material Grade:</span>
              <span className="font-semibold text-slate-800">{job.grade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Incoming Specs:</span>
              <span className="font-medium text-slate-700">
                {job.thickness} {job.thicknessUnit} × {job.incomingWidth}mm • {job.incomingWeight.toLocaleString()} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Status:</span>
              <span className="font-semibold text-blue-700 capitalize">
                {job.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
              Quick Turnaround Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect(2)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition text-center ${
                  eddDate === getOffsetDate(2)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <div className="font-bold">+2 Days</div>
                <div className="text-[10px] opacity-80">Urgent</div>
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(3)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition text-center ${
                  eddDate === getOffsetDate(3)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <div className="font-bold">+3 Days</div>
                <div className="text-[10px] opacity-80">Standard</div>
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(5)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition text-center ${
                  eddDate === getOffsetDate(5)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <div className="font-bold">+5 Days</div>
                <div className="text-[10px] opacity-80">Routine</div>
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(10)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition text-center ${
                  eddDate === getOffsetDate(10)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <div className="font-bold">+10 Days</div>
                <div className="text-[10px] opacity-80">Heavy Lot</div>
              </button>
            </div>
          </div>

          {/* Exact Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Specific Delivery Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={eddDate}
                onChange={(e) => setEddDate(e.target.value)}
                min={today.toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              The customer will immediately see this updated delivery date in their live tracking portal.
            </p>
          </div>

          {/* Notes & Authority */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Production Note / Machine Slotting
              </label>
              <input
                type="text"
                placeholder="e.g. Slitter Line 1 queued after knife setup, pending core availability"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized By (Factory Staff)
              </label>
              <input
                type="text"
                value={changedBy}
                onChange={(e) => setChangedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Previous EDD History if any */}
          {job.eddHistory && job.eddHistory.length > 0 && (
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Previous Schedule History ({job.eddHistory.length})
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                {job.eddHistory.map((hist, i) => (
                  <div key={i} className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-slate-800">{hist.date}</span>
                      <span className="text-slate-500 ml-1.5">• {hist.changedBy}</span>
                      {hist.note && <div className="text-slate-500 italic mt-0.5">{hist.note}</div>}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(hist.setAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Notification notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2.5">
            <Bell className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong className="font-semibold">Automatic Customer Sync:</strong> Saving this will instantly update {job.customerName}&apos;s dashboard and send an in-app notification to their procurement desk.
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savedSuccess}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <Clock className="w-3.5 h-3.5" />
              {savedSuccess ? 'Updating Schedule...' : 'Save Delivery Date & Notify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
