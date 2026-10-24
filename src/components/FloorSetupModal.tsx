import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { FloorStaff, Machine } from '../types';
import { X, Cog, Users, Plus, AlertCircle, Pencil, Check } from 'lucide-react';
import { parseStaffList } from '../utils/staffList';

interface FloorSetupModalProps {
  onClose: () => void;
}

const ROLE_LABELS: Record<FloorStaff['role'], string> = {
  operator: 'Operator',
  helper: 'Helper',
  supervisor: 'Supervisor',
  other: 'Other',
};

const inputClass = 'w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800';

// Factory list of machines and floor staff. Nobody is deleted, only marked inactive,
// so old orders keep showing who ran them.
export const FloorSetupModal: React.FC<FloorSetupModalProps> = ({ onClose }) => {
  const { machines, floorStaff, saveMachine, saveFloorStaff, floorSetupMissing } = useProduction();
  const [tab, setTab] = useState<'machines' | 'staff'>('machines');

  // Machine form (new or editing)
  const [machineForm, setMachineForm] = useState<Partial<Machine>>({ number: '', name: '', notes: '', active: true });
  // Staff form (new or editing)
  const [staffForm, setStaffForm] = useState<Partial<FloorStaff>>({ name: '', role: 'operator', phone: '', active: true });
  const [error, setError] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteResult, setPasteResult] = useState('');

  const pasted = parseStaffList(pasteText);
  const existingNames = new Set(floorStaff.map((s) => s.name.trim().toLowerCase()));
  const newPeople = pasted.filter(
    (p, i) => !existingNames.has(p.name.toLowerCase()) && pasted.findIndex((q) => q.name.toLowerCase() === p.name.toLowerCase()) === i
  );

  const addPasted = () => {
    newPeople.forEach((p) => saveFloorStaff({ ...p, active: true }));
    const skipped = pasted.length - newPeople.length;
    setPasteResult(`Added ${newPeople.length} people.${skipped ? ` Skipped ${skipped} already in the list.` : ''}`);
    setPasteText('');
    setPasteOpen(false);
  };

  const submitMachine = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const number = (machineForm.number || '').trim();
    if (!number) {
      setError('Enter a machine number, e.g. M-01.');
      return;
    }
    if (machines.some((m) => m.number.toLowerCase() === number.toLowerCase() && m.id !== machineForm.id)) {
      setError(`Machine ${number} already exists.`);
      return;
    }
    saveMachine({
      id: machineForm.id,
      number,
      name: (machineForm.name || '').trim(),
      notes: (machineForm.notes || '').trim(),
      active: machineForm.active ?? true,
    });
    setMachineForm({ number: '', name: '', notes: '', active: true });
  };

  const submitStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = (staffForm.name || '').trim();
    if (!name) {
      setError('Enter the person’s name.');
      return;
    }
    saveFloorStaff({
      id: staffForm.id,
      name,
      role: staffForm.role || 'operator',
      phone: (staffForm.phone || '').trim(),
      active: staffForm.active ?? true,
    });
    setStaffForm({ name: '', role: 'operator', phone: '', active: true });
  };

  const sortedMachines = [...machines].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  const sortedStaff = [...floorStaff].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Floor Setup</h2>
            <p className="text-xs text-slate-400">Machines and the people who run them</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {floorSetupMissing ? (
          <div className="p-6 text-sm text-amber-900 bg-amber-50 m-5 rounded-xl border border-amber-200 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              The database doesn't have the machines and staff tables yet. Run section 7 of <code>supabase/schema.sql</code> in
              the Supabase SQL Editor, then reload this page.
            </span>
          </div>
        ) : (
          <>
            <div className="flex border-b border-slate-200 px-5 pt-3 gap-2">
              {(['machines', 'staff'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setError('');
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-t-lg flex items-center gap-1.5 ${
                    tab === t ? 'bg-slate-100 text-slate-900 border border-b-0 border-slate-200' : 'text-slate-500'
                  }`}
                >
                  {t === 'machines' ? <Cog className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  {t === 'machines' ? `Machines (${machines.length})` : `Staff (${floorStaff.length})`}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}

              {tab === 'machines' ? (
                <>
                  <form onSubmit={submitMachine} className="grid grid-cols-2 sm:grid-cols-[110px_1fr_1fr_auto] gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Number *</label>
                      <input value={machineForm.number || ''} onChange={(e) => setMachineForm({ ...machineForm, number: e.target.value })} placeholder="M-01" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Name / type</label>
                      <input value={machineForm.name || ''} onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })} placeholder="Film slitter 1600 mm" className={inputClass} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes</label>
                      <input value={machineForm.notes || ''} onChange={(e) => setMachineForm({ ...machineForm, notes: e.target.value })} className={inputClass} />
                    </div>
                    <button type="submit" className="col-span-2 sm:col-span-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                      {machineForm.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {machineForm.id ? 'Save' : 'Add'}
                    </button>
                  </form>

                  {sortedMachines.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No machines yet. Add your first one above.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {sortedMachines.map((m) => (
                        <div key={m.id} className={`flex items-center gap-3 px-3 py-2 text-xs ${m.active ? '' : 'opacity-50'}`}>
                          <span className="font-mono font-black text-slate-900 w-16">{m.number}</span>
                          <span className="flex-1 text-slate-700">{m.name || '—'}{m.notes ? ` • ${m.notes}` : ''}</span>
                          <button onClick={() => setMachineForm(m)} className="p-1 text-slate-500 hover:text-blue-700" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => saveMachine({ ...m, active: !m.active })}
                            className="px-2 py-0.5 rounded border border-slate-300 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                          >
                            {m.active ? 'Mark inactive' : 'Make active'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Bulk add: paste rows straight from Excel */}
                  <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-900">Add many at once from Excel</span>
                      <button
                        type="button"
                        onClick={() => setPasteOpen((o) => !o)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                      >
                        {pasteOpen ? 'Close' : 'Paste list'}
                      </button>
                    </div>
                    {pasteResult && !pasteOpen && <p className="text-xs text-emerald-800">{pasteResult}</p>}
                    {pasteOpen && (
                      <>
                        <p className="text-[11px] text-emerald-900">
                          In Excel, select the columns <b>Name</b>, <b>Role</b> and <b>Phone</b> (in that order) for all
                          rows, copy (Ctrl + C), and paste below (Ctrl + V). Role can be Operator, Helper or Supervisor;
                          blank means Operator. Phone is optional.
                        </p>
                        <textarea
                          rows={6}
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          placeholder={'Ramesh Patil\tOperator\t9800000000\nAkash\tHelper'}
                          className="w-full px-2.5 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono"
                        />
                        {pasted.length > 0 && (
                          <div className="max-h-40 overflow-y-auto border border-emerald-200 rounded-lg bg-white divide-y divide-slate-100">
                            {pasted.map((p, i) => {
                              const dup = !newPeople.includes(p);
                              return (
                                <div key={i} className={`flex gap-3 px-2.5 py-1 text-xs ${dup ? 'opacity-40 line-through' : ''}`}>
                                  <span className="flex-1 font-semibold">{p.name}</span>
                                  <span className="w-20">{ROLE_LABELS[p.role]}</span>
                                  <span className="w-28 font-mono">{p.phone || '—'}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-emerald-900">
                            {newPeople.length} to add
                            {pasted.length > newPeople.length ? ` • ${pasted.length - newPeople.length} already in the list (crossed out)` : ''}
                          </span>
                          <button
                            type="button"
                            disabled={newPeople.length === 0}
                            onClick={addPasted}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold"
                          >
                            Add {newPeople.length} people
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <form onSubmit={submitStaff} className="grid grid-cols-2 sm:grid-cols-[1fr_130px_1fr_auto] gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Name *</label>
                      <input value={staffForm.name || ''} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Role</label>
                      <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as FloorStaff['role'] })} className={inputClass}>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone</label>
                      <input value={staffForm.phone || ''} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className={inputClass} />
                    </div>
                    <button type="submit" className="col-span-2 sm:col-span-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                      {staffForm.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {staffForm.id ? 'Save' : 'Add'}
                    </button>
                  </form>

                  {sortedStaff.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No staff yet. Add operators and helpers above.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {sortedStaff.map((s) => (
                        <div key={s.id} className={`flex items-center gap-3 px-3 py-2 text-xs ${s.active ? '' : 'opacity-50'}`}>
                          <span className="font-bold text-slate-900 flex-1">{s.name}</span>
                          <span className="text-slate-600 w-20">{ROLE_LABELS[s.role]}</span>
                          <span className="text-slate-500 w-28 font-mono">{s.phone || '—'}</span>
                          <button onClick={() => setStaffForm(s)} className="p-1 text-slate-500 hover:text-blue-700" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => saveFloorStaff({ ...s, active: !s.active })}
                            className="px-2 py-0.5 rounded border border-slate-300 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                          >
                            {s.active ? 'Mark inactive' : 'Make active'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
