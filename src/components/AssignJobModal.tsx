import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward } from '../types';
import { X, Cog } from 'lucide-react';

interface AssignJobModalProps {
  job: MaterialInward;
  onClose: () => void;
  onOpenFloorSetup: () => void;
}

// Optional: pick the machine, operator and helpers for an order.
export const AssignJobModal: React.FC<AssignJobModalProps> = ({ job, onClose, onOpenFloorSetup }) => {
  const { machines, floorStaff, assignJob, floorSetupMissing } = useProduction();
  const current = job.assignment;

  const [machineId, setMachineId] = useState(current?.machineId || '');
  const [operatorId, setOperatorId] = useState(current?.operatorId || '');
  const [helperIds, setHelperIds] = useState<string[]>(current?.helperIds || []);

  // Inactive people/machines stay selectable only if already assigned here.
  const activeMachines = machines
    .filter((m) => m.active || m.id === current?.machineId)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  const operators = floorStaff.filter((s) => (s.active || s.id === current?.operatorId) && s.role !== 'helper');
  const helpers = floorStaff.filter((s) => (s.active || current?.helperIds?.includes(s.id)) && s.id !== operatorId);

  const save = () => {
    assignJob(job.id, machineId || operatorId || helperIds.length ? { machineId, operatorId, helperIds } : null);
    onClose();
  };

  const selectClass = 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold">Assign Machine & Team</h2>
            <p className="text-xs text-slate-400 truncate">
              PO {job.customerPoNo} • {job.customerName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {floorSetupMissing || machines.length === 0 ? (
            <div className="text-sm text-slate-700 space-y-3">
              <p>Add your machines and staff first.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenFloorSetup();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Cog className="w-4 h-4" /> Open Floor Setup
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Machine</label>
                <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className={selectClass}>
                  <option value="">— Not assigned —</option>
                  {activeMachines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.number}
                      {m.name ? ` – ${m.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operator</label>
                <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className={selectClass}>
                  <option value="">— Not assigned —</option>
                  {operators.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Helpers</label>
                {helpers.length === 0 ? (
                  <p className="text-xs text-slate-500">No helpers added yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {helpers.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={helperIds.includes(s.id)}
                          onChange={(e) =>
                            setHelperIds((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)))
                          }
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          {current ? (
            <button
              onClick={() => {
                assignJob(job.id, null);
                onClose();
              }}
              className="text-xs font-bold text-red-700"
            >
              Clear assignment
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold">
              Cancel
            </button>
            {!floorSetupMissing && machines.length > 0 && (
              <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
