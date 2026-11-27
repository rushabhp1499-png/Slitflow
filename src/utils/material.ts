import { MaterialInward } from '../types';

// Width, thickness, weight and length are optional at inward: a container can hold many sizes.
// These helpers print what was given and fall back to the lot details.

export const thicknessText = (j: Pick<MaterialInward, 'thickness' | 'thicknessUnit'>) =>
  j.thickness > 0 ? `${j.thickness} ${j.thicknessUnit}` : '';

// e.g. "23 microns × 1020 mm", "1020 mm", or the lot details / "Mixed lot" when neither was entered.
export const sizeText = (j: MaterialInward) => {
  const parts = [thicknessText(j), j.incomingWidth > 0 ? `${j.incomingWidth} mm` : ''].filter(Boolean);
  return parts.length ? parts.join(' × ') : j.lotDetails?.trim() || 'Mixed lot';
};

// Grade with thickness in brackets when known: "BOPP Film (23 microns)" or "BOPP Film".
export const gradeText = (j: MaterialInward) => {
  const t = thicknessText(j);
  return t ? `${j.grade} (${t})` : j.grade;
};
