import React, { useEffect, useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward, Machine } from '../types';
import { formatKg } from '../utils/weight';
import { Maximize, ArrowLeft } from 'lucide-react';

// Full-screen factory display for a big TV: one tile per machine, updating live.
// Production = net weight of bundles weighed for the order on that machine
// (bundles are weighed in packaging, so it runs a little behind the machine).

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isOpen = (j: MaterialInward) =>
  j.status !== 'po_closed' && j.poStatus !== 'closed' && j.status !== 'dispatched' && (j.remainingWeightKg ?? j.incomingWeight) > 0;

const minutesAgo = (iso: string, now: number) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

const agoText = (mins: number) =>
  mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)} h ${mins % 60} min ago`;

export const LiveFloor: React.FC = () => {
  const { jobs, machines, floorStaff, floorSetupMissing } = useProduction();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const today = localDay(new Date(now));
  const staffName = (id?: string) => floorStaff.find((s) => s.id === id)?.name;

  const activeMachines = machines
    .filter((m) => m.active)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  // The order each machine is on: the one in production, otherwise the latest assigned open order.
  const machineJobs = (m: Machine) => {
    const open = jobs
      .filter((j) => j.assignment?.machineId === m.id && isOpen(j))
      .sort((a, b) => (b.assignment?.assignedAt || '').localeCompare(a.assignment?.assignedAt || ''));
    const current = open.find((j) => j.status === 'in_production') || open[0];
    return { current, waiting: open.filter((j) => j !== current).length };
  };

  // Today's totals across the whole floor
  const bundlesToday = jobs.flatMap((j) => (j.bundles || []).filter((b) => !b.isVoided && localDay(new Date(b.weighedAt)) === today));
  const packedTodayKg = bundlesToday.reduce((s, b) => s + b.netWeightKg, 0);
  const dispatchedTodayKg = jobs
    .flatMap((j) => j.challans || [])
    .filter((c) => !c.isSuperseded && c.challanDate === today)
    .reduce((s, c) => s + c.thisDispatchWeightKg, 0);
  const runningCount = activeMachines.filter((m) => machineJobs(m).current?.status === 'in_production').length;
  const inProductionUnassigned = jobs.filter((j) => j.status === 'in_production' && isOpen(j) && !j.assignment?.machineId);

  const clock = new Date(now);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/" className="text-slate-500 hover:text-white" title="Back to dashboard">
            <ArrowLeft className="w-6 h-6" />
          </a>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">LIVE FLOOR</h1>
            <p className="text-slate-400 text-sm">Progressive Enterprises</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: 'Machines running', value: `${runningCount} / ${activeMachines.length}`, color: 'text-emerald-400' },
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

      {floorSetupMissing || activeMachines.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-slate-400 text-lg">
          {floorSetupMissing
            ? 'Machines are not set up in the database yet. Run section 7 of supabase/schema.sql, then reload.'
            : 'No machines yet. Add them in Floor Setup on the factory dashboard.'}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {activeMachines.map((m) => {
            const { current: job, waiting } = machineJobs(m);
            const running = job?.status === 'in_production';
            const bundles = (job?.bundles || []).filter((b) => !b.isVoided);
            const packedKg = bundles.reduce((s, b) => s + b.netWeightKg, 0);
            const targetKg = job
              ? (job.requestedSlitSizes || []).reduce((s, x) => s + x.quantityKg, 0) || job.incomingWeight
              : 0;
            const pct = targetKg > 0 ? Math.min(100, Math.round((packedKg / targetKg) * 100)) : 0;
            const lastBundle = [...bundles].sort((a, b) => b.weighedAt.localeCompare(a.weighedAt))[0];
            const lastMins = lastBundle ? minutesAgo(lastBundle.weighedAt, now) : null;
            const edd = job?.estimatedDeliveryDate;
            const eddTone = !edd ? 'text-slate-500' : edd < today ? 'text-red-400' : edd === today ? 'text-amber-300' : 'text-slate-300';
            const helpers = (job?.assignment?.helperIds || []).map(staffName).filter(Boolean).join(', ');

            return (
              <div
                key={m.id}
                className={`rounded-2xl border-2 p-4 flex flex-col gap-3 ${
                  running ? 'border-emerald-500/70 bg-emerald-950/30' : job ? 'border-amber-500/50 bg-slate-900' : 'border-slate-800 bg-slate-900/60'
                }`}
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
                    <div>
                      <div className="text-xl font-black font-mono text-sky-300">PO {job.customerPoNo}</div>
                      <div className="text-base font-bold truncate">{job.customerName}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {job.grade} • {job.thickness} {job.thicknessUnit}
                        {job.requestedSlitSizes?.length ? ` • ${job.requestedSlitSizes.map((s) => `${s.widthMm} mm`).join(', ')}` : ''}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-[10px] uppercase text-slate-500">Operator</div>
                        <div className="font-bold truncate">{staffName(job.assignment?.operatorId) || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-500">Helpers</div>
                        <div className="font-bold truncate">{helpers || '—'}</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-black font-mono text-lg">{formatKg(packedKg)} kg</span>
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
                      <span className={`font-bold ${eddTone}`}>
                        {edd ? `Due ${new Date(edd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No due date'}
                      </span>
                    </div>
                    {waiting > 0 && <div className="text-xs text-slate-500">+{waiting} more order{waiting > 1 ? 's' : ''} queued on this machine</div>}
                  </>
                ) : (
                  <div className="text-slate-500 text-sm py-6 text-center">No order assigned</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {inProductionUnassigned.length > 0 && (
        <div className="text-sm text-amber-300 bg-amber-950/40 border border-amber-800 rounded-xl px-4 py-2">
          In production without a machine assigned: {inProductionUnassigned.map((j) => j.customerPoNo).join(', ')}
        </div>
      )}
    </div>
  );
};
