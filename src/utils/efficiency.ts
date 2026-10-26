import { BundleRecord, FloorStaff, Machine, MaterialInward } from '../types';
import { orderTargetKg, packedKg } from './floorPlan';

/*
 * Machine efficiency from the records SlitFlow already keeps.
 *
 * Factory calendar (local time):
 *   Day shift 8:30 AM - 7:00 PM, lunch 1:00 - 2:00 PM  -> 9.5 h, Monday to Saturday.
 *   Night shift 7:00 PM - 1:30 AM, counted only on nights a machine weighed bundles in that time.
 *   Sunday is off; it counts only for a machine that weighed bundles that day.
 *
 * Run of each PO on a machine, chained in the order the POs were run:
 *   first PO: starts at Start Slit (or its first bundle if Start Slit was never recorded);
 *   next PO: starts where the previous PO ended (its last bundle), or later at its own Start Slit
 *            if that was pressed after the previous PO finished (the gap is idle time);
 *   a PO ends at its last bundle, or now if it is still under slitting.
 * Only time inside the shift windows counts, so lunch, nights not worked and Sundays never do.
 */

const MIN = 60 * 1000;
const DAY_WINDOWS: Array<[number, number]> = [
  [8 * 60 + 30, 13 * 60],
  [14 * 60, 19 * 60],
];
const NIGHT_START = 19 * 60;
const NIGHT_END = 24 * 60 + 90; // 1:30 AM next day

export const MIN_HOURS_FOR_RATE = 0.5;

type Span = [number, number]; // ms

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

// The working day a moment belongs to: 12:00-1:30 AM belongs to the previous day's night shift.
const shiftDay = (t: number) => {
  const d = new Date(t);
  return minutesOfDay(d) < 90 ? dayKey(new Date(midnight(d) - 12 * 60 * MIN)) : dayKey(d);
};
const isNightTime = (t: number) => {
  const m = minutesOfDay(new Date(t));
  return m >= NIGHT_START || m < 90;
};

const overlapMs = (span: Span, windows: Span[]) =>
  windows.reduce((s, [a, b]) => s + Math.max(0, Math.min(span[1], b) - Math.max(span[0], a)), 0);

const liveBundles = (j: MaterialInward): BundleRecord[] => (j.bundles || []).filter((b) => !b.isVoided && b.weighedAt);
const time = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);

// Shift windows for one machine between from and to.
export const shiftWindows = (from: number, to: number, nights: Set<string>, sundays: Set<string>): Span[] => {
  const windows: Span[] = [];
  // Start a day early so the previous night's shift (until 1:30 AM) is included.
  for (let day = midnight(new Date(from)) - 24 * 60 * MIN; day < to; ) {
    const d = new Date(day);
    const key = dayKey(d);
    const at = (minutes: number) => day + minutes * MIN;
    if (d.getDay() !== 0 || sundays.has(key)) DAY_WINDOWS.forEach(([a, b]) => windows.push([at(a), at(b)]));
    if (nights.has(key)) windows.push([at(NIGHT_START), at(NIGHT_END)]);
    day = midnight(new Date(day + 36 * 60 * MIN)); // next midnight, safe across clock changes
  }
  return windows
    .map(([a, b]): Span => [Math.max(a, from), Math.min(b, to)])
    .filter(([a, b]) => b > a);
};

export interface PoRun {
  job: MaterialInward;
  start: number;
  end: number;
  running: boolean; // still under slitting
  firstBundle?: number;
  runHours: number; // shift hours inside the chosen period
  kg: number; // kg weighed inside the chosen period
  toFirstBundleHours?: number; // shift hours from the run start to its first bundle (setup + first bundle)
}

export interface MachineEfficiency {
  machine: Machine;
  availableHours: number;
  runHours: number;
  idleHours: number;
  utilisation: number | null; // 0-1
  kg: number;
  kgPerRunHour: number | null;
  speedEfficiency: number | null; // actual kg/h ÷ standard kg/h
  overall: number | null; // utilisation × speed efficiency
  nights: number;
  runs: PoRun[];
  avgToFirstBundleHours: number | null;
}

export interface OperatorOutput {
  operator: FloorStaff | null; // null = no operator assigned on the order
  kg: number;
  bundles: number;
  shifts: number;
  kgPerShift: number;
}

export interface EfficiencyReport {
  from: number;
  to: number;
  machines: MachineEfficiency[];
  operators: OperatorOutput[];
  totals: { availableHours: number; runHours: number; kg: number; utilisation: number | null };
}

const hours = (ms: number) => ms / (60 * MIN);

