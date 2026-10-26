import { MaterialInward } from '../types';

// Still has material to slit or send: shown on the floor planner.
export const isOpenOrder = (j: MaterialInward) =>
  j.status !== 'po_closed' && j.poStatus !== 'closed' && j.status !== 'dispatched' && (j.remainingWeightKg ?? j.incomingWeight) > 0;

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

export const pendingKg = (j: MaterialInward) => Math.max(0, orderTargetKg(j) - packedKg(j));
