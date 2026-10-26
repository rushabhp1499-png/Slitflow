import React, { useEffect, useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward } from '../types';
import { formatKg } from '../utils/weight';
import { isMachineLocked, isOpenOrder, machineQueue, orderTargetKg, packedKg, pendingKg } from '../utils/floorPlan';
import { Maximize, ArrowLeft, PanelLeftClose, PanelLeftOpen, Search, X, GripVertical, Lock } from 'lucide-react';

// Live Floor and planner. Left: open POs not yet on a machine. Right: one tile per machine with the
// order it is on and the orders lined up after it. Drag a PO onto a machine (or tap it, then tap the
// machine) to plan it; drag it back to the list to take it off.
// Production = net weight of bundles weighed for the order (bundles are weighed in packaging,
// so it runs a little behind the machine).

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const minutesAgo = (iso: string, now: number) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

const agoText = (mins: number) =>
  mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)} h ${mins % 60} min ago`;

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const PANEL_KEY = 'slitflow.floor.poPanel';

export const LiveFloor: React.FC = () => {
  const { jobs, machines, floorStaff, floorSetupMissing, planJob } = useProduction();
  const [now, setNow] = useState(Date.now());
  const [showPanel, setShowPanel] = useState(() => {
    try {
      return localStorage.getItem(PANEL_KEY) !== 'hidden';
    } catch {
      return true;
    }
  });
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // machine id, or 'list'
  const [pickedId, setPickedId] = useState<string | null>(null); // tap-to-place on touch screens

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPickedId(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const togglePanel = () => {
    setShowPanel((v) => {
      try {
        localStorage.setItem(PANEL_KEY, v ? 'hidden' : 'shown');
      } catch {
        /* per-browser preference only */
      }
      return !v;
    });
  };

  const today = localDay(new Date(now));
  const staffName = (id?: string) => floorStaff.find((s) => s.id === id)?.name;

  const activeMachines = machines
    .filter((m) => m.active)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  const activeIds = new Set(activeMachines.map((m) => m.id));
  const jobById = (id: string | null) => (id ? jobs.find((j) => j.id === id) : undefined);

  // Open POs not on any working machine, soonest due first
  const q = search.trim().toLowerCase();
  const unplanned = jobs
    .filter((j) => isOpenOrder(j) && !(j.assignment?.machineId && activeIds.has(j.assignment.machineId)))
    .filter((j) => !q || [j.customerPoNo, j.customerName, j.grade, j.jobNo].some((f) => (f || '').toLowerCase().includes(q)))
    .sort(
      (a, b) =>
        (a.estimatedDeliveryDate || '9999').localeCompare(b.estimatedDeliveryDate || '9999') ||
        (a.receivedDate || '').localeCompare(b.receivedDate || '')
    );

  // Today's totals across the whole floor
  const bundlesToday = jobs.flatMap((j) => (j.bundles || []).filter((b) => !b.isVoided && localDay(new Date(b.weighedAt)) === today));
  const packedTodayKg = bundlesToday.reduce((s, b) => s + b.netWeightKg, 0);
  const dispatchedTodayKg = jobs
    .flatMap((j) => j.challans || [])
    .filter((c) => !c.isSuperseded && c.challanDate === today)
    .reduce((s, c) => s + c.thisDispatchWeightKg, 0);
  const runningCount = activeMachines.filter((m) => machineQueue(jobs, m.id)[0]?.status === 'in_production').length;
  const plannedKg = activeMachines.reduce((s, m) => s + machineQueue(jobs, m.id).reduce((t, j) => t + pendingKg(j), 0), 0);

  // ── Moving orders ──
  const place = (jobId: string, machineId: string | null, beforeJobId?: string) => {
    const job = jobById(jobId);
    if (!job || jobId === beforeJobId) {
      setPickedId(null);
      return;
    }
    if (isMachineLocked(job) && job.assignment?.machineId !== machineId) {
      const on = machines.find((m) => m.id === job.assignment?.machineId)?.number || 'its machine';
      window.alert(`Production has started for PO ${job.customerPoNo} on ${on}, so it can't be moved or taken off.`);
      setPickedId(null);
      return;
    }
    planJob(jobId, machineId, beforeJobId);
    setPickedId(null);
  };

  // Started orders stay on their machine, so they can't be picked up.
  const dragProps = (job: MaterialInward) => ({
    draggable: !isMachineLocked(job),
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', job.id);
      e.dataTransfer.effectAllowed = 'move';
      setDragId(job.id);
    },
    onDragEnd: () => {
      setDragId(null);
      setDropTarget(null);
    },
  });

  const dropProps = (target: string, onDropJob: (jobId: string) => void) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dropTarget !== target) setDropTarget(target);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget((t) => (t === target ? null : t));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const id = e.dataTransfer.getData('text/plain') || dragId;
      setDragId(null);
      setDropTarget(null);
      if (id) onDropJob(id);
    },
  });

  const picked = jobById(pickedId);
  const clock = new Date(now);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/" className="text-slate-500 hover:text-white" title="Back to dashboard">
            <ArrowLeft className="w-6 h-6" />
          </a>
          <button
            onClick={togglePanel}
            className="p-2 text-slate-400 hover:text-white border border-slate-800 rounded-lg"
            title={showPanel ? 'Hide the pending PO list (TV view)' : 'Show the pending PO list to plan machines'}
          >
            {showPanel ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">LIVE FLOOR</h1>
            <p className="text-slate-400 text-sm">Progressive Enterprises • Planner</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: 'Machines running', value: `${runningCount} / ${activeMachines.length}`, color: 'text-emerald-400' },
            { label: 'Planned on machines', value: `${formatKg(plannedKg)} kg`, color: 'text-violet-300' },
            { label: 'Packed today', value: `${formatKg(packedTodayKg)} kg`, color: 'text-sky-400' },
            { label: 'Bundles today', value: String(bundlesToday.length), color: 'text-sky-400' },
            { label: 'Dispatched today', value: `${formatKg(dispatchedTodayKg)} kg`, color: 'text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">{s.label}</div>
              <div className={`text-xl sm:text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
            </div>
          ))}
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-black font-mono">
              {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-slate-400 text-sm">
              {clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="p-2 text-slate-400 hover:text-white border border-slate-800 rounded-lg"
            title="Full screen"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {picked && (
        <div className="flex items-center justify-between gap-3 bg-violet-900/50 border border-violet-500 rounded-xl px-4 py-2 text-sm">
          <span>
            Tap a machine to put <strong className="font-mono">PO {picked.customerPoNo}</strong> in its line
            {picked.assignment?.machineId ? ', or tap the PO list to take it off its machine' : ''}.
          </span>
          <button onClick={() => setPickedId(null)} className="font-bold text-violet-200 hover:text-white">
            Cancel
          </button>
        </div>
      )}

      {floorSetupMissing || activeMachines.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-slate-400 text-lg">
          {floorSetupMissing
            ? 'Machines are not set up in the database yet. Run section 7 of supabase/schema.sql, then reload.'
            : 'No machines yet. Add them in Floor Setup on the factory dashboard.'}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* ── Pending POs ── */}
          {showPanel && (
            <aside
              {...dropProps('list', (id) => place(id, null))}
              onClick={() => picked?.assignment?.machineId && place(picked.id, null)}
              className={`w-full lg:w-[17%] lg:min-w-[250px] lg:max-w-[340px] shrink-0 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] flex flex-col rounded-2xl border-2 bg-slate-900/70 ${
                dropTarget === 'list' ? 'border-violet-400' : 'border-slate-800'
              }`}
            >
              <div className="p-3 border-b border-slate-800">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-black tracking-wider">PENDING POs</h2>
                  <span className="text-xs text-slate-400">{unplanned.length} not on a machine</span>
                </div>
                <div className="relative mt-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="PO, customer, material"
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="p-2 space-y-1.5 overflow-y-auto">
                {unplanned.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 px-2">
                    {q ? 'No pending PO matches.' : 'Every open PO is on a machine.'}
                    {dragId ? ' Drop here to take an order off its machine.' : ''}
                  </p>
                ) : (
                  unplanned.map((j) => {
                    const edd = j.estimatedDeliveryDate;
                    const isPicked = pickedId === j.id;
                    return (
                      <div
                        key={j.id}
                        {...dragProps(j)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickedId(isPicked ? null : j.id);
                        }}
                        className={`rounded-lg border px-2.5 py-2 cursor-grab active:cursor-grabbing select-none ${
                          isPicked ? 'border-violet-400 bg-violet-950/60' : 'border-slate-700 bg-slate-950 hover:border-slate-500'
                        } ${dragId === j.id ? 'opacity-40' : ''}`}
                        title="Drag onto a machine, or tap then tap a machine"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-sky-300 text-sm truncate">{j.customerPoNo}</span>
                          <span
                            className={`text-[10px] font-bold shrink-0 ${
                              !edd ? 'text-slate-500' : edd < today ? 'text-red-400' : edd === today ? 'text-amber-300' : 'text-slate-300'
                            }`}
                          >
                            {edd ? `Due ${shortDate(edd)}` : 'No date'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold truncate">{j.customerName}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {j.grade} • {j.thickness} {j.thicknessUnit} × {j.incomingWidth} mm
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] mt-0.5">
                          <span className="text-slate-400 truncate">
                            {j.requestedSlitSizes?.length ? j.requestedSlitSizes.map((s) => s.widthMm).join(', ') + ' mm' : 'Sizes not set'}
                          </span>
                          <span className="font-mono font-bold text-white shrink-0">{formatKg(pendingKg(j))} kg</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          {/* ── Machines ── */}
          <div className="flex-1 min-w-0 w-full grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {activeMachines.map((m) => {
              const line = machineQueue(jobs, m.id);
              const [job, ...next] = line;
              const running = job?.status === 'in_production';
              const bundles = (job?.bundles || []).filter((b) => !b.isVoided);
              const doneKg = job ? packedKg(job) : 0;
              const targetKg = job ? orderTargetKg(job) : 0;
              const pct = targetKg > 0 ? Math.min(100, Math.round((doneKg / targetKg) * 100)) : 0;
              const lastBundle = [...bundles].sort((a, b) => b.weighedAt.localeCompare(a.weighedAt))[0];
              const lastMins = lastBundle ? minutesAgo(lastBundle.weighedAt, now) : null;
              const edd = job?.estimatedDeliveryDate;
              const eddTone = !edd ? 'text-slate-500' : edd < today ? 'text-red-400' : edd === today ? 'text-amber-300' : 'text-slate-300';
              const loadKg = line.reduce((s, j) => s + pendingKg(j), 0);
              const isTarget = dropTarget === m.id || (!!picked && picked.assignment?.machineId !== m.id);

              return (
                <div
                  key={m.id}
                  {...dropProps(m.id, (id) => place(id, m.id))}
                  onClick={() => picked && place(picked.id, m.id)}
                  className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition ${
                    dropTarget === m.id
                      ? 'border-violet-400 bg-violet-950/40'
                      : running
                      ? 'border-emerald-500/70 bg-emerald-950/30'
                      : job
                      ? 'border-amber-500/50 bg-slate-900'
                      : 'border-slate-800 bg-slate-900/60'
                  } ${isTarget && picked ? 'cursor-pointer ring-2 ring-violet-500/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-3xl font-black font-mono leading-none">{m.number}</div>
                      {m.name && <div className="text-xs text-slate-400 mt-1">{m.name}</div>}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black tracking-wider ${
                        running ? 'bg-emerald-500 text-emerald-950 animate-pulse' : job ? 'bg-amber-400 text-amber-950' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {running ? 'RUNNING' : job ? 'SET UP' : 'IDLE'}
                    </span>
                  </div>

                  {job ? (
                    <>
                      <div
                        {...dragProps(job)}
                        // Not started yet: a PO dropped here goes ahead of it. Under slitting: it stays first.
                        {...dropProps(`${m.id}:${job.id}`, (id) => place(id, m.id, running ? undefined : job.id))}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (picked) place(picked.id, m.id, running ? undefined : job.id);
                          else if (!isMachineLocked(job)) setPickedId(job.id);
                        }}
                        className={`${isMachineLocked(job) ? '' : 'cursor-grab active:cursor-grabbing'} select-none rounded-lg ${
                          dropTarget === `${m.id}:${job.id}` && !running ? 'border-t-2 border-violet-400 pt-1' : ''
                        } ${pickedId === job.id ? 'ring-2 ring-violet-400' : ''} ${dragId === job.id ? 'opacity-40' : ''}`}
                        title={
                          isMachineLocked(job)
                            ? `Production has started, so this PO stays on ${m.number}`
                            : 'Drag to another machine or back to the PO list'
                        }
                      >
                        <div className="text-xl font-black font-mono text-sky-300 flex items-center gap-2">
                          PO {job.customerPoNo}
                          {isMachineLocked(job) && <Lock className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div className="text-base font-bold truncate">{job.customerName}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {job.grade} • {job.thickness} {job.thicknessUnit}
                          {job.requestedSlitSizes?.length ? ` • ${job.requestedSlitSizes.map((s) => `${s.widthMm} mm`).join(', ')}` : ''}
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="text-[10px] uppercase text-slate-500 mr-2">Operator</span>
                        <span className="font-bold">{staffName(job.assignment?.operatorId) || '—'}</span>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-black font-mono text-lg">{formatKg(doneKg)} kg</span>
                          <span className="text-slate-400 font-mono">of {formatKg(targetKg)} kg • {pct}%</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${running ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-slate-400 gap-2">
                        <span>
                          {bundles.length} bundles{lastMins !== null ? ` • last ${agoText(lastMins)}` : ''}
                        </span>
                        <span className={`font-bold ${eddTone}`}>{edd ? `Due ${shortDate(edd)}` : 'No due date'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500 text-sm py-5 text-center border border-dashed border-slate-700 rounded-xl">
                      {dragId || picked ? 'Drop the PO here' : 'No order. Drag a PO here.'}
                    </div>
                  )}

                  {/* The line after the current order */}
                  {next.length > 0 && (
                    <div className="border-t border-slate-800 pt-2 space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Next on {m.number}</div>
                      {next.map((j, i) => (
                        <div
                          key={j.id}
                          {...dragProps(j)}
                          {...dropProps(`${m.id}:${j.id}`, (id) => place(id, m.id, j.id))}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (picked) place(picked.id, m.id, j.id);
                            else if (!isMachineLocked(j)) setPickedId(j.id);
                          }}
                          className={`flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 select-none ${
                            isMachineLocked(j) ? '' : 'cursor-grab active:cursor-grabbing'
                          } ${
                            dropTarget === `${m.id}:${j.id}` ? 'bg-violet-900/60 border-t-2 border-violet-400' : 'bg-slate-950/60'
                          } ${pickedId === j.id ? 'ring-2 ring-violet-400' : ''} ${dragId === j.id ? 'opacity-40' : ''}`}
                          title="Drag to change the order, or onto another machine"
                        >
                          <GripVertical className="w-3 h-3 text-slate-600 shrink-0" />
                          <span className="text-slate-500 w-4 shrink-0">{i + 2}.</span>
                          <span className="font-mono font-bold text-sky-300 shrink-0">{j.customerPoNo}</span>
                          <span className="text-slate-400 truncate flex-1">{j.customerName}</span>
                          <span className="font-mono text-slate-300 shrink-0">{formatKg(pendingKg(j))} kg</span>
                          {isMachineLocked(j) ? (
                            <span title={`Production has started, so this PO stays on ${m.number}`}>
                              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            </span>
                          ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              place(j.id, null);
                            }}
                            className="text-slate-600 hover:text-red-400 shrink-0"
                            title="Take off this machine"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {line.length > 0 && (
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>
                        {line.length} order{line.length > 1 ? 's' : ''} on this machine
                      </span>
                      <span className="font-mono">Load {formatKg(loadKg)} kg</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
