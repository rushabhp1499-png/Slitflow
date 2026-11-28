import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward } from '../types';
import { rollSpecLabel, rollsMade, rollsOnChallans } from '../utils/floorPlan';
import { X, Plus, Trash2, Layers } from 'lucide-react';

interface RollCountModalProps {
  job: MaterialInward;
  onClose: () => void;
}

// Roll-length orders: log how many rolls were made, whenever convenient (each day, or once at the end).
// No weighing and no job card per jumbo roll.
export const RollCountModal: React.FC<RollCountModalProps> = ({ job: jobWhenOpened, onClose }) => {
  const { jobs, addRollEntry, deleteRollEntry } = useProduction();
  const job = jobs.find((j) => j.id === jobWhenOpened.id) || jobWhenOpened;
  const specs = job.rollSpecs || [];
  const entries = [...(job.rollEntries || [])].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at));

  const today = new Date().toISOString().slice(0, 10);
  const [specId, setSpecId] = useState(specs[0]?.id || '');
  const [rolls, setRolls] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(Number(rolls) > 0) || !specId) return;
    addRollEntry(job.id, { specId, rolls: Number(rolls), date, note });
    setRolls('');
    setNote('');
  };

  const specById = (id: string) => specs.find((s) => s.id === id);
  const totalMade = rollsMade(job);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 my-6">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" /> Rolls made
            </h2>
            <p className="text-xs text-slate-400 truncate">
              PO {job.customerPoNo} • {job.customerName}
              {job.coreSize ? ` • ${job.coreSize} core` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Totals per roll length */}
          <div className="grid gap-2">
            {specs.map((s) => {
              const made = rollsMade(job, s.id);
              const sent = rollsOnChallans(job, s.id);
              const pct = s.targetRolls ? Math.min(100, Math.round((made / s.targetRolls) * 100)) : 0;
              return (
                <div key={s.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-900">{rollSpecLabel(s)}</span>
                    <span className="font-mono text-sm">
                      <b className="text-lg">{made}</b>
                      {s.targetRolls ? <span className="text-slate-500"> of {s.targetRolls}</span> : ''} rolls
                    </span>
                  </div>
                  {s.targetRolls ? (
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  ) : null}
                  <div className="text-[11px] text-slate-500 mt-1">
                    On challans: {sent} • Ready for a challan: <b className="text-slate-800">{Math.max(0, made - sent)}</b>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add rolls */}
          <form onSubmit={add} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {specs.length > 1 && (
                <select value={specId} onChange={(e) => setSpecId(e.target.value)} className="col-span-2 sm:col-span-1 px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold">
                  {specs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {rollSpecLabel(s)}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                min={1}
                value={rolls}
                onChange={(e) => setRolls(e.target.value)}
                placeholder="Rolls made"
                autoFocus
                className={`${specs.length > 1 ? '' : 'col-span-2'} px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold`}
              />
              <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs" />
              <button
                type="submit"
                disabled={!(Number(rolls) > 0)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional), e.g. Night shift" className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
            <p className="text-[11px] text-slate-500">Add rolls each day, or just the final count at the end.</p>
          </form>

          {/* Log */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Log ({totalMade} rolls)</h3>
            {entries.length === 0 ? (
              <p className="text-xs text-slate-500">Nothing logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {entries.map((e) => {
                  const s = specById(e.specId);
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold">{e.rolls} rolls</span>
                        {s && specs.length > 1 ? <span className="text-slate-600"> × {rollSpecLabel(s)}</span> : ''}
                        <span className="text-slate-500">
                          {' '}
                          • {new Date(`${e.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {e.by}
                        </span>
                        {e.note && <div className="text-slate-500 truncate">{e.note}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => window.confirm(`Delete this entry of ${e.rolls} rolls?`) && deleteRollEntry(job.id, e.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
