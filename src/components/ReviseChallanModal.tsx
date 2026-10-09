import React, { useState } from 'react';
import { MaterialInward, DeliveryChallan } from '../types';
import { useProduction } from '../context/ProductionContext';
import {
  X,
  FileText,
  RotateCcw,
  AlertCircle,
  Truck,
  CheckCircle2,
  Info,
  ShieldCheck,
  Phone,
  Barcode
} from 'lucide-react';

interface ReviseChallanModalProps {
  job: MaterialInward;
  challan: DeliveryChallan;
  onClose: () => void;
  onRevisionCreated: (newChallan: DeliveryChallan) => void;
}

export const ReviseChallanModal: React.FC<ReviseChallanModalProps> = ({
  job,
  challan,
  onClose,
  onRevisionCreated,
}) => {
  const { reviseDeliveryChallan } = useProduction();

  const currentVersion = challan.version || 1;
  const nextVersion = currentVersion + 1;
  const nextRevisionLabel = `Revision ${currentVersion} (Amended)`;

  const [reason, setReason] = useState<string>('');
  const [revisedBy, setRevisedBy] = useState<string>(
    'P. Verma (Authorized Dispatch Officer)'
  );
  const [vehicleNo, setVehicleNo] = useState<string>(challan.vehicleNo || '');
  const [transporterName, setTransporterName] = useState<string>(
    challan.transporterName || ''
  );
  const [driverPhone, setDriverPhone] = useState<string>(challan.driverPhone || '');
  const [eWayBillNo, setEWayBillNo] = useState<string>(challan.eWayBillNo || '');
  const [dispatchWeight, setDispatchWeight] = useState<number>(
    challan.thisDispatchWeightKg
  );
  const [totalBundles, setTotalBundles] = useState<number>(challan.totalBundles);
  const [remarks, setRemarks] = useState<string>(
    challan.items?.[0]?.remarks || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a mandatory audit reason for revising this delivery challan.');
      return;
    }

    const revised = reviseDeliveryChallan(job.id, challan.id, {
      reason,
      revisedBy,
      vehicleNo,
      transporterName,
      driverPhone,
      eWayBillNo,
      thisDispatchWeightKg: Number(dispatchWeight),
      totalBundles: Number(totalBundles),
      remarks,
    });

    onRevisionCreated(revised);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Amend Delivery Challan</h2>
                <span className="font-mono text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
                  {nextRevisionLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Current Challan: {challan.challanNo} (v{currentVersion}) • Job #{job.jobNo}
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

        {/* Audit Compliance Notice */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-start gap-2.5 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold">Rule 55 CGST Immutable Versioning:</strong>
            <p className="leading-relaxed text-blue-800">
              The existing challan will be preserved as a historical superseded record. A new revision number will be stamped, and your explanation will be permanently recorded in the revision audit trail.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Mandatory Reason for Revision */}
          <div>
            <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center justify-between">
              <span>Reason for Amendment / Correction: <strong className="text-rose-600">*</strong></span>
              <span className="text-[10px] text-slate-400">Required on revised challan</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Transporter vehicle changed due to breakdown (updated to DL-01-AB-4450), or weight recount verified on scale."
              className="w-full px-3 py-2 border border-amber-300 bg-amber-50/30 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Vehicle & Logistics Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Transport & Dispatch Logistics
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Vehicle No:
                </label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Transporter Name:
                </label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Driver Contact Phone:
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  E-Way Bill Number:
                </label>
                <input
                  type="text"
                  value={eWayBillNo}
                  onChange={(e) => setEWayBillNo(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Quantities & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dispatched Weight (kg):
              </label>
              <input
                type="number"
                step="0.1"
                value={dispatchWeight}
                onChange={(e) => setDispatchWeight(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Bundles Count:
              </label>
              <input
                type="number"
                min="1"
                value={totalBundles}
                onChange={(e) => setTotalBundles(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900"
                required
              />
            </div>
          </div>

          {/* Challan Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Challan Item Remarks / Particulars:
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800"
            />
          </div>

          {/* Revised By Signature */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Authorized Officer Sign-off:
            </label>
            <input
              type="text"
              value={revisedBy}
              onChange={(e) => setRevisedBy(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-medium text-slate-700"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Issue {nextRevisionLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
