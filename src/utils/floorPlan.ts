import { MaterialInward, RollSpec } from '../types';

// Roll-length orders: rolls of a fixed length are counted; their weight is not tracked.
export const isRollOrder = (j: MaterialInward) => j.orderType === 'rolls';

// "500 m", "500 m × 450 mm"
export const rollSpecLabel = (s: Pick<RollSpec, 'lengthM' | 'widthMm'>) =>
  `${s.lengthM} m${s.widthMm ? ` × ${s.widthMm} mm` : ''}`;

export const rollsMade = (j: MaterialInward, specId?: string) =>
  (j.rollEntries || []).filter((e) => !specId || e.specId === specId).reduce((s, e) => s + e.rolls, 0);

export const rollsOnChallans = (j: MaterialInward, specId?: string) =>
  (j.challans || [])
    .filter((c) => !c.isSuperseded)
    .flatMap((c) => c.rollLines || [])
    .filter((l) => !specId || l.specId === specId)
    .reduce((s, l) => s + l.rolls, 0);

export const rollsTarget = (j: MaterialInward) => (j.rollSpecs || []).reduce((s, x) => s + (x.targetRolls || 0), 0);

// Incoming weight is optional (e.g. mixed container lots): with none entered there is no balance to tally.
// Roll-length orders are counted in rolls, so their kg balance is never tallied either.
export const tracksWeight = (j: MaterialInward) => (j.incomingWeight || 0) > 0 && !isRollOrder(j);

// Material still to slit or send: by weight when it was entered, otherwise until the PO is dispatched or closed.
export const hasMaterialLeft = (j: MaterialInward) =>
  !tracksWeight(j) || (j.remainingWeightKg ?? j.incomingWeight) > 0;

// Still has material to slit or send: shown on the floor planner.
export const isOpenOrder = (j: MaterialInward) =>
  j.status !== 'po_closed' && j.poStatus !== 'closed' && j.status !== 'dispatched' && hasMaterialLeft(j);

// Once slitting has started on a machine, the order stays on it (the database enforces this too).
export const isMachineLocked = (j: MaterialInward) =>
  !!j.assignment?.machineId && j.status !== 'received' && j.status !== 'pending_production';

// A machine's line of open orders: the one under slitting first, then the planned order.
export const machineQueue = (jobs: MaterialInward[], machineId: string) =>
  jobs
    .filter((j) => j.assignment?.machineId === machineId && isOpenOrder(j))
    .sort(
      (a, b) =>
        Number(b.status === 'in_production') - Number(a.status === 'in_production') ||
        (a.assignment?.queuePosition ?? Infinity) - (b.assignment?.queuePosition ?? Infinity) ||
        (a.assignment?.assignedAt || '').localeCompare(b.assignment?.assignedAt || '')
    );

// Puts an order in a machine's line (before another order, or last), or takes it off (machineId null).
// Renumbers that machine's line 1, 2, 3... and changes only the orders whose place moved.
export const planOrder = (
  jobs: MaterialInward[],
  jobId: string,
  machineId: string | null,
  beforeJobId: string | undefined,
  actor: string,
  nowIso: string
): MaterialInward[] => {
  const moving = jobs.find((j) => j.id === jobId);
  if (!moving || (isMachineLocked(moving) && moving.assignment?.machineId !== machineId)) return jobs;
  if (!machineId) {
    return jobs.map((j) => (j.id === jobId ? { ...j, assignment: undefined, updatedAt: nowIso } : j));
  }
  const line = machineQueue(jobs, machineId).filter((j) => j.id !== jobId);
  const at = beforeJobId ? line.findIndex((j) => j.id === beforeJobId) : -1;
  line.splice(at >= 0 ? at : line.length, 0, moving);
  // An order under slitting always stays at the front.
  line.sort((a, b) => Number(b.status === 'in_production') - Number(a.status === 'in_production'));
  const positions = new Map(line.map((j, i) => [j.id, i + 1]));
  const sameMachine = moving.assignment?.machineId === machineId;

  return jobs.map((j) => {
    const position = positions.get(j.id);
    if (position === undefined) return j;
    if (j.id === jobId) {
      if (sameMachine && j.assignment?.queuePosition === position) return j;
      return {
        ...j,
        assignment: {
          machineId,
          // The operator belongs to the machine, so a move to another machine clears it.
          operatorId: sameMachine ? j.assignment?.operatorId : undefined,
          queuePosition: position,
          assignedAt: nowIso,
          assignedBy: actor,
        },
        updatedAt: nowIso,
      };
    }
    if (j.assignment?.queuePosition === position) return j;
    return { ...j, assignment: { ...j.assignment!, queuePosition: position }, updatedAt: nowIso };
  });
};

// Kg the order still needs: the slit sizes asked for (or the incoming weight) less what is already packed.
export const orderTargetKg = (j: MaterialInward) =>
  (j.requestedSlitSizes || []).reduce((s, x) => s + x.quantityKg, 0) || j.incomingWeight;

export const packedKg = (j: MaterialInward) =>
  (j.bundles || []).filter((b) => !b.isVoided).reduce((s, b) => s + b.netWeightKg, 0);

export const pendingKg = (j: MaterialInward) => (isRollOrder(j) ? 0 : Math.max(0, orderTargetKg(j) - packedKg(j)));

// Progress of an order for bars and labels: kg packed, or rolls made for roll-length orders.
export const orderProgress = (j: MaterialInward) => {
  if (isRollOrder(j)) {
    const done = rollsMade(j);
    const target = rollsTarget(j);
    return {
      pct: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0,
      label: target > 0 ? `${done} of ${target} rolls` : `${done} rolls made`,
      left: target > 0 ? `${Math.max(0, target - done)} rolls` : `${done} rolls`,
    };
  }
  const target = orderTargetKg(j);
  const done = packedKg(j);
  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return {
    pct: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0,
    label: `${fmt(done)} of ${fmt(target)} kg packed`,
    left: `${fmt(pendingKg(j))} kg`,
  };
};
