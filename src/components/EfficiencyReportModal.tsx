import React, { useMemo, useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { buildEfficiencyReport, MachineEfficiency, MIN_HOURS_FOR_RATE } from '../utils/efficiency';
import { formatKg } from '../utils/weight';
import { X, Gauge, ChevronDown, ChevronRight, Info } from 'lucide-react';

const DAY = 24 * 60 * 60 * 1000;
const localDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const startOfDay = (s: string) => new Date(`${s}T00:00:00`).getTime();

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const hrs = (h: number | null | undefined) => (h === null || h === undefined ? '—' : `${h.toFixed(1)} h`);
const when = (t: number) =>
  new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const tone = (v: number | null) =>
  v === null ? 'text-slate-400' : v >= 0.75 ? 'text-emerald-700' : v >= 0.5 ? 'text-amber-700' : 'text-red-700';

const Bar: React.FC<{ value: number | null }> = ({ value }) => (
  <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
    <div
      className={`h-full ${value === null ? '' : value >= 0.75 ? 'bg-emerald-500' : value >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
      style={{ width: `${Math.min(100, Math.round((value || 0) * 100))}%` }}
    />
  </div>
);

// How well each machine was used over a period, from Start Slit and bundle weighing times.
export const EfficiencyReportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { jobs, machines, floorStaff } = useProduction();
  const today = localDate(Date.now());
  const [range, setRange] = useState({ from: localDate(Date.now() - 6 * DAY), to: today });
  const [openId, setOpenId] = useState<string | null>(null);

  const quick = (days: number) => setRange({ from: localDate(Date.now() - (days - 1) * DAY), to: today });

  const report = useMemo(() => {
    const from = startOfDay(range.from);
    const to = startOfDay(range.to) + DAY;
    if (!(to > from)) return null;
    const active = machines
      .filter((m) => m.active || jobs.some((j) => j.assignment?.machineId === m.id))
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    return buildEfficiencyReport(jobs, active, floorStaff, from, to);
  }, [jobs, machines, floorStaff, range]);

  const rows: MachineEfficiency[] = report
    ? [...report.machines].sort((a, b) => (b.overall ?? b.utilisation ?? -1) - (a.overall ?? a.utilisation ?? -1))
    : [];
  const missingStd = machines.filter((m) => m.active && !m.expectedKgPerHour).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold">Machine Efficiency</h2>
              <p className="text-xs text-slate-400">
                Shift hours 8:30 AM – 7 PM less lunch, nights to 1:30 AM when worked, Sundays off
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          {[3, 5, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => quick(d)}
              className={`px-2.5 py-1 rounded-lg border font-bold ${
                range.to === today && range.from === localDate(Date.now() - (d - 1) * DAY)
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Last {d} days
            </button>
          ))}
          <span className="text-slate-400 ml-1">or</span>
          <input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} className="px-2 py-1 border border-slate-300 rounded-lg" />
          <span className="text-slate-400">to</span>
          <input type="date" value={range.to} min={range.from} max={today} onChange={(e) => setRange({ ...range, to: e.target.value })} className="px-2 py-1 border border-slate-300 rounded-lg" />
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
          {!report || report.machines.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No machines yet. Add them in Floor Setup.</p>
          ) : (
            <>
              {/* Factory totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Factory utilisation', value: pct(report.totals.utilisation), cls: tone(report.totals.utilisation) },
                  { label: 'Machine hours running', value: `${report.totals.runHours.toFixed(1)} of ${report.totals.availableHours.toFixed(0)} h`, cls: 'text-slate-900' },
                  { label: 'Machine hours idle', value: `${Math.max(0, report.totals.availableHours - report.totals.runHours).toFixed(1)} h`, cls: 'text-slate-900' },
                  { label: 'Slit & weighed', value: `${formatKg(report.totals.kg)} kg`, cls: 'text-slate-900' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</div>
                    <div className={`text-lg font-black font-mono ${s.cls}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Machines */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                    <tr>
                      <th className="text-left px-3 py-2">Machine</th>
                      <th className="text-left px-3 py-2" title="Running hours ÷ shift hours">Utilisation</th>
                      <th className="text-right px-3 py-2">Running</th>
                      <th className="text-right px-3 py-2">Idle</th>
                      <th className="text-right px-3 py-2">Kg</th>
                      <th className="text-right px-3 py-2">Kg / run hour</th>
                      <th className="text-left px-3 py-2" title="Kg per running hour ÷ the machine's standard kg/hour">Speed eff.</th>
                      <th className="text-left px-3 py-2" title="Utilisation × speed efficiency">Overall</th>
                      <th className="text-right px-3 py-2" title="Average shift hours from the start of a PO to its first bundle">Start → 1st bundle</th>
                      <th className="text-right px-3 py-2">POs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((m) => {
                      const open = openId === m.machine.id;
                      return (
                        <React.Fragment key={m.machine.id}>
                          <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(open ? null : m.machine.id)}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1 font-mono font-black text-slate-900">
                                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                {m.machine.number}
                              </div>
                              {m.nights > 0 && <div className="text-[10px] text-indigo-600 pl-4">{m.nights} night shift{m.nights > 1 ? 's' : ''}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold w-9 ${tone(m.utilisation)}`}>{pct(m.utilisation)}</span>
                                <Bar value={m.utilisation} />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{hrs(m.runHours)}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">{hrs(m.idleHours)}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatKg(m.kg)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              {m.kgPerRunHour === null ? '—' : m.kgPerRunHour.toFixed(1)}
                              {m.machine.expectedKgPerHour ? <span className="text-slate-400 font-normal"> / {m.machine.expectedKgPerHour}</span> : null}
                            </td>
                            <td className={`px-3 py-2 font-bold ${tone(m.speedEfficiency)}`}>
                              {m.machine.expectedKgPerHour ? pct(m.speedEfficiency) : <span className="font-normal text-slate-400">no std.</span>}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-black w-9 ${tone(m.overall)}`}>{pct(m.overall)}</span>
                                {m.overall !== null && <Bar value={m.overall} />}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{hrs(m.avgToFirstBundleHours)}</td>
                            <td className="px-3 py-2 text-right font-mono">{m.runs.length}</td>
                          </tr>
                          {open && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={10} className="px-4 py-2">
                                {m.runs.length === 0 ? (
                                  <p className="text-[11px] text-slate-500 py-1">No PO ran on {m.machine.number} in this period: all {hrs(m.availableHours)} were idle.</p>
                                ) : (
                                  <table className="w-full text-[11px]">
                                    <thead className="text-slate-500 text-[10px] uppercase">
                                      <tr>
                                        <th className="text-left py-1">PO</th>
                                        <th className="text-left py-1">Customer</th>
                                        <th className="text-left py-1">Start</th>
                                        <th className="text-left py-1">End</th>
                                        <th className="text-right py-1">Shift hours</th>
                                        <th className="text-right py-1">Kg</th>
                                        <th className="text-right py-1">Kg / h</th>
                                        <th className="text-right py-1">To 1st bundle</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {m.runs.map((r) => (
                                        <tr key={r.job.id} className="border-t border-slate-200">
                                          <td className="py-1 font-mono font-bold text-blue-800">{r.job.customerPoNo}</td>
                                          <td className="py-1 text-slate-600 truncate max-w-[180px]">{r.job.customerName}</td>
                                          <td className="py-1">{when(r.start)}</td>
                                          <td className="py-1">{r.running ? <span className="text-emerald-700 font-bold">running</span> : when(r.end)}</td>
                                          <td className="py-1 text-right font-mono">{hrs(r.runHours)}</td>
                                          <td className="py-1 text-right font-mono">{formatKg(r.kg)}</td>
                                          <td className="py-1 text-right font-mono">{r.runHours >= MIN_HOURS_FOR_RATE ? (r.kg / r.runHours).toFixed(1) : '—'}</td>
                                          <td className="py-1 text-right font-mono">{hrs(r.toFirstBundleHours)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Operators */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Output per operator</h3>
                {report.operators.length === 0 ? (
                  <p className="text-xs text-slate-500">No bundles weighed on machine orders in this period.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                        <tr>
                          <th className="text-left px-3 py-2">Operator</th>
                          <th className="text-right px-3 py-2">Shifts worked</th>
                          <th className="text-right px-3 py-2">Bundles</th>
                          <th className="text-right px-3 py-2">Kg</th>
                          <th className="text-right px-3 py-2">Kg per shift</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.operators.map((o) => (
                          <tr key={o.operator?.id || 'none'}>
                            <td className="px-3 py-2 font-semibold">{o.operator?.name || <span className="text-slate-400 font-normal">No operator on the order</span>}</td>
                            <td className="px-3 py-2 text-right font-mono">{o.shifts}</td>
                            <td className="px-3 py-2 text-right font-mono">{o.bundles}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatKg(o.kg)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">{formatKg(o.kgPerShift)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-slate-400" />
                <div className="space-y-1">
                  <p>
                    Each PO on a machine starts where the previous one ended (its last bundle), or at its own Start Slit if that
                    was pressed later. It ends at its last bundle, or now if still under slitting. Only shift time counts.
                  </p>
                  <p>
                    Bundles are weighed in packaging, so times run a little behind the machine; single POs can look off, a week or
                    more evens out. A night shift counts when bundles were weighed on that machine after 7 PM.
                  </p>
                  {missingStd > 0 && (
                    <p className="text-amber-700">
                      {missingStd} machine{missingStd > 1 ? 's have' : ' has'} no standard kg/hour yet, so speed and overall
                      efficiency show "—". Add it in Floor Setup.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
