import { createSignal } from "solid-js";
import type { Transform2D } from "@/engine/types";

export interface TransformUndoEntry {
  transform: Transform2D;
}

export function createTransformUndoRedo() {
  const [transformUndoStack, setTransformUndoStack] = createSignal<TransformUndoEntry[]>([]);
  const [transformRedoStack, setTransformRedoStack] = createSignal<TransformUndoEntry[]>([]);

  const commitTransformState = (transform: Transform2D) => {
    setTransformUndoStack(prev => [...prev, { transform: { ...transform } }]);
    setTransformRedoStack([]);
  };

  const canTransformUndo = () => transformUndoStack().length > 0;
  const canTransformRedo = () => transformRedoStack().length > 0;

  const undoTransform = (): TransformUndoEntry | null => {
    const stack = transformUndoStack();
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setTransformUndoStack(prev => prev.slice(0, -1));
    return entry;
  };

  const redoTransform = (): TransformUndoEntry | null => {
    const stack = transformRedoStack();
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setTransformRedoStack(prev => prev.slice(0, -1));
    return entry;
  };

  // Used when user explicitly undoes within the transform mini-stack: we need to
  // push the CURRENT state to redo so they can get back to it.
  const undoTransformWithCurrent = (currentTransform: Transform2D): TransformUndoEntry | null => {
    const entry = undoTransform();
    if (entry) {
      setTransformRedoStack(prev => [...prev, { transform: { ...currentTransform } }]);
    }
    return entry;
  };

  const redoTransformWithCurrent = (currentTransform: Transform2D): TransformUndoEntry | null => {
    const entry = redoTransform();
    if (entry) {
      setTransformUndoStack(prev => [...prev, { transform: { ...currentTransform } }]);
    }
    return entry;
  };

  const clearTransformStacks = () => {
    setTransformUndoStack([]);
    setTransformRedoStack([]);
  };

  return {
    transformUndoStack,
    transformRedoStack,
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
