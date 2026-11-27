import React, { useState } from 'react';
import { MaterialInward, ProductionStatus } from '../types';
import { useProduction, AdminOrderChanges } from '../context/ProductionContext';
import { X, Pencil, Trash2, ShieldAlert } from 'lucide-react';

interface EditOrderModalProps {
  job: MaterialInward;
  onClose: () => void;
}

const MATERIAL_TYPES: MaterialInward['materialType'][] = [
  'Plastic / Polymer Film',
  'Kraft Paper Reel',
  'Steel Coil / Sheet',
  'Aluminum Coil',
  'Copper / Brass Strip',
  'Other',
];

const STATUSES: { value: ProductionStatus; label: string }[] = [
  { value: 'received', label: 'Material received' },
  { value: 'pending_production', label: 'In queue' },
  { value: 'in_production', label: 'Under slitting' },
  { value: 'slitting_completed', label: 'Slitting completed' },
  { value: 'ready_for_dispatch', label: 'Ready for dispatch' },
  { value: 'partially_dispatched', label: 'Partially dispatched' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'po_closed', label: 'PO closed' },
];

// Owner/developer only: correct any detail of an order, or delete it.
export const EditOrderModal: React.FC<EditOrderModalProps> = ({ job, onClose }) => {
  const { customers, adminUpdateOrder, deleteOrder } = useProduction();

  const [form, setForm] = useState({
    customerId: job.customerId,
    customerPoNo: job.customerPoNo,
    inwardChallanNo: job.inwardChallanNo || '',
    vehicleNo: job.vehicleNo || '',
    receivedDate: job.receivedDate || '',
    materialType: job.materialType,
    grade: job.grade || '',
    thickness: String(job.thickness ?? ''),
    thicknessUnit: job.thicknessUnit,
    incomingWidth: String(job.incomingWidth ?? ''),
    lotDetails: job.lotDetails || '',
    incomingLength: String(job.incomingLength ?? ''),
    incomingWeight: String(job.incomingWeight ?? ''),
    coilsOrRollsCount: String(job.coilsOrRollsCount ?? ''),
    customerInstructions: job.customerInstructions || '',
    status: job.status,
  });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleting, setDeleting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const num = (v: string) => Number(v) || 0;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerPoNo.trim()) return setError('The PO number cannot be blank.');
    if (!reason.trim()) return setError('Write why you are changing this order.');

    const next: AdminOrderChanges = {
      customerId: form.customerId,
      customerPoNo: form.customerPoNo.trim(),
      inwardChallanNo: form.inwardChallanNo.trim(),
      vehicleNo: form.vehicleNo.trim().toUpperCase() || '—',
      receivedDate: form.receivedDate,
      materialType: form.materialType,
      grade: form.grade.trim(),
      thickness: num(form.thickness),
      thicknessUnit: form.thicknessUnit,
      incomingWidth: num(form.incomingWidth),
      lotDetails: form.lotDetails.trim(),
      incomingLength: num(form.incomingLength),
      incomingWeight: num(form.incomingWeight),
      coilsOrRollsCount: num(form.coilsOrRollsCount),
      customerInstructions: form.customerInstructions,
      status: form.status,
    };
    // Send only what actually changed.
    const changes: AdminOrderChanges = {};
    (Object.keys(next) as (keyof AdminOrderChanges)[]).forEach(k => {
      if ((next[k] ?? '') !== (job[k] ?? '')) (changes as Record<string, unknown>)[k] = next[k];
    });
    if (Object.keys(changes).length === 0) return setError('Nothing has changed.');

    adminUpdateOrder(job.id, changes, reason.trim());
    onClose();
  };

  const remove = async () => {
    setDeleting(true);
    const result = await deleteOrder(job.id);
    setDeleting(false);
    if (!result.success) return setError(result.message);
    onClose();
  };

  const input = 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600';
  const label = 'block text-xs font-bold text-slate-700 mb-1';
  const challanCount = (job.challans || []).length;
  const bundleCount = (job.bundles || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-6">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-lg text-amber-300">
              <Pencil className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold">Edit Order</h2>
              <p className="text-xs text-slate-400 truncate font-mono">
                {job.jobNo} • PO {job.customerPoNo} • {job.customerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={save} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Owner / developer correction. Challans already made keep their printed details; edit or revise them in the
              Challan Manager. Every change is saved in the Activity Log with your reason.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Customer</label>
              <select value={form.customerId} onChange={set('customerId')} className={input}>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>PO number</label>
              <input value={form.customerPoNo} onChange={set('customerPoNo')} className={input} />
            </div>
            <div>
              <label className={label}>Status</label>
              <select value={form.status} onChange={set('status')} className={input}>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Received date</label>
              <input type="date" value={form.receivedDate} onChange={set('receivedDate')} className={input} />
            </div>
            <div>
              <label className={label}>Customer's challan no.</label>
              <input value={form.inwardChallanNo} onChange={set('inwardChallanNo')} className={input} />
            </div>
            <div>
              <label className={label}>Vehicle no.</label>
              <input value={form.vehicleNo} onChange={set('vehicleNo')} className={input} />
            </div>
            <div>
              <label className={label}>Material type</label>
              <select value={form.materialType} onChange={set('materialType')} className={input}>
                {MATERIAL_TYPES.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Grade / material</label>
              <input value={form.grade} onChange={set('grade')} className={input} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Thickness</label>
                <input type="number" step="any" value={form.thickness} onChange={set('thickness')} className={input} />
              </div>
              <div>
                <label className={label}>Unit</label>
                <select value={form.thicknessUnit} onChange={set('thicknessUnit')} className={input}>
                  <option value="microns">microns</option>
                  <option value="mm">mm</option>
                  <option value="gauge">gauge</option>
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Width (mm)</label>
              <input type="number" step="any" value={form.incomingWidth} onChange={set('incomingWidth')} className={input} />
            </div>
            <div>
              <label className={label}>Length (m)</label>
              <input type="number" step="any" value={form.incomingLength} onChange={set('incomingLength')} className={input} />
            </div>
            <div>
              <label className={label}>Incoming weight (kg)</label>
              <input type="number" step="any" value={form.incomingWeight} onChange={set('incomingWeight')} className={input} />
            </div>
            <div>
              <label className={label}>Rolls / coils</label>
              <input type="number" value={form.coilsOrRollsCount} onChange={set('coilsOrRollsCount')} className={input} />
            </div>
          </div>

          <div>
            <label className={label}>Lot details (mixed sizes)</label>
            <input value={form.lotDetails} onChange={set('lotDetails')} className={input} />
          </div>

          <div>
            <label className={label}>Customer instructions</label>
            <textarea rows={2} value={form.customerInstructions} onChange={set('customerInstructions')} className={input} />
          </div>

          <div>
            <label className={label}>
              Reason for this change <span className="text-red-500">*</span>
            </label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Weight entered wrongly at inward, actual 1,240 kg"
              className={input}
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">
              Save changes
            </button>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Delete this order</h3>
            <p className="text-xs text-slate-600 mb-2">
              Removes the order completely
              {bundleCount || challanCount ? `, including its ${bundleCount} bundle(s) and ${challanCount} challan(s)` : ''}.
              This cannot be undone; a copy stays in the Activity Log. Type the PO number{' '}
              <strong className="font-mono">{job.customerPoNo}</strong> to confirm.
            </p>
            <div className="flex gap-2">
              <input
                value={confirmDelete}
                onChange={e => setConfirmDelete(e.target.value)}
                placeholder={job.customerPoNo}
                className={`${input} font-mono`}
              />
              <button
                type="button"
                onClick={remove}
                disabled={confirmDelete.trim() !== job.customerPoNo || deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" /> {deleting ? 'Deleting…' : 'Delete order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
