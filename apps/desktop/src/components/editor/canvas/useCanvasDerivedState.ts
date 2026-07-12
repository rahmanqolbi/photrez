import { createMemo, createEffect, untrack, onCleanup } from "solid-js";
import { useEditor } from "../shell/EditorContext";
import { resolveCursor } from "@/viewport/cursorResolver";
import { useDragController, dragDropEffect, dragEffectToCssCursor } from "../DragController";
import { setDragNativeCursor } from "../nativeCursor";
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
    activeDocumentId,
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
    clearTransformStacks,
    cropInteractionMode,
    modernCropFrame,
    colorPickerOpen,
  } = useEditor();
  const dragController = useDragController();

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
    colorPickerOpen: colorPickerOpen(),
    layerRotation: layerRotation(),
    layerScaleX: layerScaleX(),
    layerScaleY: layerScaleY(),
    hoverPos: hoverPos(),
    layerBoundingBox: layerBoundingBox(),
  }));

  // Layer drag cursor (canvas pointer-drag path): copy for cross-doc, move for
  // same-doc / Alt. This is the authoritative source — the JSX `style.cursor`
  // on the viewport is overridden by the imperative sync below.
  const layerDragCursor = createMemo(() => {
    const s = dragController.state();
    if (s.dragKind !== "layer" || !s.payload) return undefined;
    const isCrossDoc =
      (s.dropTarget?.type === "tab" && s.dropTarget.docId !== s.payload.sourceDocId) ||
      (s.dropTarget?.type === "canvas" && activeDocumentId() !== s.payload.sourceDocId);
    return dragDropEffect(s.payload, isCrossDoc);
  });

  const viewportCursorClass = createMemo(() => {
    if (params.isSpacePressed()) return params.isPanning() ? "grabbing" : "grab";
    return "default";
  });

  // ── Cursor sync (imperative, bypasses JSX style:cursor) ─────────────
  // Layer drag active → CSS `cursor: copy`/`cursor: move` with !important
  // on <body> is the PRIMARY mechanism. WebView2 manages its own cursor
  // from CSS; Tauri's setCursorIcon only affects the window chrome, NOT
  // the webview content. The body !important covers elements without
  // their own cursor; elements with explicit cursor (e.g. tabs with
  // cursor:pointer) are handled by DocumentTabsBar's pointer-enter
  // override. Tauri setDragNativeCursor is called as a bonus (harmless
  // if it works; no harm if it doesn't).
  // No drag → restore tool / viewport cursor via CSS.
  createEffect(() => {
    const dragCursor = layerDragCursor();
    const container = params.getCanvasContainerRef();
    const canvas = params.getCanvasRef();

    if (dragCursor) {
      setDragNativeCursor(dragCursor);
      const css = dragEffectToCssCursor(dragCursor);
      if (container) container.style.cursor = css;
      if (canvas) canvas.style.cursor = css;
      document.body.style.setProperty("cursor", css, "important");
    } else {
      setDragNativeCursor(null);
      if (container) container.style.cursor = viewportCursorClass();
      if (canvas) canvas.style.cursor = cursorClass();
      document.body.style.removeProperty("cursor");
    }
  });

  // Clean up global cursor on unmount
  onCleanup(() => {
    setDragNativeCursor(null);
    document.body.style.removeProperty("cursor");
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

  // Clear hover state when modern crop frame is dismissed
  createEffect(() => {
    if (activeTool() === "crop" && cropInteractionMode() === "modern" && !modernCropFrame()) {
      setHoverHandle(null);
      setHoverPos(null);
    }
  });

  // Clear transform mini stacks when tool changes away from move/selection.
  // This prevents stale undo entries from accumulating across tool sessions.
  createEffect(() => {
    const tool = activeTool();
    if (tool !== "move" && tool !== "selection") {
      clearTransformStacks();
    }
  });

  // Crop tool auto-init
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
