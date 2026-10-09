import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward } from '../types';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  X,
  Scale,
  Calendar,
  Building2
} from 'lucide-react';

interface PoCloseModalProps {
  job: MaterialInward;
  onClose: () => void;
}

export const PoCloseModal: React.FC<PoCloseModalProps> = ({ job, onClose }) => {
  const { closeCustomerPo } = useProduction();

  const [closingNotes, setClosingNotes] = useState(
    `All slitted material delivered in full reconciliation. Inward raw material ${job.incomingWeight} kg fully accounted for. PO permanently closed.`
  );
  const [closedByName, setClosedByName] = useState('Works Manager (R. K. Sharma)');
  const [confirmed, setConfirmed] = useState(true);

  const totalDispatched = job.dispatchedWeightKg || (job.challans?.reduce((acc, c) => acc + c.thisDispatchWeightKg, 0) || 0);
  const scrapWeight = job.outputDetails?.scrapWeightKg || 0;
  const totalAccounted = totalDispatched + scrapWeight;
  const variance = job.incomingWeight - totalAccounted;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeCustomerPo(job.id, closingNotes, closedByName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Permanently Close Customer Purchase Order
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                PO #{job.customerPoNo} • Job #{job.jobNo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Audit Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Factory Master Final Closure Action</span>
              Closing this PO permanently locks this order. Both Progressive Enterprises and {job.customerName} will see this order as Permanently Closed & Audited.
            </div>
          </div>

          {/* Reconciliation Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
              Material Weight Reconciliation
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Customer Legal Name:</span>
              <span className="font-bold text-slate-900">{job.customerName}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Inward Raw Material Received:</span>
              <span className="font-black text-blue-900">{job.incomingWeight.toLocaleString()} kg</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Total Finished Dispatched:</span>
              <span className="font-black text-emerald-900">{totalDispatched.toLocaleString()} kg</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Scrap / Trim Loss Accounted:</span>
              <span className="font-bold text-slate-800">{scrapWeight.toLocaleString()} kg</span>
            </div>

            <div className="flex justify-between py-1 bg-emerald-50/80 p-2 rounded-lg text-emerald-900">
              <span className="font-semibold">Reconciled Balance / Discrepancy:</span>
              <span className="font-black">
                {variance === 0 ? '0 kg (100% Balanced)' : `${variance} kg accounted`}
              </span>
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>Challans Issued:</span>
              <span className="font-mono font-bold text-slate-800">
                {job.challans?.length || (job.challan ? 1 : 0)} Delivery Challan(s)
              </span>
            </div>
          </div>

          {/* Form inputs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Factory Master Closing Sign-off Authority *
            </label>
            <input
              type="text"
              required
              value={closedByName}
              onChange={(e) => setClosedByName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Permanent Closure Audit Notes *
            </label>
            <textarea
              rows={3}
              required
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 leading-relaxed"
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="confirm-close"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="confirm-close" className="text-xs text-slate-600 cursor-pointer">
              I verify as Factory Master that all slitting services, bundle packaging, and delivery challans for PO #{job.customerPoNo} have been finalized and this order is permanently closed.
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!confirmed}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition shadow-xs ${
                confirmed
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Permanently Close PO</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
