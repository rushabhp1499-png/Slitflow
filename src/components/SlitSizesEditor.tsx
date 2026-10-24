import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { RequestedSlitSize } from '../types';
import { toScaleKg, formatKg } from '../utils/weight';

export interface SlitRow {
  id: string;
  widthMm: string;
  quantityKg: string;
}

export const newSlitRow = (): SlitRow => ({
  id: 'size-' + Math.random().toString(36).substring(2, 8),
  widthMm: '',
  quantityKg: '',
});

export const rowsFromSizes = (sizes: RequestedSlitSize[] | undefined): SlitRow[] =>
  sizes && sizes.length > 0
    ? sizes.map((s) => ({ id: s.id, widthMm: String(s.widthMm), quantityKg: s.quantityKg.toFixed(2) }))
    : [newSlitRow()];

// Rows with both a width and a weight, weights rounded to 50 g.
export const sizesFromRows = (rows: SlitRow[]): RequestedSlitSize[] =>
  rows
    .filter((r) => Number(r.widthMm) > 0 && toScaleKg(Number(r.quantityKg)) > 0)
    .map((r) => ({ id: r.id, widthMm: Number(r.widthMm), quantityKg: toScaleKg(Number(r.quantityKg)) }));

export const totalKg = (sizes: RequestedSlitSize[]) => toScaleKg(sizes.reduce((sum, s) => sum + s.quantityKg, 0));

interface SlitSizesEditorProps {
  rows: SlitRow[];
  onChange: (rows: SlitRow[]) => void;
  // Material received, to show how much is still unassigned (0 = unknown).
  availableKg: number;
}

// Width (mm) + quantity (kg) rows with a running total, used wherever slit sizes are entered.
export const SlitSizesEditor: React.FC<SlitSizesEditorProps> = ({ rows, onChange, availableKg }) => {
  const inputClass =
    'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-bold focus:bg-white';

  const update = (id: string, field: 'widthMm' | 'quantityKg', value: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const sizes = sizesFromRows(rows);
  const total = totalKg(sizes);
  const available = toScaleKg(availableKg);
  const balance = toScaleKg(available - total);
  const tooMuch = available > 0 && total > available;

  return (
    <div>
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[11px] font-semibold text-slate-600 px-0.5">
          <span>Slit width (mm)</span>
          <span>Quantity (kg)</span>
          <span className="w-8" />
        </div>
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input
              type="number"
              step="any"
              min={0.1}
              value={row.widthMm}
              onChange={(e) => update(row.id, 'widthMm', e.target.value)}
              placeholder="e.g. 20"
              className={inputClass}
            />
            <input
              type="number"
              min={0.05}
              step={0.05}
              value={row.quantityKg}
              onChange={(e) => update(row.id, 'quantityKg', e.target.value)}
              onBlur={(e) => {
                const kg = Number(e.target.value);
                if (kg > 0) update(row.id, 'quantityKg', toScaleKg(kg).toFixed(2));
              }}
              placeholder="e.g. 500"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(rows.length > 1 ? rows.filter((r) => r.id !== row.id) : rows)}
              disabled={rows.length === 1}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400"
              title="Remove this size"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...rows, newSlitRow()])}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
        >
          <Plus className="w-3.5 h-3.5" /> Add another size
        </button>
      </div>

      {sizes.length > 0 && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            tooMuch ? 'bg-red-50 border-red-200 text-red-900' : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <span className="font-bold">Total {formatKg(total)} kg</span>
          {available > 0 && (
            <span>
              {' '}of {formatKg(available)} kg received
              {tooMuch
                ? ' • more than the material received'
                : balance > 0
                ? ` • ${formatKg(balance)} kg not yet assigned`
                : ' • fully assigned'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
