export interface SelectionState {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionValidationResult {
  valid: boolean;
  errors: string[];
}
