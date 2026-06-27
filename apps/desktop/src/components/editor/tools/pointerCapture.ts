export interface PointerCaptureElement {
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
}

export function trySetPointerCapture(target: PointerCaptureElement | null | undefined, pointerId: number): boolean {
  if (!target) return false;

  try {
    target.setPointerCapture(pointerId);
    return true;
  } catch {
    return false;
  }
}

export function tryReleasePointerCapture(target: PointerCaptureElement | null | undefined, pointerId: number): boolean {
  if (!target) return false;

  try {
    target.releasePointerCapture(pointerId);
    return true;
  } catch {
    return false;
  }
}
