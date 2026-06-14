import { SelectionState } from "./SelectionTypes";
import { validateSelection, normalizeSelection } from "./SelectionValidator";

export type SelectionEvent =
  | { type: "created" }
  | { type: "moved" }
  | { type: "rotated" }
  | { type: "cleared" };

export class SelectionManager {
  private state: SelectionState | null = null;
  private snapshot: SelectionState | null = null;
  private listeners = new Map<SelectionEvent["type"], Set<() => void>>();

  getState(): SelectionState | null {
    return this.state;
  }

  getSnapshot(): SelectionState | null {
    return this.snapshot;
  }

  hasSelection(): boolean {
    return this.state !== null;
  }

  create(x: number, y: number, w: number, h: number, angle: number = 0): void {
    const raw: SelectionState = { x, y, width: w, height: h, angle };
    const normalized = normalizeSelection(raw);
    const validation = validateSelection(normalized);
    if (!validation.valid) {
      throw new Error("invalid selection: " + validation.errors.join(", "));
    }
    this.snapshot = { ...normalized };
    this.state = normalized;
    this.emit("created");
  }

  move(dx: number, dy: number): void {
    if (!this.state) {
      throw new Error("no selection");
    }
    this.snapshot = { ...this.state };
    this.state = {
      ...this.state,
      x: this.state.x + dx,
      y: this.state.y + dy,
    };
    this.emit("moved");
  }

  rotate(angle: number): void {
    if (!this.state) {
      throw new Error("no selection");
    }
    this.snapshot = { ...this.state };
    this.state = {
      ...this.state,
      angle: normalizeSelection({ ...this.state, angle }).angle,
    };
    this.emit("rotated");
  }

  clear(): void {
    this.snapshot = this.state ? { ...this.state } : null;
    this.state = null;
    this.emit("cleared");
  }

  on(type: SelectionEvent["type"], fn: () => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(fn);
  }

  private emit(type: SelectionEvent["type"]): void {
    this.listeners.get(type)?.forEach((fn) => fn());
  }
}
