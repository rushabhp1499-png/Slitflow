import { MaterialInward } from '../types';
import { formatKg } from './weight';

export interface TimelineEvent {
  at: string; // ISO date or date-time
  title: string;
  detail?: string;
  tone: 'info' | 'progress' | 'done' | 'warning';
}

// Everything that has happened to an order, oldest first, built from the order record.
export const buildTimeline = (job: MaterialInward): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  events.push({
    at: job.createdAt || job.receivedDate,
    title: 'Material received',
    detail: `${formatKg(job.incomingWeight)} kg ${job.grade}`,
    tone: 'info',
  });

  for (const e of job.eddHistory || []) {
    events.push({
      at: e.setAt,
      title: `Delivery date set: ${new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      detail: e.note,
      tone: 'info',
    });
  }

  for (const r of job.specChangeRequests || []) {
    events.push({ at: r.requestedAt, title: 'Change requested', detail: r.reason, tone: 'warning' });
    if (r.reviewedAt && r.status !== 'pending_approval') {
      events.push({
        at: r.reviewedAt,
        title: r.status === 'approved' ? 'Change approved' : 'Change declined',
        detail: r.reviewNote,
        tone: r.status === 'approved' ? 'done' : 'warning',
      });
    }
  }

  const bundles = (job.bundles || []).filter((b) => !b.isVoided);
  if (bundles.length > 0) {
    const byTime = [...bundles].sort((a, b) => a.weighedAt.localeCompare(b.weighedAt));
    events.push({ at: byTime[0].weighedAt, title: 'Slitting started – first bundle packed', tone: 'progress' });
    if (bundles.length > 1) {
      const packedKg = bundles.reduce((sum, b) => sum + b.netWeightKg, 0);
      events.push({
        at: byTime[byTime.length - 1].weighedAt,
        title: `${bundles.length} bundles packed`,
        detail: `${formatKg(packedKg)} kg net so far`,
        tone: 'progress',
      });
    }
  }

  if (job.outputDetails?.completedAt) {
    events.push({
      at: job.outputDetails.completedAt,
      title: 'Slitting completed',
      detail: `${formatKg(job.outputDetails.totalFinishedWeightKg)} kg finished`,
      tone: 'done',
    });
  }

  for (const c of job.challans || []) {
    if (c.isSuperseded) continue;
    events.push({
      at: c.revisedAt || c.challanDate,
      title: `Dispatched – challan ${c.challanNo}`,
      detail: `${formatKg(c.thisDispatchWeightKg)} kg${c.totalBundles ? ` in ${c.totalBundles} bundles` : ''}${
        c.returnedMaterial ? ` (incl. ${formatKg(c.returnedMaterial.weightKg)} kg unslit material returned)` : ''
      }${c.vehicleNo && c.vehicleNo !== '—' ? ` • vehicle ${c.vehicleNo}` : ''}`,
      tone: 'done',
    });
  }

  if (job.poClosedAt) {
    events.push({ at: job.poClosedAt, title: 'Order completed and closed', detail: job.poClosingNotes, tone: 'done' });
  }

  return events.filter((e) => !!e.at).sort((a, b) => a.at.localeCompare(b.at));
};

// What the customer should expect next, or null when the order is closed.
export const nextStep = (job: MaterialInward): string | null => {
  if (job.status === 'po_closed' || job.poStatus === 'closed') return null;
  if ((job.specChangeRequests || []).some((r) => r.status === 'pending_approval')) {
    return 'Factory is reviewing your change request';
  }
  if (!job.estimatedDeliveryDate) return 'Factory will confirm the delivery date';
  if ((job.remainingWeightKg ?? job.incomingWeight) <= 0 || job.status === 'dispatched') return 'All material dispatched';
  if ((job.bundles || []).some((b) => b.status === 'ready' && !b.isVoided)) return 'Packed bundles waiting for dispatch';
  if (job.status === 'received' || job.status === 'pending_production') return 'Waiting for its turn on the slitting machine';
  return 'Slitting and packing in progress';
};

export const formatEventTime = (at: string) => {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  // Plain dates (no time part) show without a time.
  return at.length <= 10
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};
