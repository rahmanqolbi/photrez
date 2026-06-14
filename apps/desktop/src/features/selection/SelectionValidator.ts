import { SelectionState, SelectionValidationResult } from "./SelectionTypes";

export function validateSelection(
  selection: SelectionState,
): SelectionValidationResult {
  const errors: string[] = [];

  if (!isFinite(selection.x)) {
    errors.push("x must be finite");
  }
  if (!isFinite(selection.y)) {
    errors.push("y must be finite");
  }
  if (!isFinite(selection.width)) {
    errors.push("width must be finite");
  }
  if (!isFinite(selection.height)) {
    errors.push("height must be finite");
  }
  if (!isFinite(selection.angle)) {
    errors.push("angle must be finite");
  }
  if (selection.width < 0) {
    errors.push("width must be non-negative");
  }
  if (selection.height < 0) {
    errors.push("height must be non-negative");
  }

  return { valid: errors.length === 0, errors };
}

export function normalizeSelection(selection: SelectionState): SelectionState {
  let { x, y, width, height, angle } = selection;

  if (width < 0) {
    x = x + width;
    width = -width;
  }
  if (height < 0) {
    y = y + height;
    height = -height;
  }

  angle = ((angle % 360) + 540) % 360 - 180;

  return { x, y, width, height, angle };
}
