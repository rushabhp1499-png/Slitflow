import { RequestedSlitSize } from '../types';

// The factory scale's least count is 50 g, so weights are kept in 0.05 kg steps.
export const toScaleKg = (kg: number) => Math.round(kg * 20) / 20;

export const formatKg = (kg: number) =>
  kg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// e.g. "20 mm – 500.00 kg, 30 mm – 250.00 kg"
export const describeSlitSizes = (sizes: RequestedSlitSize[] | undefined) =>
  (sizes || []).map((s) => `${s.widthMm} mm – ${formatKg(s.quantityKg)} kg`).join(', ');
