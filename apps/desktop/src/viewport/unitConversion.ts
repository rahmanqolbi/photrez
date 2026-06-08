export const PPI = 300;

export const UNIT_TO_PX: Record<string, number> = {
  px: 1,
  cm: PPI / 2.54,
  mm: PPI / 25.4,
  in: PPI,
};

export function toUnit(px: number, unit: string): number {
  const factor = UNIT_TO_PX[unit] ?? 1;
  return +(px / factor).toFixed(2);
}

export function fromUnit(val: number, unit: string): number {
  const factor = UNIT_TO_PX[unit] ?? 1;
  return +(val * factor).toFixed(2);
}
