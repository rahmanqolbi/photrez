import { createMemo, createEffect, untrack, onCleanup } from "solid-js";
import { useEditor } from "../shell/EditorContext";
import { resolveCursor } from "@/viewport/cursorResolver";
import { useDragController, dragEffectToCssCursor } from "../DragController";
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

  // Layer drag cursor (canvas pointer-drag path):
  //   - same-doc reorder   → plain arrow ("default")
  //   - cross-doc, no Alt  → copy (arrow + document + plus)
  //   - cross-doc, Alt     → move (arrow + document)
  // The HTML5 Layers-panel drag keeps dragDropEffect()'s "move" for same-doc
  // because HTML5 DnD cannot render a plain arrow (dropEffect is copy/move/link/none).
  // This memo is the authoritative source — the JSX `style.cursor` on the
  // viewport is overridden by the imperative sync below.
  const layerDragCursor = createMemo<"copy" | "move" | "default" | undefined>(() => {
    const s = dragController.state();
    if (s.dragKind !== "layer" || !s.payload) return undefined;
    const isCrossDoc =
      (s.dropTarget?.type === "tab" && s.dropTarget.docId !== s.payload.sourceDocId) ||
      (s.dropTarget?.type === "canvas" && activeDocumentId() !== s.payload.sourceDocId);
    if (!isCrossDoc) return "default";
    return s.payload.isAltPressed ? "move" : "copy";
  });

  const viewportCursorClass = createMemo(() => {
    if (params.isSpacePressed()) return params.isPanning() ? "grabbing" : "grab";
    const tool = activeTool();
    if (tool === "move") return "grab";
    if (tool === "crop" && cropInteractionMode() === "modern" && !modernCropFrame()) return "crosshair";
    return "default";
  });

  // ── Cursor sync (imperative, replaces JSX style:cursor) ─────────────
  // JSX style:cursor is intentionally removed from CanvasViewport to
  // prevent Solid's reactive binding from overriding the drag cursor.
  // ALL container cursor logic (drag, space-pan, grab, crosshair) lives
  // in the effect below and the viewportCursorClass memo.
  //
  // Layer drag active:
  //   1. CSS `cursor: copy`/`cursor: move` with `!important` on BOTH the
  //      container and <body> to override hover-handle resize cursors.
  //   2. Custom Rust command `setDragNativeCursor` → Win32 SetCursor →
  //      OS native drag-drop cursor.
  //      Re-armed on every pointermove during drag because WebView2
  //      overrides SetCursor on each WM_SETCURSOR (mouse move).
  // No drag → restore tool / viewport cursor via viewportCursorClass().
  createEffect(() => {
    const dragCursor = layerDragCursor();
    const container = params.getCanvasContainerRef();
    const canvas = params.getCanvasRef();

    // console.log is intentional for debugging cursor state during drag.
    // Remove once confirmed working.
    console.log("[cursor] dragCursor:", dragCursor, "activeTool:", activeTool(), "hoverHandle:", hoverHandle());

    if (dragCursor) {
      const css = dragEffectToCssCursor(dragCursor);
      console.log("[cursor] SET copy/move CSS:", css);
      if (container) container.style.setProperty("cursor", css, "important");
      if (canvas) canvas.style.cursor = css;
      document.body.style.setProperty("cursor", css, "important");

      // Set native cursor NOW (drag start) and on every pointermove
      // during the drag to override WebView2's WM_SETCURSOR.
      setDragNativeCursor(dragCursor);
      const moveHandler = () => setDragNativeCursor(dragCursor);
      document.addEventListener("pointermove", moveHandler, { passive: true });
      onCleanup(() => document.removeEventListener("pointermove", moveHandler));
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
