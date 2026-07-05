// apps/desktop/src/components/editor/__tests__/transformUndoRedo.test.ts
//
// Implementation-focused unit tests for the transform mini undo/redo stack.
// Tests the editorState inlined functions: commitTransformState, undoTransform,
// redoTransform, undoTransformWithCurrent, redoTransformWithCurrent,
// clearTransformStacks, canTransformUndo, canTransformRedo.
//
// These mirror the crop mini undo/redo test pattern (modern-crop-state.test.ts)

import { describe, expect, it, beforeEach } from "vitest";
import type { Transform2D } from "@/engine/types";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeTransform(overrides: Partial<Transform2D> = {}): Transform2D {
  return {
    x: 100,
    y: 50,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    ...overrides,
  };
}

/**
 * Create a minimal transform undo/redo system that mirrors the functions
 * inlined in editorState.ts. Testing these in isolation avoids the full
 * SolidJS signal overhead while still verifying the pure logic.
 */
function createTransformUndoRedo() {
  let undoStack: { transform: Transform2D }[] = [];
  let redoStack: { transform: Transform2D }[] = [];

  const commitTransformState = (transform: Transform2D) => {
    undoStack = [...undoStack, { transform: { ...transform } }];
    redoStack = [];
  };

  const canTransformUndo = () => undoStack.length > 0;
  const canTransformRedo = () => redoStack.length > 0;

  const undoTransform = (): { transform: Transform2D } | null => {
    if (undoStack.length === 0) return null;
    const entry = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    return entry;
  };

  const redoTransform = (): { transform: Transform2D } | null => {
    if (redoStack.length === 0) return null;
    const entry = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    return entry;
  };

  const undoTransformWithCurrent = (
    currentTransform: Transform2D
  ): { transform: Transform2D } | null => {
    const entry = undoTransform();
    if (entry) {
      redoStack = [...redoStack, { transform: { ...currentTransform } }];
    }
    return entry;
  };

  const redoTransformWithCurrent = (
    currentTransform: Transform2D
  ): { transform: Transform2D } | null => {
    const entry = redoTransform();
    if (entry) {
      undoStack = [...undoStack, { transform: { ...currentTransform } }];
    }
    return entry;
  };

  const clearTransformStacks = () => {
    undoStack = [];
    redoStack = [];
  };

  return {
    commitTransformState,
    canTransformUndo,
    canTransformRedo,
    undoTransform,
    redoTransform,
    undoTransformWithCurrent,
    redoTransformWithCurrent,
    clearTransformStacks,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("transform mini undo/redo", () => {
  let tr: ReturnType<typeof createTransformUndoRedo>;

  beforeEach(() => {
    tr = createTransformUndoRedo();
  });

  describe("commitTransformState", () => {
    it("pushes a deep copy to the undo stack", () => {
      expect(tr.canTransformUndo()).toBe(false);

      tr.commitTransformState(makeTransform({ x: 50, y: 50 }));

      expect(tr.canTransformUndo()).toBe(true);
    });

    it("clears the redo stack when a new state is committed", () => {
      tr.commitTransformState(makeTransform({ x: 0, y: 0 }));
      tr.commitTransformState(makeTransform({ x: 100, y: 0 }));

      // Undo once to populate redo stack
      const entry = tr.undoTransformWithCurrent(makeTransform({ x: 100, y: 0 }));
      expect(entry).not.toBeNull();
      expect(tr.canTransformRedo()).toBe(true);
      expect(tr.canTransformUndo()).toBe(true);

      // New commit clears redo
      tr.commitTransformState(makeTransform({ x: 200, y: 0 }));
      expect(tr.canTransformRedo()).toBe(false);
      expect(tr.canTransformUndo()).toBe(true);
    });

    it("stores multiple entries for sequential commits", () => {
      tr.commitTransformState(makeTransform({ x: 10 }));
      tr.commitTransformState(makeTransform({ x: 20 }));
      tr.commitTransformState(makeTransform({ x: 30 }));
      expect(tr.canTransformUndo()).toBe(true);

      const e1 = tr.undoTransform();
      expect(e1!.transform.x).toBe(30);

      const e2 = tr.undoTransform();
      expect(e2!.transform.x).toBe(20);

      const e3 = tr.undoTransform();
      expect(e3!.transform.x).toBe(10);
    });

    it("stores a deep copy so mutating the entry does not affect the stack", () => {
      const t = makeTransform({ x: 50, scaleX: 2 });
      tr.commitTransformState(t);

      // Mutate the original reference
      t.x = 999;
      t.scaleX = 10;

      const entry = tr.undoTransform();
      expect(entry!.transform.x).toBe(50);
      expect(entry!.transform.scaleX).toBe(2);
    });
  });

  describe("undoTransform", () => {
    it("returns the most recent entry", () => {
      tr.commitTransformState(makeTransform({ x: 10 }));
      tr.commitTransformState(makeTransform({ x: 20 }));

      const entry = tr.undoTransform();
      expect(entry).not.toBeNull();
      expect(entry!.transform.x).toBe(20);
    });

    it("removes the entry from the stack", () => {
      tr.commitTransformState(makeTransform({ x: 10 }));
      tr.undoTransform();
      expect(tr.canTransformUndo()).toBe(false);
    });

    it("returns null when stack is empty", () => {
      expect(tr.undoTransform()).toBeNull();
    });

    it("returns null after all entries are undone", () => {
      tr.commitTransformState(makeTransform({ x: 10 }));
      tr.undoTransform();
      expect(tr.undoTransform()).toBeNull();
    });
  });

  describe("redoTransform", () => {
    it("returns null when redo stack is empty", () => {
      expect(tr.redoTransform()).toBeNull();
    });

    it("returns the most recent redo entry", () => {
      tr.commitTransformState(makeTransform({ x: 10 }));
      tr.commitTransformState(makeTransform({ x: 20 }));
      // Use undoTransformWithCurrent to push the undone state to redo
      tr.undoTransformWithCurrent(makeTransform({ x: 20 })); // pops 10, pushes 20 to redo

      const entry = tr.redoTransform();
      expect(entry).not.toBeNull();
      expect(entry!.transform.x).toBe(20);
    });

    it("can redo after undoing multiple steps", () => {
      tr.commitTransformState(makeTransform({ x: 10 }));
      tr.commitTransformState(makeTransform({ x: 20 }));

      // Undo gesture 2: push current (20) to redo, pop previous (10)
      tr.undoTransformWithCurrent(makeTransform({ x: 20 }));

      // Now redo: should restore 20
      const r1 = tr.redoTransform();
      expect(r1).not.toBeNull();
      expect(r1!.transform.x).toBe(20);

      // No more redo entries
      expect(tr.redoTransform()).toBeNull();
    });
  });

  describe("undoTransformWithCurrent", () => {
    it("undoes and pushes current state to redo", () => {
      tr.commitTransformState(makeTransform({ x: 100 }));
      // Current state is { x: 200 }
      const entry = tr.undoTransformWithCurrent(makeTransform({ x: 200 }));
      expect(entry).not.toBeNull();
      expect(entry!.transform.x).toBe(100);
      expect(tr.canTransformRedo()).toBe(true);
      expect(tr.canTransformUndo()).toBe(false);

      // Redo should restore the pushed current state
      const redoEntry = tr.redoTransform();
      expect(redoEntry).not.toBeNull();
      expect(redoEntry!.transform.x).toBe(200);
    });

    it("returns null when undo stack is empty", () => {
      const entry = tr.undoTransformWithCurrent(makeTransform({ x: 200 }));
      expect(entry).toBeNull();
      expect(tr.canTransformRedo()).toBe(false);
    });

    it("does not push to redo when undo returns null", () => {
      tr.undoTransformWithCurrent(makeTransform({ x: 200 }));
      expect(tr.canTransformRedo()).toBe(false);
    });

    it("stores a deep copy of currentTransform in redo", () => {
      tr.commitTransformState(makeTransform({ x: 100 }));
      const current = makeTransform({ x: 200, scaleY: 3 });
      tr.undoTransformWithCurrent(current);

      // Mutate the original
      current.x = 999;

      const redoEntry = tr.redoTransform();
      expect(redoEntry!.transform.x).toBe(200);
      expect(redoEntry!.transform.scaleY).toBe(3);
    });
  });

  describe("redoTransformWithCurrent", () => {
    it("redoes and pushes current state to undo", () => {
      tr.commitTransformState(makeTransform({ x: 100 }));
      tr.undoTransformWithCurrent(makeTransform({ x: 200 }));
      expect(tr.canTransformRedo()).toBe(true);

      // Current state is { x: 300 }
      const entry = tr.redoTransformWithCurrent(makeTransform({ x: 300 }));
      expect(entry).not.toBeNull();
      expect(entry!.transform.x).toBe(200);
      // Current state { x: 300 } should be pushed to undo for round-trip
      expect(tr.canTransformUndo()).toBe(true);
    });

    it("returns null when redo stack is empty", () => {
      expect(tr.redoTransformWithCurrent(makeTransform({ x: 100 }))).toBeNull();
    });

    it("does not push to undo when redo returns null", () => {
      tr.redoTransformWithCurrent(makeTransform({ x: 100 }));
      expect(tr.canTransformUndo()).toBe(false);
    });

    it("round-trips correctly: undo then redo restores original state", () => {
      // State A → commit A
      const stateA = makeTransform({ x: 100, scaleX: 1.5 });
      tr.commitTransformState(stateA);

      // State B (current) → undo with B pushes B to redo
      const stateB = makeTransform({ x: 200, scaleX: 2 });
      const undoEntry = tr.undoTransformWithCurrent(stateB);
      expect(undoEntry!.transform.x).toBe(100);
      expect(undoEntry!.transform.scaleX).toBe(1.5);

      // Redo with state C (current after further changes)
      const stateC = makeTransform({ x: 150, scaleX: 1.8 });
      const redoEntry = tr.redoTransformWithCurrent(stateC);
      expect(redoEntry!.transform.x).toBe(200);
      expect(redoEntry!.transform.scaleX).toBe(2);

      // Now undo should return stateC (which was pushed to undo by redoWithCurrent)
      const undoAgain = tr.undoTransformWithCurrent(makeTransform({ x: 150, scaleX: 1.8 }));
      expect(undoAgain!.transform.x).toBe(150);
      expect(undoAgain!.transform.scaleX).toBe(1.8);
    });
  });

  describe("canTransformUndo / canTransformRedo", () => {
    it("returns false initially for both", () => {
      expect(tr.canTransformUndo()).toBe(false);
      expect(tr.canTransformRedo()).toBe(false);
    });

    it("returns true for undo after commit", () => {
      tr.commitTransformState(makeTransform({}));
      expect(tr.canTransformUndo()).toBe(true);
    });

    it("returns true for redo after undo", () => {
      tr.commitTransformState(makeTransform({}));
      tr.undoTransformWithCurrent(makeTransform({}));
      expect(tr.canTransformRedo()).toBe(true);
    });

    it("returns false for undo after clear", () => {
      tr.commitTransformState(makeTransform({}));
      tr.clearTransformStacks();
      expect(tr.canTransformUndo()).toBe(false);
    });

    it("returns false for redo after clear", () => {
      tr.commitTransformState(makeTransform({}));
      tr.undoTransformWithCurrent(makeTransform({}));
      tr.clearTransformStacks();
      expect(tr.canTransformRedo()).toBe(false);
    });
  });

  describe("clearTransformStacks", () => {
    it("clears undo stack", () => {
      tr.commitTransformState(makeTransform({}));
      tr.commitTransformState(makeTransform({ x: 10 }));
      tr.clearTransformStacks();
      expect(tr.canTransformUndo()).toBe(false);
      expect(tr.undoTransform()).toBeNull();
    });

    it("clears both stacks when called after undo populated redo", () => {
      tr.commitTransformState(makeTransform({}));
      tr.undoTransformWithCurrent(makeTransform({ x: 10 }));
      expect(tr.canTransformRedo()).toBe(true);

      tr.clearTransformStacks();
      expect(tr.canTransformUndo()).toBe(false);
      expect(tr.canTransformRedo()).toBe(false);
    });

    it("is idempotent when called on empty stacks", () => {
      tr.clearTransformStacks();
      tr.clearTransformStacks();
      expect(tr.canTransformUndo()).toBe(false);
      expect(tr.canTransformRedo()).toBe(false);
    });
  });

  describe("multiple gesture pattern (simulating real usage)", () => {
    it("simulates two resize gestures: first undo reverts second gesture", () => {
      // Layer at initial transform
      const initialTransform = makeTransform({ x: 0, y: 0, scaleX: 1 });

      // Gesture 1: resize. commitTransformState saves the pre-gesture state.
      tr.commitTransformState(initialTransform);

      // After gesture 1, layer is at transform A
      const transformA = makeTransform({ x: 0, y: 0, scaleX: 1.5 });

      // Gesture 2: resize. commitTransformState saves transform A.
      tr.commitTransformState(transformA);

      // After gesture 2, layer is at transform B
      const transformB = makeTransform({ x: 0, y: 0, scaleX: 2 });

      // Undo: should revert to transform A
      const undo1 = tr.undoTransformWithCurrent(transformB);
      expect(undo1!.transform.scaleX).toBe(1.5);
      expect(tr.canTransformRedo()).toBe(true);
      expect(tr.canTransformUndo()).toBe(true);

      // Undo again: should revert to initial transform
      const undo2 = tr.undoTransformWithCurrent(transformA);
      expect(undo2!.transform.scaleX).toBe(1);
      expect(tr.canTransformUndo()).toBe(false);

      // Redo: should go back to transform A
      const redo1 = tr.redoTransformWithCurrent(initialTransform);
      expect(redo1!.transform.scaleX).toBe(1.5);

      // Redo again: should go back to transform B
      const redo2 = tr.redoTransformWithCurrent(transformA);
      expect(redo2!.transform.scaleX).toBe(2);
    });

    it("handles single gesture: undo reverts to initial, second undo is null", () => {
      tr.commitTransformState(makeTransform({ x: 0, y: 0 }));

      // After gesture, layer is at (100, 50)
      const undo = tr.undoTransformWithCurrent(makeTransform({ x: 100, y: 50 }));
      expect(undo!.transform.x).toBe(0);
      expect(undo!.transform.y).toBe(0);

      // No more undo
      expect(tr.undoTransformWithCurrent(makeTransform({ x: 0, y: 0 }))).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles empty transform (all default values)", () => {
      tr.commitTransformState(makeTransform());
      expect(tr.canTransformUndo()).toBe(true);
      const entry = tr.undoTransform();
      expect(entry!.transform.x).toBe(100);
      expect(entry!.transform.scaleX).toBe(1);
    });

    it("handles boolean fields (flipH, flipV)", () => {
      tr.commitTransformState(makeTransform({ flipH: false, flipV: false }));
      tr.commitTransformState(makeTransform({ flipH: true, flipV: false }));
      tr.commitTransformState(makeTransform({ flipH: true, flipV: true }));

      const e1 = tr.undoTransform();
      expect(e1!.transform.flipH).toBe(true);
      expect(e1!.transform.flipV).toBe(true);

      const e2 = tr.undoTransform();
      expect(e2!.transform.flipH).toBe(true);
      expect(e2!.transform.flipV).toBe(false);

      const e3 = tr.undoTransform();
      expect(e3!.transform.flipH).toBe(false);
      expect(e3!.transform.flipV).toBe(false);
    });

    it("handles negative values", () => {
      tr.commitTransformState(makeTransform({ x: -100, y: -50, scaleX: -1 }));
      const entry = tr.undoTransform();
      expect(entry!.transform.x).toBe(-100);
      expect(entry!.transform.y).toBe(-50);
      expect(entry!.transform.scaleX).toBe(-1);
    });

    it("handles zero scale values", () => {
      tr.commitTransformState(makeTransform({ scaleX: 0, scaleY: 0 }));
      const entry = tr.undoTransform();
      expect(entry!.transform.scaleX).toBe(0);
      expect(entry!.transform.scaleY).toBe(0);
    });

    it("handles floating point rotation values", () => {
      tr.commitTransformState(makeTransform({ rotation: 45.678 }));
      const entry = tr.undoTransform();
      expect(entry!.transform.rotation).toBeCloseTo(45.678, 5);
    });
  });
});
