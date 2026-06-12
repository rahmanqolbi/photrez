import type { DocumentModel } from "./types";
import { MAX_HISTORY_DEPTH } from "./types";

interface SnapshotEntry {
  snapshot: DocumentModel;
  timestamp: number;
  lastPaintCoords: { x: number; y: number } | null;
}

export class CommandHistory {
  private undoStack: SnapshotEntry[] = [];
  private redoStack: SnapshotEntry[] = [];
  private maxDepth: number;
  private currentLastPaintCoords: { x: number; y: number } | null = null;

  constructor(maxDepth: number = MAX_HISTORY_DEPTH) {
    this.maxDepth = maxDepth;
  }

  setLastPaintCoords(coords: { x: number; y: number } | null): void {
    this.currentLastPaintCoords = coords;
  }

  getLastPaintCoords(): { x: number; y: number } | null {
    return this.currentLastPaintCoords;
  }

  commit(snapshot: DocumentModel): void {
    this.undoStack.push({
      snapshot,
      timestamp: Date.now(),
      lastPaintCoords: this.currentLastPaintCoords,
    });

    // Clear redo stack on new operation
    this.redoStack = [];

    // Enforce max depth
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift(); // Evict oldest
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(currentSnapshot: DocumentModel): DocumentModel | null {
    if (!this.canUndo()) {
      return null;
    }

    const previousEntry = this.undoStack.pop()!;
    
    // Save current to redo stack
    this.redoStack.push({
      snapshot: currentSnapshot,
      timestamp: Date.now(),
      lastPaintCoords: this.currentLastPaintCoords,
    });

    this.currentLastPaintCoords = previousEntry.lastPaintCoords;

    return previousEntry.snapshot;
  }

  redo(currentSnapshot: DocumentModel): DocumentModel | null {
    if (!this.canRedo()) {
      return null;
    }

    const nextEntry = this.redoStack.pop()!;

    // Save current to undo stack
    this.undoStack.push({
      snapshot: currentSnapshot,
      timestamp: Date.now(),
      lastPaintCoords: this.currentLastPaintCoords,
    });

    this.currentLastPaintCoords = nextEntry.lastPaintCoords;

    return nextEntry.snapshot;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentLastPaintCoords = null;
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }
}
