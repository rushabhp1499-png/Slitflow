import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { getSupabase, errorMessage } from '../lib/supabase';
import { PmImport, PmRun, readQmsWorkbook, rollKg, skuKey, skuLabel } from '../utils/promask';
import { X, Upload, Layers, ClipboardList, Package, Gauge, AlertTriangle } from 'lucide-react';

interface ProMaskModalProps {
  onClose: () => void;
}

type Tab = 'torun' | 'stock' | 'efficiency';

const CREW_KEY = 'slitflow.promask.crew';
const fmt = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(2)}%` : '–');
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });
const runKg = (r: PmRun) => r.accepted * rollKg(r.widthCm, r.lengthM, r.gsm);

// ProMask on SLT-01: what to make for open POs, finished stock, and output per day / operator / size.
// Read from QMS_Records.xlsx (typed by the quality team); nothing is entered twice.
export const ProMaskModal: React.FC<ProMaskModalProps> = ({ onClose }) => {
  const { staffName } = useProduction();
  const [data, setData] = useState<PmImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<Tab>('torun');
  const [month, setMonth] = useState('');
  const [crew, setCrew] = useState(() => {
    try {
      return Number(localStorage.getItem(CREW_KEY)) || 4;
    } catch {
      return 4;
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const { data: row, error } = await getSupabase().from('promask_import').select('data').eq('id', 'latest').maybeSingle();
      if (error) setMessage(errorMessage(error));
      setData((row?.data as PmImport) || null);
      setLoading(false);
    })();
  }, []);

  const importFile = async (file: File) => {
    setBusy(true);
    setMessage('');
    try {
      const parsed = await readQmsWorkbook(file, staffName || 'Factory');
      const { error } = await getSupabase()
        .from('promask_import')
        .upsert({ id: 'latest', data: parsed, imported_at: parsed.importedAt, imported_by: parsed.importedBy });
      if (error) throw error;
      setData(parsed);
      setMonth('');
      setMessage(`Imported ${parsed.runs.length} job card rows and ${parsed.pos.length} customer POs.`);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setCrewSize = (n: number) => {
    const v = Math.max(1, Math.min(20, n || 1));
    setCrew(v);
    try {
      localStorage.setItem(CREW_KEY, String(v));
    } catch {
      // per-viewer preference only
    }
  };

  const runs = data?.runs || [];
  const pos = data?.pos || [];

  // Finished rolls on the floor: job card rolls with no invoice in PE-F-35.
  const stock = useMemo(() => {
    const map = new Map<string, { label: string; rolls: number; kg: number; reels: string[]; since: string }>();
    for (const r of runs) {
      if (r.invoiceNo || r.accepted <= 0) continue;
      const k = skuKey(r.grade, r.widthCm, r.lengthM);
      const e = map.get(k) || { label: skuLabel(r.grade, r.widthCm, r.lengthM), rolls: 0, kg: 0, reels: [], since: r.date };
      e.rolls += r.accepted;
      e.kg += runKg(r);
      e.reels.push(r.reelNo);
      if (r.date < e.since) e.since = r.date;
      map.set(k, e);
    }
    return map;
  }, [runs]);

  // Average paper kg SLT-01 makes on a working day (last 60 days with output, else all).
  const avgKgPerDay = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of runs) byDay.set(r.date, (byDay.get(r.date) || 0) + runKg(r));
    const days = [...byDay.keys()].sort();
    const recent = days.slice(-60);
    const total = recent.reduce((s, d) => s + (byDay.get(d) || 0), 0);
    return recent.length ? total / recent.length : 0;
  }, [runs]);

  // Open POs, earliest delivery first; finished stock of the same size is used up first.
  const toRun = useMemo(() => {
    const left = new Map<string, number>([...stock.entries()].map(([k, v]) => [k, v.rolls]));
    const gsmOf = (grade: string) => (grade === 'Pro' ? 40 : 36);
    return pos
      .filter(p => p.open && p.orderedRolls > 0)
      .sort((a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999'))
      .map(p => {
        const k = skuKey(p.grade, p.widthCm, p.lengthM);
        const fromStock = Math.min(left.get(k) || 0, p.orderedRolls);
        left.set(k, (left.get(k) || 0) - fromStock);
        const need = p.orderedRolls - fromStock;
        const kg = p.widthCm && p.lengthM ? need * rollKg(p.widthCm, p.lengthM, gsmOf(p.grade)) : 0;
        return { po: p, fromStock, need, kg, days: avgKgPerDay > 0 ? kg / avgKgPerDay : 0 };
      });
  }, [pos, stock, avgKgPerDay]);

  const months = useMemo(() => [...new Set(runs.map(r => r.date.slice(0, 7)))].sort().reverse(), [runs]);
  const selMonth = month || months[0] || '';
  const monthRuns = runs.filter(r => r.date.startsWith(selMonth));

  const summarise = (list: PmRun[]) => {
    const days = new Set(list.map(r => r.date)).size;
    const accepted = list.reduce((s, r) => s + r.accepted, 0);
    const rejected = list.reduce((s, r) => s + r.rejected, 0);
    const kg = list.reduce((s, r) => s + runKg(r), 0);
    return { days, accepted, rejected, kg, reels: new Set(list.map(r => r.reelNo)).size };
  };
  const groupBy = (list: PmRun[], key: (r: PmRun) => string) => {
    const map = new Map<string, PmRun[]>();
    for (const r of list) map.set(key(r), [...(map.get(key(r)) || []), r]);
    return map;
  };

  const tabBtn = (key: Tab, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`px-3 py-2 text-xs font-bold border-b-2 -mb-px flex items-center gap-1.5 ${
        tab === key ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
  const th = 'py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500';
  const td = 'py-2 px-3 text-sm';
  const card = (label: string, value: string, sub?: string) => (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-extrabold text-slate-900 mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );

  const m = summarise(monthRuns);
  const sortedStock = [...stock.values()].sort((a, b) => b.rolls - a.rolls);
  const totalNeedKg = toRun.reduce((s, x) => s + x.kg, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 my-6">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-400" /> ProMask · PRD-SLT-01
            </h2>
            <p className="text-xs text-slate-400 truncate">
              {data
                ? `From ${data.fileName}, imported ${new Date(data.importedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} by ${data.importedBy}`
                : 'Read from the QMS records Excel (PE-F-14, PE-F-16, PE-F-35)'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm"
              className="hidden"
              onChange={e => e.target.files?.[0] && void importFile(e.target.files[0])}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-600 text-white rounded-lg text-xs font-bold"
              title="Pick QMS_Records.xlsx. Nothing in the Excel is changed."
            >
              <Upload className="w-3.5 h-3.5" /> {busy ? 'Reading…' : 'Import QMS Excel'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {message && <p className="mx-5 mt-4 text-xs font-semibold bg-white border border-slate-200 rounded-lg p-2">{message}</p>}
        {data?.warnings?.length ? (
          <div className="mx-5 mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2 space-y-0.5">
            {data.warnings.map(w => (
              <div key={w} className="flex gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
              </div>
            ))}
          </div>
        ) : null}

        {loading ? (
          <p className="p-8 text-sm text-slate-500">Loading…</p>
        ) : !data ? (
          <div className="p-8 text-sm text-slate-600 space-y-2">
            <p className="font-semibold">Nothing imported yet.</p>
            <p>
              Click <strong>Import QMS Excel</strong> and pick <span className="font-mono">QMS_Records.xlsx</span> from QMS DOCUMENTS\NEW\QMS
              Records. Import again whenever the Excel is updated.
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 mt-3 flex border-b border-slate-200">
              {tabBtn('torun', `To run (${toRun.length})`, ClipboardList)}
              {tabBtn('stock', `Stock (${sortedStock.length})`, Package)}
              {tabBtn('efficiency', 'Efficiency', Gauge)}
            </div>

            <div className="p-5">
              {tab === 'torun' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Open customer POs from PE-F-14, earliest delivery first. Finished rolls of the same size already in stock are
                    used first. Days = paper still to slit ÷ SLT-01's average of {fmt(avgKgPerDay)} kg per working day.
                  </p>
                  {toRun.length === 0 ? (
                    <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">No open ProMask POs.</p>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className={th}>Due</th>
                            <th className={th}>Customer / PO</th>
                            <th className={th}>Size</th>
                            <th className={`${th} text-right`}>Ordered</th>
                            <th className={`${th} text-right`}>From stock</th>
                            <th className={`${th} text-right`}>To run</th>
                            <th className={`${th} text-right`}>Paper kg</th>
                            <th className={`${th} text-right`}>SLT-01 days</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {toRun.map(({ po, fromStock, need, kg, days }) => (
                            <tr key={po.poNo + po.size}>
                              <td className={`${td} whitespace-nowrap ${po.deliveryDate && po.deliveryDate < new Date().toISOString().slice(0, 10) ? 'text-red-700 font-bold' : ''}`}>
                                {po.deliveryDate ? dayLabel(po.deliveryDate) : '–'}
                              </td>
                              <td className={td}>
                                <div className="font-semibold">{po.customer}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{po.poNo}</div>
                              </td>
                              <td className={`${td} font-semibold whitespace-nowrap`}>{skuLabel(po.grade, po.widthCm, po.lengthM)}</td>
                              <td className={`${td} text-right`}>{fmt(po.orderedRolls)}</td>
                              <td className={`${td} text-right text-emerald-700`}>{fromStock ? fmt(fromStock) : '–'}</td>
                              <td className={`${td} text-right font-extrabold`}>{fmt(need)}</td>
                              <td className={`${td} text-right`}>{fmt(kg)}</td>
                              <td className={`${td} text-right`}>{days ? fmt(days, 1) : '–'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                          <tr>
                            <td className={td} colSpan={5}>Total</td>
                            <td className={`${td} text-right`}>{fmt(toRun.reduce((s, x) => s + x.need, 0))}</td>
                            <td className={`${td} text-right`}>{fmt(totalNeedKg)}</td>
                            <td className={`${td} text-right`}>{avgKgPerDay ? fmt(totalNeedKg / avgKgPerDay, 1) : '–'}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tab === 'stock' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Accepted rolls from the Job Card (PE-F-16) that have no invoice yet in Lot Traceability (PE-F-35).
                  </p>
                  {sortedStock.length === 0 ? (
                    <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">No finished rolls waiting.</p>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className={th}>Size</th>
                            <th className={`${th} text-right`}>Rolls</th>
                            <th className={`${th} text-right`}>Paper kg</th>
                            <th className={th}>Master reels</th>
                            <th className={th}>Made since</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedStock.map(s => (
                            <tr key={s.label}>
                              <td className={`${td} font-semibold`}>{s.label}</td>
                              <td className={`${td} text-right font-extrabold`}>{fmt(s.rolls)}</td>
                              <td className={`${td} text-right`}>{fmt(s.kg)}</td>
                              <td className={`${td} font-mono text-xs`}>{[...new Set(s.reels)].join(', ')}</td>
                              <td className={`${td} whitespace-nowrap`}>{dayLabel(s.since)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tab === 'efficiency' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="font-bold text-slate-700">
                      Month{' '}
                      <select value={selMonth} onChange={e => setMonth(e.target.value)} className="ml-1 px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
                        {months.map(mo => (
                          <option key={mo} value={mo}>
                            {monthLabel(mo)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="font-bold text-slate-700">
                      SLT-01 crew (operator + helpers){' '}
                      <input
                        type="number"
                        min={1}
                        value={crew}
                        onChange={e => setCrewSize(Number(e.target.value))}
                        className="ml-1 w-16 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {card('Rolls made', fmt(m.accepted), `${m.reels} master reels`)}
                    {card('Rejected', pct(m.rejected, m.accepted + m.rejected), `${fmt(m.rejected)} rolls`)}
                    {card('Paper slit', `${fmt(m.kg)} kg`)}
                    {card('Working days', fmt(m.days))}
                    {card('Per working day', `${fmt(m.days ? m.kg / m.days : 0)} kg`, `${fmt(m.days ? m.accepted / m.days : 0)} rolls`)}
                    {card('Per person-day', `${fmt(m.days ? m.kg / (m.days * crew) : 0)} kg`, `crew of ${crew}`)}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                      <h3 className="px-3 pt-3 text-xs font-bold uppercase tracking-wider text-slate-500">By operator</h3>
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className={th}>Operator</th>
                            <th className={`${th} text-right`}>Days</th>
                            <th className={`${th} text-right`}>Rolls</th>
                            <th className={`${th} text-right`}>kg / day</th>
                            <th className={`${th} text-right`}>Rejected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...groupBy(monthRuns, r => r.operator || '—').entries()].map(([op, list]) => {
                            const s = summarise(list);
                            return (
                              <tr key={op}>
                                <td className={`${td} font-semibold`}>{op}</td>
                                <td className={`${td} text-right`}>{s.days}</td>
                                <td className={`${td} text-right`}>{fmt(s.accepted)}</td>
                                <td className={`${td} text-right`}>{fmt(s.days ? s.kg / s.days : 0)}</td>
                                <td className={`${td} text-right`}>{pct(s.rejected, s.accepted + s.rejected)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                      <h3 className="px-3 pt-3 text-xs font-bold uppercase tracking-wider text-slate-500">By size</h3>
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className={th}>Size</th>
                            <th className={`${th} text-right`}>Rolls</th>
                            <th className={`${th} text-right`}>Paper kg</th>
                            <th className={`${th} text-right`}>Rejected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...groupBy(monthRuns, r => skuLabel(r.grade, r.widthCm, r.lengthM)).entries()]
                            .sort((a, b) => summarise(b[1]).kg - summarise(a[1]).kg)
                            .map(([sku, list]) => {
                              const s = summarise(list);
                              return (
                                <tr key={sku}>
                                  <td className={`${td} font-semibold whitespace-nowrap`}>{sku}</td>
                                  <td className={`${td} text-right`}>{fmt(s.accepted)}</td>
                                  <td className={`${td} text-right`}>{fmt(s.kg)}</td>
                                  <td className={`${td} text-right`}>{pct(s.rejected, s.accepted + s.rejected)}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <h3 className="px-3 pt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Day by day</h3>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className={th}>Date</th>
                          <th className={th}>Operator</th>
                          <th className={th}>Sizes run</th>
                          <th className={`${th} text-right`}>Reels</th>
                          <th className={`${th} text-right`}>Rolls</th>
                          <th className={`${th} text-right`}>Rejected</th>
                          <th className={`${th} text-right`}>Paper kg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...groupBy(monthRuns, r => r.date).entries()]
                          .sort((a, b) => b[0].localeCompare(a[0]))
                          .map(([d, list]) => {
                            const s = summarise(list);
                            return (
                              <tr key={d}>
                                <td className={`${td} whitespace-nowrap`}>{dayLabel(d)}</td>
                                <td className={td}>{[...new Set(list.map(r => r.operator))].join(', ')}</td>
                                <td className={`${td} text-xs min-w-[10rem]`}>
                                  {[...new Set(list.map(r => skuLabel(r.grade, r.widthCm, r.lengthM)))].join('; ')}
                                </td>
                                <td className={`${td} text-right`}>{s.reels}</td>
                                <td className={`${td} text-right font-semibold`}>{fmt(s.accepted)}</td>
                                <td className={`${td} text-right`}>{s.rejected || '–'}</td>
                                <td className={`${td} text-right`}>{fmt(s.kg)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <h3 className="px-3 pt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Month by month</h3>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className={th}>Month</th>
                          <th className={`${th} text-right`}>Days</th>
                          <th className={`${th} text-right`}>Rolls</th>
                          <th className={`${th} text-right`}>Paper kg</th>
                          <th className={`${th} text-right`}>kg / day</th>
                          <th className={`${th} text-right`}>kg / person-day</th>
                          <th className={`${th} text-right`}>Rejected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {months.map(mo => {
                          const s = summarise(runs.filter(r => r.date.startsWith(mo)));
                          return (
                            <tr key={mo} className={mo === selMonth ? 'bg-orange-50/60' : ''}>
                              <td className={`${td} font-semibold`}>{monthLabel(mo)}</td>
                              <td className={`${td} text-right`}>{s.days}</td>
                              <td className={`${td} text-right`}>{fmt(s.accepted)}</td>
                              <td className={`${td} text-right`}>{fmt(s.kg)}</td>
                              <td className={`${td} text-right`}>{fmt(s.days ? s.kg / s.days : 0)}</td>
                              <td className={`${td} text-right`}>{fmt(s.days ? s.kg / (s.days * crew) : 0)}</td>
                              <td className={`${td} text-right`}>{pct(s.rejected, s.accepted + s.rejected)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Paper kg = width × length × GSM of each accepted roll (as in PE-F-46). Working days = days with at least one Job
                    Card row. "Navkar" in the Job Card grade column is counted as Performance.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