export function buildEfficiencyReport(
  jobs: MaterialInward[],
  machines: Machine[],
  staff: FloorStaff[],
  from: number,
  to: number,
  now = Date.now()
): EfficiencyReport {
  const until = Math.min(to, now);

  const machineRows = machines.map((machine): MachineEfficiency => {
    const mine = jobs.filter((j) => j.assignment?.machineId === machine.id);
    const bundles = mine.flatMap(liveBundles);

    // Nights and Sundays this machine actually worked (from its bundle times)
    const nights = new Set<string>();
    const sundays = new Set<string>();
    for (const b of bundles) {
      const t = time(b.weighedAt);
      if (Number.isNaN(t)) continue;
      if (isNightTime(t)) nights.add(shiftDay(t));
      else if (new Date(t).getDay() === 0) sundays.add(dayKey(new Date(t)));
    }

    // Chain the POs in the order they ran
    const started = mine
      .map((job) => {
        const times = liveBundles(job).map((b) => time(b.weighedAt)).filter((t) => !Number.isNaN(t)).sort((a, b) => a - b);
        const startSlit = time(job.productionStartedAt);
        const first = times[0];
        const own = Number.isNaN(startSlit) ? first : startSlit;
        return { job, times, startSlit, own };
      })
      .filter((r) => r.own !== undefined && !Number.isNaN(r.own))
      .sort((a, b) => a.own - b.own);

    const runs: PoRun[] = [];
    let prevEnd: number | undefined;
    for (const r of started) {
      const firstBundle = r.times[0];
      const lastBundle = r.times[r.times.length - 1];
      const running = r.job.status === 'in_production' && packedKg(r.job) < orderTargetKg(r.job);
      let start: number;
      if (prevEnd === undefined) start = r.own;
      else if (!Number.isNaN(r.startSlit) && r.startSlit > prevEnd) start = r.startSlit; // gap before Start Slit = idle
      else start = prevEnd;
      const end = Math.max(start, running ? now : lastBundle ?? start);
      prevEnd = end;
      runs.push({ job: r.job, start, end, running, firstBundle, runHours: 0, kg: 0 });
    }

    const windows = shiftWindows(from, until, nights, sundays);
    const allWindows = shiftWindows(Math.min(from, ...runs.map((r) => r.start)), until, nights, sundays);
    for (const run of runs) {
      run.runHours = hours(overlapMs([run.start, run.end], windows));
      run.kg = liveBundles(run.job)
        .filter((b) => {
          const t = time(b.weighedAt);
          return t >= from && t < to;
        })
        .reduce((s, b) => s + b.netWeightKg, 0);
      if (run.firstBundle !== undefined && run.firstBundle >= run.start) {
        run.toFirstBundleHours = hours(overlapMs([run.start, run.firstBundle], allWindows));
      }
    }
    const inPeriod = runs.filter((r) => r.runHours > 0 || r.kg > 0);

    const availableHours = hours(windows.reduce((s, [a, b]) => s + (b - a), 0));
    const runHours = inPeriod.reduce((s, r) => s + r.runHours, 0);
    const kg = inPeriod.reduce((s, r) => s + r.kg, 0);
    const utilisation = availableHours > 0 ? Math.min(1, runHours / availableHours) : null;
    // Under half an hour of measured running is too little to give a fair rate.
    const kgPerRunHour = runHours >= MIN_HOURS_FOR_RATE ? kg / runHours : null;
    const speedEfficiency = kgPerRunHour !== null && machine.expectedKgPerHour ? kgPerRunHour / machine.expectedKgPerHour : null;
    const firstBundleTimes = inPeriod
      .filter((r) => r.start >= from && r.toFirstBundleHours !== undefined)
      .map((r) => r.toFirstBundleHours!);

    return {
      machine,
      availableHours,
      runHours,
      idleHours: Math.max(0, availableHours - runHours),
      utilisation,
      kg,
      kgPerRunHour,
      speedEfficiency,
      overall: utilisation !== null && speedEfficiency !== null ? utilisation * speedEfficiency : null,
      nights: [...nights].filter((d) => {
        const t = new Date(`${d}T20:00:00`).getTime();
        return t >= from - 24 * 60 * MIN && t < until;
      }).length,
      runs: inPeriod,
      avgToFirstBundleHours: firstBundleTimes.length ? firstBundleTimes.reduce((s, h) => s + h, 0) / firstBundleTimes.length : null,
    };
  });

  // Output per operator: bundles weighed in the period on orders they were running
  const byOperator = new Map<string, { kg: number; bundles: number; days: Set<string> }>();
  for (const job of jobs) {
    if (!job.assignment?.machineId) continue;
    const key = job.assignment.operatorId || '';
    for (const b of liveBundles(job)) {
      const t = time(b.weighedAt);
      if (!(t >= from && t < to)) continue;
      const entry = byOperator.get(key) || { kg: 0, bundles: 0, days: new Set<string>() };
      entry.kg += b.netWeightKg;
      entry.bundles += 1;
      entry.days.add(shiftDay(t) + (isNightTime(t) ? '-night' : ''));
      byOperator.set(key, entry);
    }
  }
  const operators = [...byOperator.entries()]
    .map(([id, e]): OperatorOutput => ({
      operator: staff.find((s) => s.id === id) || null,
      kg: e.kg,
      bundles: e.bundles,
      shifts: e.days.size,
      kgPerShift: e.days.size ? e.kg / e.days.size : 0,
    }))
    .sort((a, b) => b.kgPerShift - a.kgPerShift);

  const totalsAvailable = machineRows.reduce((s, m) => s + m.availableHours, 0);
  const totalsRun = machineRows.reduce((s, m) => s + m.runHours, 0);
  return {
    from,
    to,
    machines: machineRows,
    operators,
    totals: {
      availableHours: totalsAvailable,
      runHours: totalsRun,
      kg: machineRows.reduce((s, m) => s + m.kg, 0),
      utilisation: totalsAvailable > 0 ? totalsRun / totalsAvailable : null,
    },
  };
}
