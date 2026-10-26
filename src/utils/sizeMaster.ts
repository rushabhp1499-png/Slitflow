import { FloorStaff, Machine, MaterialInward } from '../types';

// SlitSmart (Size Master) is served from public/size-master as its own page.
export const SIZE_MASTER_URL = '/size-master/index.html';

const toMicrons = (job: MaterialInward) => {
  if (!(job.thickness > 0)) return null;
  if (job.thicknessUnit === 'mm') return +(job.thickness * 1000).toFixed(1);
  if (job.thicknessUnit === 'gauge') return +(job.thickness / 4).toFixed(1); // 100 gauge = 25 µm
  return job.thickness;
};

// Size Master link with the order's roll and slit sizes filled in (after the #, so it never leaves the browser).
export const sizeMasterLink = (job: MaterialInward, machines: Machine[], staff: FloorStaff[]) => {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') params.set(key, String(value));
  };
  const sizes = job.requestedSlitSizes || [];
  const requestedKg = sizes.reduce((sum, s) => sum + (s.quantityKg || 0), 0);

  set('po', job.customerPoNo);
  set('customer', job.customerName);
  set('mat', job.materialType === 'Kraft Paper Reel' ? 'paper' : 'plastic');
  set('film', job.grade);
  set('thick', toMicrons(job));
  set('width', job.incomingWidth || null);
  set('weight', job.incomingWeight || null);
  set('sizes', sizes.filter((s) => s.widthMm > 0 && s.quantityKg > 0).map((s) => `${s.widthMm}:${s.quantityKg}`).join(','));
  set('machine', machines.find((m) => m.id === job.assignment?.machineId)?.number);
  set('operator', staff.find((s) => s.id === job.assignment?.operatorId)?.name);
  set('qty', requestedKg > 0 ? +requestedKg.toFixed(2) : job.incomingWeight || null);

  return `${SIZE_MASTER_URL}#${params.toString()}`;
};
