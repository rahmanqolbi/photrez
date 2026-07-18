// Unit conversion for dimension inputs
// Stores all values internally in pixels; converts to display units on-the-fly.

export type Unit = "px" | "in" | "cm" | "mm" | "pt";

export const UNIT_LABELS: Record<Unit, string> = {
  px: "px",
  in: "in",
  cm: "cm",
  mm: "mm",
  pt: "pt",
};

export const UNITS: Unit[] = ["px", "in", "cm", "mm", "pt"];

// Base DPI for unit conversion (96 = standard screen resolution used by most browsers)
const DPI = 96;

/** Convert a pixel value to the given unit. */
export function pxToUnit(px: number, unit: Unit): number {
  if (unit == null) return px;
  switch (unit) {
    case "px": return px;
    case "in": return px / DPI;
    case "cm": return px / DPI * 2.54;
    case "mm": return px / DPI * 25.4;
    case "pt": return px / DPI * 72;
    default: return px;
  }
}

/** Convert a value in the given unit to pixels (rounded). */
export function unitToPx(value: number, unit: Unit): number {
  if (unit == null) return Math.round(value);
  switch (unit) {
    case "px": return Math.round(value);
    case "in": return Math.round(value * DPI);
    case "cm": return Math.round(value * DPI / 2.54);
    case "mm": return Math.round(value * DPI / 25.4);
    case "pt": return Math.round(value * DPI / 72);
    default: return Math.round(value);
  }
}

/** Format a pixel value for display in the given unit. */
export function formatUnit(px: number, unit: Unit): string {
  if (px == null || unit == null) return String(Math.round(px ?? 0));
  const val = pxToUnit(px, unit);
  if (typeof val !== "number" || !isFinite(val)) return String(Math.round(px));
  if (unit === "px") return String(Math.round(val));
  // physical units → 2 decimal places
  return val.toFixed(2);
}
