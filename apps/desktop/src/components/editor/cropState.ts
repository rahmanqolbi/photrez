import { createSignal } from "solid-js";

export type CropPreview = {
  rect: { x: number; y: number; w: number; h: number };
  rotation: number;
};

export type CropFillSource = "background" | "custom";

export function createCropState() {
  const [cropRect, setCropRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropMode, setCropMode] = createSignal<"free" | "ratio" | "size">("free");
  const [cropGuideMode, setCropGuideMode] = createSignal<"none" | "thirds" | "grid" | "diagonal" | "golden">("thirds");
  const [cropDeletePixels, setCropDeletePixels] = createSignal<boolean>(true);
  const [cropFillEnabled, setCropFillEnabled] = createSignal<boolean>(true);
  const [cropFillSource, setCropFillSource] = createSignal<CropFillSource>("background");
  const [cropFillCustomColor, setCropFillCustomColor] = createSignal<string>("#ffffff");
  const [cropAspect, setCropAspect] = createSignal<{ w: number; h: number } | null>(null);
  const [cropSizeTarget, setCropSizeTarget] = createSignal<{ w: number; h: number } | null>(null);
  const [cropSizeUnit, setCropSizeUnit] = createSignal<"px" | "cm" | "mm" | "in">("px");
  const [cropRotation, setCropRotation] = createSignal<number>(0);
  const [hiddenCropPreview, setHiddenCropPreview] = createSignal<CropPreview | null>(null);

  // Crop mini undo/redo stack
  const [cropUndoStack, setCropUndoStack] = createSignal<{ rect: { x: number; y: number; w: number; h: number }; rotation: number }[]>([]);
  const [cropRedoStack, setCropRedoStack] = createSignal<{ rect: { x: number; y: number; w: number; h: number }; rotation: number }[]>([]);

  const commitCropState = (rect: { x: number; y: number; w: number; h: number }, rotation: number) => {
    setCropUndoStack(prev => [...prev, { rect, rotation }]);
    setCropRedoStack([]);
  };

  const canCropUndo = () => cropUndoStack().length > 0;
  const canCropRedo = () => cropRedoStack().length > 0;

  const undoLastCrop = () => {
    const stack = cropUndoStack();
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setCropUndoStack(prev => prev.slice(0, -1));
    const currentRect = cropRect();
    if (currentRect) {
      setCropRedoStack(prev => [
        ...prev,
        { rect: currentRect, rotation: cropRotation() }
      ]);
    }
    return entry;
  };

  const redoCrop = () => {
    const stack = cropRedoStack();
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setCropRedoStack(prev => prev.slice(0, -1));
    const currentRect = cropRect();
    if (currentRect) {
      setCropUndoStack(prev => [
        ...prev,
        { rect: currentRect, rotation: cropRotation() }
      ]);
    }
    return entry;
  };

  return {
    cropRect, setCropRect,
    cropMode, setCropMode,
    cropGuideMode, setCropGuideMode,
    cropDeletePixels, setCropDeletePixels,
    cropFillEnabled, setCropFillEnabled,
    cropFillSource, setCropFillSource,
    cropFillCustomColor, setCropFillCustomColor,
    cropAspect, setCropAspect,
    cropSizeTarget, setCropSizeTarget,
    cropSizeUnit, setCropSizeUnit,
    cropRotation, setCropRotation,
    hiddenCropPreview, setHiddenCropPreview,
    commitCropState,
    canCropUndo,
    canCropRedo,
    undoLastCrop,
    redoCrop,
    clearCropStacks: () => {
      setCropUndoStack([]);
      setCropRedoStack([]);
    },
  };
}
