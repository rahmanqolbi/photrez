import { createSignal } from "solid-js";
import { useEditor } from "./EditorContext";
import { screenToDocument, documentToScreen } from "@/viewport/coords";
import { snapCropRect, type CropSnapTargets } from "@/viewport/cropSnap";
import { hitTestLayers, type LayerInfo } from "@/viewport/layerHitTest";
import type { DocumentEngine } from "@/engine/document";
import {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  type ToolType,
  type ToolContext,
} from "@/viewport/input-handler";
import { getActivePaintToolSettings, getPaintToolBlockReason, type PaintToolSettings } from "./brushToolState";
import { PaintSmoother } from "./paintSmoothing";
import { getLayerAabb } from "@/viewport/transformGeometry";
import { computeSnapAdjustment, type SnapRect } from "@/viewport/smartGuides";
import type { HudMode } from "./TransformHud";
import { getDefaultModernCropFrame, getProjectedCanvasSize, clampFrameToProjectedBounds } from "@/viewport/modernCropGeometry";
import { resetCropPreviewToCanvas, restoreHiddenCropPreview, createCropRectFromDocumentPoints } from "./cropToolActions";

const DRAG_CREATE_THRESHOLD = 5;
const MIN_CROP_SIZE = 100;

interface UseCanvasPointerToolsParams {
  getCanvasContainerRef: () => HTMLDivElement | undefined;
  getCanvasRef: () => HTMLCanvasElement | undefined;
  isSpacePressed: () => boolean;
  isPanning: () => boolean;
  isAltPressed: () => boolean;
  stopMomentum: () => void;
  fitToScreenAndRender: () => void;
  commitBrushStroke: (engine: DocumentEngine, id: string, isEraser: boolean) => void;
  onPaintStroke?: (points: { x: number; y: number }[], isEraser: boolean, settings: PaintToolSettings) => void;
  cropSnapTargets?: () => CropSnapTargets | undefined;
  moveSnapEnabled?: () => boolean;
}

type HudData = {
  mode: HudMode;
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
  width: number;
  height: number;
  scalePercent: number;
  angle: number;
  snapActive: boolean;
};

