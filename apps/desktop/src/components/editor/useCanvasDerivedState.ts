import { createMemo, createEffect, untrack } from "solid-js";
import { useEditor } from "./EditorContext";
import { resolveCursor } from "@/viewport/cursorResolver";
import { getLayerAabb } from "@/viewport/transformGeometry";
import { buildCropSnapTargets } from "@/viewport/cropSnap";
import type { ToolType } from "@/viewport/input-handler";

interface UseCanvasDerivedStateParams {
  getCanvasContainerRef: () => HTMLDivElement | undefined;
  getCanvasRef: () => HTMLCanvasElement | undefined;
  isSpacePressed: () => boolean;
  isPanning: () => boolean;
  isAltPressed: () => boolean;
}

export function useCanvasDerivedState(params: UseCanvasDerivedStateParams) {
  const {
    workspace,
    activeTool,
    activeLayerId,
    layers,
    hoverHandle,
    setHoverHandle,
    cropRect,
    setCropRect,
    cropRotation,
    setCropRotation,
    hiddenCropPreview,
    hoverPos,
    setHoverPos,
    docWidth,
    docHeight,
    clearCropStacks,
  } = useEditor();

  const isLayerLocked = createMemo(() => {
    const id = activeLayerId();
    if (!id) return false;
    const layer = layers().find((l) => l.id === id);
    return layer?.locked ?? false;
  });

  const layerRotation = createMemo(() => {
    const id = activeLayerId();
    if (!id) return 0;
    const l = layers().find((l) => l.id === id);
    return l ? l.transform.rotation : 0;
  });

  const layerScaleX = createMemo(() => {
    const id = activeLayerId();
    if (!id) return 1;
    const l = layers().find((l) => l.id === id);
    return l ? l.transform.scaleX : 1;
  });

  const layerScaleY = createMemo(() => {
    const id = activeLayerId();
    if (!id) return 1;
    const l = layers().find((l) => l.id === id);
    return l ? l.transform.scaleY : 1;
  });

  const layerBoundingBox = createMemo(() => {
    const id = activeLayerId();
    if (!id) return null;
    const l = layers().find((l) => l.id === id);
    if (!l) return null;
    const aabb = getLayerAabb(l.transform, l.width, l.height);
    return { x: aabb.x, y: aabb.y, w: aabb.width, h: aabb.height };
  });

  const cropSnapTargets = createMemo(() => {
    const engine = workspace.getActiveEngine();
    if (!engine) return { x: [], y: [] };
    const docW = docWidth();
    const docH = docHeight();
    const layerTargets = layers()
      .filter((l) => l.visible)
      .map((l) => {
        const aabb = getLayerAabb(l.transform, l.width, l.height);
        return { x: aabb.x, y: aabb.y, w: aabb.width, h: aabb.height };
      });
    return buildCropSnapTargets(docW, docH, layerTargets);
  });

  const cursorClass = createMemo(() => resolveCursor({
    isSpacePressed: params.isSpacePressed(),
    isPanning: params.isPanning(),
    activeTool: activeTool() as ToolType,
    isAltPressed: params.isAltPressed(),
    hoverHandle: hoverHandle(),
    isLayerLocked: isLayerLocked(),
    eyedropperTarget: null,
    layerRotation: layerRotation(),
    layerScaleX: layerScaleX(),
    layerScaleY: layerScaleY(),
    hoverPos: hoverPos(),
    layerBoundingBox: layerBoundingBox(),
  }));

  const viewportCursorClass = createMemo(() => {
    if (params.isSpacePressed()) return params.isPanning() ? "grabbing" : "grab";
    return "default";
  });

  // Imperative cursor sync — bypass JSX style:cursor binding for guaranteed reactivity
  createEffect(() => {
    const c = viewportCursorClass();
    const container = params.getCanvasContainerRef();
    if (container) container.style.cursor = c;
  });
  createEffect(() => {
    const c = cursorClass();
    const canvas = params.getCanvasRef();
    if (canvas) canvas.style.cursor = c;
  });

  // Clear hover state when tool is not move
  createEffect(() => {
    if (activeTool() !== "move") {
      setHoverPos(null);
      const h = hoverHandle();
      if (h && h.startsWith("rotate")) {
        setHoverHandle(null);
      }
    }
  });

  // ─── Crop tool auto-init ───
  createEffect(() => {
    if (activeTool() !== "crop") {
      clearCropStacks();
      setCropRotation(0);
      setCropRect(null);
      return;
    }
    const rect = untrack(cropRect);
    const hidden = untrack(hiddenCropPreview);
    if (!rect && !hidden) {
      const engine = workspace.getActiveEngine();
      if (engine) {
        setCropRect({ x: 0, y: 0, w: engine.getWidth(), h: engine.getHeight() });
      }
    }
  });

  return {
    isLayerLocked,
    cropSnapTargets,
    cursorClass,
    viewportCursorClass,
  };
}
