import { createSignal } from "solid-js";

export interface ModernCropFrame {
  w: number;
  h: number;
}

export interface ModernCropImageTransform {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
}

export interface ModernCropSnapshot {
  frame: ModernCropFrame;
  transform: ModernCropImageTransform;
}

export function createModernCropState() {
  const [modernCropFrame, setModernCropFrame] =
    createSignal<ModernCropFrame | null>(null);
  const [modernCropImageTransform, setModernCropImageTransform] =
    createSignal<ModernCropImageTransform>({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1,
    });

  const [modernCropUndoStack, setModernCropUndoStack] = createSignal<ModernCropSnapshot[]>([]);
  const [modernCropRedoStack, setModernCropRedoStack] = createSignal<ModernCropSnapshot[]>([]);

  const commitModernCropState = () => {
    const frame = modernCropFrame();
    if (!frame) return;
    setModernCropUndoStack(prev => [...prev, { frame: { ...frame }, transform: { ...modernCropImageTransform() } }]);
    setModernCropRedoStack([]);
  };

  const canModernCropUndo = () => modernCropUndoStack().length > 0;
  const canModernCropRedo = () => modernCropRedoStack().length > 0;

  const undoModernCrop = () => {
    const stack = modernCropUndoStack();
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setModernCropUndoStack(prev => prev.slice(0, -1));
    const currentFrame = modernCropFrame();
    if (currentFrame) {
      setModernCropRedoStack(prev => [
        ...prev,
        { frame: { ...currentFrame }, transform: { ...modernCropImageTransform() } },
      ]);
    }
    setModernCropFrame({ ...entry.frame });
    setModernCropImageTransform({ ...entry.transform });
    return entry;
  };

  const redoModernCrop = () => {
    const stack = modernCropRedoStack();
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setModernCropRedoStack(prev => prev.slice(0, -1));
    const currentFrame = modernCropFrame();
    if (currentFrame) {
      setModernCropUndoStack(prev => [
        ...prev,
        { frame: { ...currentFrame }, transform: { ...modernCropImageTransform() } },
      ]);
    }
    setModernCropFrame({ ...entry.frame });
    setModernCropImageTransform({ ...entry.transform });
    return entry;
  };

  const resetModernCrop = () => {
    setModernCropFrame(null);
    setModernCropImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1,
    });
    setModernCropUndoStack([]);
    setModernCropRedoStack([]);
  };

  return {
    modernCropFrame,
    setModernCropFrame,
    modernCropImageTransform,
    setModernCropImageTransform,
    resetModernCrop,
    commitModernCropState,
    canModernCropUndo,
    canModernCropRedo,
    undoModernCrop,
    redoModernCrop,
  };
}