export function useCanvasPointerTools(params: UseCanvasPointerToolsParams) {
  const {
    workspace,
    scheduler,
    activeTool,
    fgColor,
    bgColor,
    setFgColor,
    setBgColor,
    zoom,
    pan,
    cropRect,
    cropMode,
    cropAspect,
    cropSizeTarget,
    setCropRect,
    cropRotation,
    setCropRotation,
    hiddenCropPreview,
    setHiddenCropPreview,
    setSelectedLayerId,
    setHoverHandle,
    cropInteractionMode,
    modernCropFrame,
    setModernCropFrame,
    modernCropImageTransform,
    setModernCropImageTransform,
    viewportWidth,
    viewportHeight,
    docWidth,
    docHeight,
    moveAutoSelect,
    moveSnapEnabled,
    setHoverPos,
    brushSize,
    brushHardness,
    brushOpacity,
    eraserSize,
    eraserHardness,
    eraserOpacity,
    brushFlow,
    brushSmoothing,
    eraserFlow,
    eraserSmoothing,
  } = useEditor();

  let isPendingCropClick = false;
  let modernDragStart: { x: number; y: number } | null = null;
  let modernDragExceededThreshold = false;
  let modernDragEnd: { x: number; y: number } | null = null;

  function resetModernDragState() {
    modernDragStart = null;
    modernDragExceededThreshold = false;
    modernDragEnd = null;
  }

  const paintSmoother = new PaintSmoother();

  const [snapLines, setSnapLines] = createSignal<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [selectionBox, setSelectionBoxSignal] = createSignal<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [hudInfo, setHudInfoInner] = createSignal<HudData | null>(null);

  const [cropDragPreview, setCropDragPreview] = createSignal<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const interactiveState: ToolContext = {
    fgColor: "",
    bgColor: "",
    brushSize: 20,
    brushHardness: 0.8,
    brushOpacity: 1.0,
    paintSettings: { size: 20, hardness: 0.8, opacity: 1, flow: 1, smoothing: 0 },
    selectedLayerId: null,
    isAltPressed: false,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    strokePoints: [],
    dragTool: null,
  };

  const setHudInfo = (hud: HudData | null) => {
    if (!hud) return setHudInfoInner(null);
    const container = params.getCanvasContainerRef();
    const rect = container?.getBoundingClientRect();
    const engine = workspace.getActiveEngine();
    if (!rect || !engine) return setHudInfoInner(hud);
    const doc = screenToDocument(hud.clientX, hud.clientY, rect, engine.getViewport());
    setHudInfoInner({
      ...hud,
      clientX: doc.x,
      clientY: doc.y,
    });
  };

  function prepareToolContext() {
    const engine = workspace.getActiveEngine();
    interactiveState.fgColor = fgColor();
    interactiveState.bgColor = bgColor();
    interactiveState.selectedLayerId = engine ? engine.getActiveLayerId() : null;
    interactiveState.isAltPressed = params.isAltPressed();
    interactiveState.setFgColor = setFgColor;
    interactiveState.setBgColor = setBgColor;
    interactiveState.onSelectionCreated = (x, y, w, h) => {
      setSelectionBoxSignal({ x, y, w, h });
    };
    interactiveState.onCropCreated = (x, y, w, h) => {
      const nextRect = createCropRectFromDocumentPoints(
        interactiveState.dragStart,
        interactiveState.dragCurrent
      );
      if (nextRect) {
        setHiddenCropPreview(null);
        setCropRotation(0);
        setCropRect(nextRect);
      }
    };
    interactiveState.onHoverHandle = setHoverHandle;

    interactiveState.paintSettings = getActivePaintToolSettings(activeTool(), {
      brushSize: brushSize(),
      brushHardness: brushHardness(),
      brushOpacity: brushOpacity(),
      brushFlow: brushFlow(),
      brushSmoothing: brushSmoothing(),
      eraserSize: eraserSize(),
      eraserHardness: eraserHardness(),
      eraserOpacity: eraserOpacity(),
      eraserFlow: eraserFlow(),
      eraserSmoothing: eraserSmoothing(),
    });
    interactiveState.brushSize = interactiveState.paintSettings.size;
    interactiveState.brushHardness = interactiveState.paintSettings.hardness;
    interactiveState.brushOpacity = interactiveState.paintSettings.opacity;

    const activeEngineForTargets = workspace.getActiveEngine();
    const movingId = activeEngineForTargets ? activeEngineForTargets.getActiveLayerId() : null;
    const docW = activeEngineForTargets ? activeEngineForTargets.getWidth() : 0;
    const docH = activeEngineForTargets ? activeEngineForTargets.getHeight() : 0;

    const layerTargets: SnapRect[] = activeEngineForTargets
      ? activeEngineForTargets.getLayers()
        .filter((l) => l.visible && l.id !== movingId)
        .map((l) => {
          const aabb = getLayerAabb(l.transform, l.width, l.height);
          return { x: aabb.x, y: aabb.y, w: aabb.width, h: aabb.height };
        })
      : [];

    const snapTargets: SnapRect[] = [
      { x: 0, y: 0, w: docW, h: docH, snapThreshold: 12, snapPriority: 3 },
      { x: docW / 2, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
      { x: -Infinity, y: docH / 2, w: Infinity, h: 0, snapThreshold: 6, snapPriority: 2 },
      ...layerTargets,
    ];

    if (moveSnapEnabled()) {
      interactiveState.onComputeSnap = (rect: SnapRect) => {
        if (!activeEngineForTargets) {
          setSnapLines([]);
          return { dx: 0, dy: 0, lines: [] };
        }
        return computeSnapAdjustment(rect, snapTargets);
      };
    } else {
      interactiveState.onComputeSnap = undefined;
      setSnapLines([]);
    }
    interactiveState.onSnapLines = (lines) => setSnapLines(lines);
    interactiveState.onPaintStroke = params.onPaintStroke;
  }

  const getDocCoords = (e: PointerEvent) => {
    const container = params.getCanvasContainerRef();
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const activeEngine = workspace.getActiveEngine();
    if (!activeEngine) return { x: 0, y: 0 };
    return screenToDocument(
      e.clientX,
      e.clientY,
      rect,
      activeEngine.getViewport(),
    );
  };

  const handleDoubleClick = (e: MouseEvent) => {
    if (activeTool() === "crop") return;
    const container = params.getCanvasContainerRef();
    const canvas = params.getCanvasRef();
    if (e.target === container || e.target === canvas) {
      params.fitToScreenAndRender();
    }
  };

  const onCanvasPointerDown = (e: PointerEvent) => {
    if (e.button === 2) return;
    if (params.isSpacePressed() || params.isPanning() || e.button === 1) return;

    params.stopMomentum();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    if (activeTool() === "crop" && e.button === 0) {
      if (cropInteractionMode() === "modern") {
        if (modernCropFrame()) {
          isPendingCropClick = false;
        } else {
          // Defer frame creation — track drag start, create on threshold or pointerup
          const viewport = params.getCanvasContainerRef();
          if (!viewport) return;
          const rect = viewport.getBoundingClientRect();
          modernDragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          modernDragExceededThreshold = false;
          isPendingCropClick = false;
        }
      } else {
        isPendingCropClick = !cropRect();
      }
    } else {
      isPendingCropClick = false;
    }

    if (activeTool() === "move" && moveAutoSelect()) {
      const coords = getDocCoords(e);
      const allLayers = [...engine.getLayers()];
      const hit = hitTestLayers(coords, allLayers as LayerInfo[]);
      if (hit && hit.id !== engine.getActiveLayerId()) {
        engine.setActiveLayer(hit.id);
        setSelectedLayerId(hit.id);
        scheduler.requestRender();
      } else if (!hit) {
        setSelectedLayerId(null);
      }
    }

    // Guard: prevent no-op history commit for blocked brush/eraser strokes
    if (activeTool() === "brush" || activeTool() === "eraser") {
      const layerId = engine.getActiveLayerId();
      let activePaintLayer: ReturnType<DocumentEngine["getLayer"]> | null = null;
      if (layerId) {
        activePaintLayer = engine.getLayer(layerId);
      }
      if (getPaintToolBlockReason(activePaintLayer, activeTool() === "eraser")) return;
      history.commit(engine.snapshot());
    }

    // If modern crop mode with no frame and no dragStart, bail
    if (activeTool() === "crop" && cropInteractionMode() === "modern" && !modernCropFrame() && !modernDragStart) {
      return;
    }

    prepareToolContext();
    setSnapLines([]);
    const canvas = params.getCanvasRef();
    if (canvas) canvas.setPointerCapture(e.pointerId);

    const coords = getDocCoords(e);
    paintSmoother.setWindowSize(interactiveState.paintSettings.smoothing);
    paintSmoother.reset();
    const smoothed = paintSmoother.addPoint(coords.x, coords.y);
    handlePointerDown(
      activeTool() as ToolType,
      smoothed.x,
      smoothed.y,
      engine,
      history,
      () => scheduler.requestRender(),
      interactiveState,
    );
  };

  const onCanvasPointerMove = (e: PointerEvent) => {
    if (params.isPanning()) return;

    // Modern crop drag-to-create: show selection preview rect
    if (
      activeTool() === "crop" &&
      cropInteractionMode() === "modern" &&
      modernDragStart
    ) {
      const container = params.getCanvasContainerRef();
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ex = e.clientX - rect.left;
      const ey = e.clientY - rect.top;
      const dx = ex - modernDragStart.x;
      const dy = ey - modernDragStart.y;

      if (!modernDragExceededThreshold) {
        if (Math.abs(dx) < DRAG_CREATE_THRESHOLD && Math.abs(dy) < DRAG_CREATE_THRESHOLD) {
          setCropDragPreview(null);
          return;
        }
        modernDragExceededThreshold = true;
      }

      modernDragEnd = { x: ex, y: ey };

      // Build screen-space rect
      const sx = Math.min(modernDragStart.x, ex);
      const sy = Math.min(modernDragStart.y, ey);
      const sw = Math.abs(dx);
      const sh = Math.abs(dy);

      // Apply snap if enabled
      const z = zoom();
      const p = pan();
      const cst = params.cropSnapTargets?.();
      if (
        cst &&
        params.moveSnapEnabled?.() !== false &&
        !e.altKey
      ) {
        const snapTargets = cst;
        // Convert screen rect to doc-space for snapping
        const docRect = {
          x: (sx - p.x) / z,
          y: (sy - p.y) / z,
          w: sw / z,
          h: sh / z,
        };
        const threshold = 12 / z;
        const snapped = snapCropRect(docRect, "new", snapTargets, threshold);
        setSnapLines(snapped.lines);
        // Convert snapped doc rect back to screen-space
        setCropDragPreview({
          x: snapped.rect.x * z + p.x,
          y: snapped.rect.y * z + p.y,
          w: snapped.rect.w * z,
          h: snapped.rect.h * z,
        });
      } else {
        setSnapLines([]);
        setCropDragPreview({ x: sx, y: sy, w: sw, h: sh });
      }
      return; // Don't dispatch to handlePointerMove
    }

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    interactiveState.isAltPressed = params.isAltPressed();

    const coords = getDocCoords(e);
    const smoothed = paintSmoother.addPoint(coords.x, coords.y);
    handlePointerMove(
      activeTool() as ToolType,
      smoothed.x,
      smoothed.y,
      engine,
      () => scheduler.requestRender(),
      interactiveState,
    );
  };

  const onCanvasPointerUp = (e: PointerEvent) => {
    if (params.isPanning()) return;

    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    setSnapLines([]);
    const coords = getDocCoords(e);
    const smoothed = paintSmoother.addPoint(coords.x, coords.y);
    handlePointerUp(
      activeTool() as ToolType,
      smoothed.x,
      smoothed.y,
      engine,
      history,
      () => scheduler.requestRender(),
      interactiveState,
    );

    const canvas = params.getCanvasRef();
    if (canvas) canvas.releasePointerCapture(e.pointerId);

    const tool = (interactiveState.dragTool ?? activeTool()) as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (layerId && interactiveState.strokePoints.length > 0) {
        params.commitBrushStroke(engine, layerId, tool === "eraser");
      }
    }

    interactiveState.dragTool = null;

    // Modern crop: handle drag end or click fallback
    if (
      activeTool() === "crop" &&
      cropInteractionMode() === "modern" &&
      modernDragStart
    ) {
      if (modernDragExceededThreshold && modernDragEnd) {
        commitDragCreateFrame(
          modernDragStart.x, modernDragStart.y,
          modernDragEnd.x, modernDragEnd.y,
          e.shiftKey,
        );
      } else if (!modernCropFrame()) {
        // Click behavior — create default frame
        const mode = cropMode();
        const ratioAspect = cropAspect();
        const sizeTarget = cropSizeTarget();
        const aspect = mode === "ratio" && ratioAspect
          ? ratioAspect
          : mode === "size" && sizeTarget && sizeTarget.w > 0 && sizeTarget.h > 0
            ? { w: sizeTarget.w, h: sizeTarget.h }
            : null;
        setModernCropFrame(getDefaultModernCropFrame({
          viewportWidth: viewportWidth(),
          viewportHeight: viewportHeight(),
          docWidth: docWidth(),
          docHeight: docHeight(),
          zoom: zoom(),
          aspect,
        }));
        scheduler.requestRender();
      }
      setCropDragPreview(null);
      resetModernDragState();
    }

    if (tool === "crop" && isPendingCropClick) {
      const dx = Math.abs(coords.x - interactiveState.dragStart.x);
      const dy = Math.abs(coords.y - interactiveState.dragStart.y);
      if (dx <= 2 && dy <= 2) {
        const restored = restoreHiddenCropPreview({
          cropRect,
          cropRotation,
          hiddenCropPreview,
          setCropRect,
          setCropRotation,
          setHiddenCropPreview,
        });
        if (!restored) {
          resetCropPreviewToCanvas({ engine, setCropRect, setCropRotation, setHiddenCropPreview });
        }
        scheduler.requestRender();
      }
      isPendingCropClick = false;
    }

    setSelectionBoxSignal(null);
  };

  function commitDragCreateFrame(
    startX: number, startY: number, endX: number, endY: number, shiftKey: boolean,
  ) {
    const vw = viewportWidth();
    const vh = viewportHeight();
    const selW = Math.abs(endX - startX);
    const selH = Math.abs(endY - startY);
    const selCenterX = Math.min(startX, endX) + selW / 2;
    const selCenterY = Math.min(startY, endY) + selH / 2;

    const mode = cropMode();
    const ratioAspect = cropAspect();
    const sizeTarget = cropSizeTarget();

    let frameW: number;
    let frameH: number;

    if (mode === "free" && shiftKey) {
      const size = Math.max(selW, selH);
      frameW = size;
      frameH = size;
    } else if (mode === "free") {
      frameW = selW;
      frameH = selH;
    } else if (mode === "ratio" && ratioAspect && ratioAspect.w > 0 && ratioAspect.h > 0) {
      const ar = ratioAspect.w / ratioAspect.h;
      const area = Math.max(selW * selH, MIN_CROP_SIZE * MIN_CROP_SIZE);
      frameW = Math.sqrt(area * ar);
      frameH = frameW / ar;
    } else if (mode === "size" && sizeTarget && sizeTarget.w > 0 && sizeTarget.h > 0) {
      frameW = sizeTarget.w;
      frameH = sizeTarget.h;
    } else {
      frameW = selW;
      frameH = selH;
    }

    frameW = Math.max(MIN_CROP_SIZE, frameW);
    frameH = Math.max(MIN_CROP_SIZE, frameH);

    const projected = getProjectedCanvasSize({
      docWidth: docWidth(),
      docHeight: docHeight(),
      zoom: zoom(),
    });

    const frame = clampFrameToProjectedBounds(
      { w: frameW, h: frameH },
      projected,
      MIN_CROP_SIZE,
    );

    setModernCropFrame(frame);

    // Shift image so selection center maps to viewport center
    const vpCenterX = vw / 2;
    const vpCenterY = vh / 2;
    setModernCropImageTransform({
      ...modernCropImageTransform(),
      offsetX: vpCenterX - selCenterX,
      offsetY: vpCenterY - selCenterY,
    });
    scheduler.requestRender();
  }

  const onCanvasPointerCancel = (e: PointerEvent) => {
    paintSmoother.reset();
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    try {
      const canvas = params.getCanvasRef();
      if (canvas) canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Capture may already have been released — ignore
    }

    const tool = (interactiveState.dragTool ?? activeTool()) as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (layerId && interactiveState.strokePoints.length > 0) {
        params.commitBrushStroke(engine, layerId, tool === "eraser");
      }
    }

    interactiveState.strokePoints = [];
    interactiveState.isDragging = false;
    interactiveState.dragTool = null;
    setSnapLines([]);
    setCropDragPreview(null);
    resetModernDragState();
  };

  const onCanvasLostPointerCapture = (e: PointerEvent) => {
    paintSmoother.reset();
    // Capture already lost — no releasePointerCapture call needed
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    const tool = (interactiveState.dragTool ?? activeTool()) as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (layerId && interactiveState.strokePoints.length > 0) {
        params.commitBrushStroke(engine, layerId, tool === "eraser");
      }
    }

    interactiveState.strokePoints = [];
    interactiveState.isDragging = false;
    interactiveState.dragTool = null;
    setCropDragPreview(null);
    resetModernDragState();
  };

  return {
    cropDragPreview,
    setCropDragPreview,
    snapLines,
    setSnapLines,
    selectionBox,
    setSelectionBoxSignal,
    hudInfo,
    setHudInfo,
    getDocCoords,
    handleDoubleClick,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onCanvasPointerCancel,
    onCanvasLostPointerCapture,
    prepareToolContext,
  };
}
