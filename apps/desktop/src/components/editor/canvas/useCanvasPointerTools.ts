import { createSignal, createEffect } from "solid-js";
import { useEditor } from "../shell/EditorContext";
import { screenToDocument, documentToScreen } from "@/viewport/coords";
import { snapCropRect, type CropSnapTargets } from "@/viewport/cropSnap";
import { hitTestLayers, type LayerInfo } from "@/viewport/layerHitTest";
import type { DocumentEngine } from "@/engine/document";
import type { CommandHistory } from "@/engine/history";
import {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  type ToolType,
  type ToolContext,
} from "@/viewport/input-handler";
import { getActivePaintToolSettings, getPaintToolBlockReason, type PaintToolSettings } from "../brushToolState";
import { PaintSmoother, smoothingToWindowSize } from "../paintSmoothing";
import { tryReleasePointerCapture, trySetPointerCapture } from "../tools/pointerCapture";
import { getLayerAabb } from "@/viewport/transformGeometry";
import { computeSnapAdjustment, type SnapRect } from "@/viewport/smartGuides";
import type { HudMode } from "../TransformHud";
import { getDefaultModernCropFrame, getProjectedCanvasSize, clampFrameToProjectedBounds } from "@/viewport/modernCropGeometry";
import { resetCropPreviewToCanvas, restoreHiddenCropPreview, createCropRectFromDocumentPoints } from "../cropToolActions";
import { rgbToHex, interpolateLinePoints } from "./pointerUtils";
import { startSelectionRotation as startSelectionRotationFn } from "./selectionRotation";

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
  commitBrushStroke: (engine: DocumentEngine, history: CommandHistory, id: string, isEraser: boolean) => void;
  onPaintStroke?: (
    points: { x: number; y: number }[],
    isEraser: boolean,
    settings: PaintToolSettings,
    isFinal?: boolean,
  ) => void;
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
    setViewportState,
    cropRect,
    cropMode,
    cropAspect,
    cropSizeTarget,
    setCropRect,
    cropRotation,
    setCropRotation,
    hiddenCropPreview,
    setHiddenCropPreview,
    selectedLayerId,
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
  let modernDragSnappedPreview: { x: number; y: number; w: number; h: number } | null = null;

  function resetModernDragState() {
    modernDragStart = null;
    modernDragExceededThreshold = false;
    modernDragEnd = null;
    modernDragSnappedPreview = null;
  }

  const getLastPaintCoords = (): { x: number; y: number } | null => {
    const history = workspace.getActiveHistory();
    return history ? history.getLastPaintCoords() : null;
  };

  const setLastPaintCoords = (coords: { x: number; y: number } | null) => {
    const history = workspace.getActiveHistory();
    if (history) {
      history.setLastPaintCoords(coords);
    }
  };

  let axisLock: "horizontal" | "vertical" | null = null;

  createEffect(() => {
    const tool = activeTool();
    if (tool !== "brush" && tool !== "eraser") {
      setLastPaintCoords(null);
    }
  });

  const paintSmoother = new PaintSmoother();

  const [snapLines, setSnapLines] = createSignal<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [selectionBox, setSelectionBoxSignal] = createSignal<{
    x: number;
    y: number;
    w: number;
    h: number;
    angle: number;
    inverted?: boolean;
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
    isShiftPressed: false,
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
    // For the move tool only: if the UI signal says no layer is selected
    // (pasteboard/canvas deselect), don't operate on a stale engine layer.
    // Other tools (brush, eraser, selection, crop) should use the engine's
    // active layer as-is since they don't depend on the UI selection state.
    const engineLayerId = engine ? engine.getActiveLayerId() : null;
    if (activeTool() === "move" && selectedLayerId() === null) {
      interactiveState.selectedLayerId = null;
    } else {
      interactiveState.selectedLayerId = engineLayerId;
    }
    interactiveState.isAltPressed = params.isAltPressed();
    interactiveState.setFgColor = setFgColor;
    interactiveState.setBgColor = setBgColor;
    interactiveState.onSelectionCreated = (x, y, w, h) => {
      setSelectionBoxSignal({ x, y, w, h, angle: selectionBox()?.angle ?? 0 });
    };
    interactiveState.selectionBounds = selectionBox() ? {
      x: selectionBox()!.x,
      y: selectionBox()!.y,
      width: selectionBox()!.w,
      height: selectionBox()!.h,
    } : null;
    interactiveState.onSelectionMoved = (x, y) => {
      const box = selectionBox();
      const eng = workspace.getActiveEngine();
      if (box && eng) {
        setSelectionBoxSignal({ ...box, x, y });
        eng.createSelection(x, y, box.w, box.h);
      }
    };
    interactiveState.onSelectionRotated = (angle: number) => {
      const box = selectionBox();
      if (box) {
        setSelectionBoxSignal({ ...box, angle });
      }
    };
    interactiveState.onRotateStart = (centerX: number, centerY: number) => {
      interactiveState.dragMode = "rotate-selection";
      interactiveState.rotateCenter = { x: centerX, y: centerY };
      interactiveState.rotateStartAngle = 0;
      interactiveState.selectionAngle = selectionBox()?.angle ?? 0;
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
        return computeSnapAdjustment(rect, snapTargets, 5, zoom());
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

    if ((activeTool() === "brush" || activeTool() === "eraser") && params.isAltPressed()) {
      const coords = getDocCoords(e);
      const color = engine.samplePixel(coords.x, coords.y);
      setFgColor(rgbToHex(color[0], color[1], color[2]));
      trySetPointerCapture(params.getCanvasRef(), e.pointerId);
      return;
    }

    if (activeTool() === "crop" && e.button === 0) {
      if (cropInteractionMode() === "modern") {
        // Track drag start for drag-to-create even when frame exists.
        // The ModernCropOverlay SVG on top catches clicks on the frame
        // (move rect, handles, rotate ring) with stopPropagation().
        // Clicks on the mask area (outside the frame) fall through to
        // the canvas →those start a new drag-create.
        const viewport = params.getCanvasContainerRef();
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        modernDragStart = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        modernDragExceededThreshold = false;
        isPendingCropClick = false;
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

    // Guard: prevent blocked brush/eraser strokes from starting an overlay command.
    if (activeTool() === "brush" || activeTool() === "eraser") {
      const layerId = engine.getActiveLayerId();
      let activePaintLayer: ReturnType<DocumentEngine["getLayer"]> | null = null;
      if (layerId) {
        activePaintLayer = engine.getLayer(layerId);
      }
      if (getPaintToolBlockReason(activePaintLayer, activeTool() === "eraser")) return;
    }

    // If modern crop mode →skip engine handlePointerDown (it would call
    // onCropCreated and leak state into the Classic crop rect). Modern
    // crop has its own drag-to-create handling via modernDragStart.
    if (activeTool() === "crop" && cropInteractionMode() === "modern") {
      trySetPointerCapture(params.getCanvasRef(), e.pointerId);
      setSnapLines([]);
      return;
    }

    prepareToolContext();
    interactiveState.isShiftPressed = e.shiftKey;
    setSnapLines([]);
    trySetPointerCapture(params.getCanvasRef(), e.pointerId);

    const coords = getDocCoords(e);
    
    if (activeTool() === "brush" || activeTool() === "eraser") {
      const lp = getLastPaintCoords();
      if (e.shiftKey && lp) {
        interactiveState.strokePoints = interpolateLinePoints(lp, coords);
        interactiveState.dragStart = { ...coords };
      } else {
        interactiveState.strokePoints = [];
        setLastPaintCoords({ ...coords });
      }
    }

    paintSmoother.setWindowSize(smoothingToWindowSize(interactiveState.paintSettings.smoothing));
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
        // Clear existing frame once drag exceeds threshold →visual
        // feedback that a new crop is being created instead of moved.
        setModernCropFrame(null);
      }

      modernDragEnd = { x: ex, y: ey };

      // Build screen-space rect
      const sx = Math.min(modernDragStart.x, ex);
      const sy = Math.min(modernDragStart.y, ey);
      const sw = Math.abs(dx);
      const sh = Math.abs(dy);

      // Apply snap if enabled
      const z = zoom();
      const canvasEl = params.getCanvasRef();
      const canvasRect = canvasEl?.getBoundingClientRect();
      // Document origin in viewport space. In Modern mode the canvas uses
      // CSS transforms (not left/top from pan), so compute visual offset
      // directly from element bounds.
      const docOriginX = canvasRect ? canvasRect.left - rect.left : 0;
      const docOriginY = canvasRect ? canvasRect.top - rect.top : 0;
      const cst = params.cropSnapTargets?.();
      if (
        cst &&
        params.moveSnapEnabled?.() !== false &&
        !e.altKey
      ) {
        const snapTargets = cst;
        // Convert screen rect to doc-space for snapping
        const docRect = {
          x: (sx - docOriginX) / z,
          y: (sy - docOriginY) / z,
          w: sw / z,
          h: sh / z,
        };
        const threshold = 12 / z;
        const snapped = snapCropRect(docRect, "new", snapTargets, threshold);
        setSnapLines(snapped.lines);
        // Convert snapped doc rect back to screen-space
        const screenSnapped = {
          x: snapped.rect.x * z + docOriginX,
          y: snapped.rect.y * z + docOriginY,
          w: snapped.rect.w * z,
          h: snapped.rect.h * z,
        };
        setCropDragPreview(screenSnapped);
        modernDragSnappedPreview = screenSnapped;
      } else {
        setSnapLines([]);
        setCropDragPreview({ x: sx, y: sy, w: sw, h: sh });
        modernDragSnappedPreview = null;
      }
      return; // Don't dispatch to handlePointerMove
    }

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    if ((activeTool() === "brush" || activeTool() === "eraser") && params.isAltPressed()) {
      if (e.buttons === 1) {
        const coords = getDocCoords(e);
        const color = engine.samplePixel(coords.x, coords.y);
        setFgColor(rgbToHex(color[0], color[1], color[2]));
        scheduler.requestRender();
      }
      return;
    }

    interactiveState.isAltPressed = params.isAltPressed();
    interactiveState.isShiftPressed = e.shiftKey;

    let coords = getDocCoords(e);

    if ((activeTool() === "brush" || activeTool() === "eraser") && interactiveState.isDragging) {
      if (e.shiftKey) {
        const start = interactiveState.dragStart;
        const dx = coords.x - start.x;
        const dy = coords.y - start.y;
        
        if (!axisLock) {
          if (Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
            axisLock = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
          }
        }
        
        if (axisLock === "horizontal") {
          coords = { x: coords.x, y: start.y };
        } else if (axisLock === "vertical") {
          coords = { x: start.x, y: coords.y };
        }
      } else {
        axisLock = null;
      }
    }

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

    if ((activeTool() === "brush" || activeTool() === "eraser") && params.isAltPressed()) {
      tryReleasePointerCapture(params.getCanvasRef(), e.pointerId);
      return;
    }

    setSnapLines([]);
    let coords = getDocCoords(e);
    if ((activeTool() === "brush" || activeTool() === "eraser") && e.shiftKey) {
      const start = interactiveState.dragStart;
      const dx = coords.x - start.x;
      const dy = coords.y - start.y;
      if (!axisLock && (Math.abs(dx) >= 5 || Math.abs(dy) >= 5)) {
        axisLock = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }
      if (axisLock === "horizontal") coords = { x: coords.x, y: start.y };
      if (axisLock === "vertical") coords = { x: start.x, y: coords.y };
    }
    const smoothed = paintSmoother.addPoint(coords.x, coords.y);
    const tool = (interactiveState.dragTool ?? activeTool()) as ToolType;
    const hasPoints = (tool === "brush" || tool === "eraser") && interactiveState.strokePoints.length > 0;

    handlePointerUp(
      activeTool() as ToolType,
      smoothed.x,
      smoothed.y,
      engine,
      history,
      () => scheduler.requestRender(),
      interactiveState,
    );

    tryReleasePointerCapture(params.getCanvasRef(), e.pointerId);

    if (hasPoints) {
      const layerId = engine.getActiveLayerId();
      if (layerId) {
        params.commitBrushStroke(engine, history, layerId, tool === "eraser");
        setLastPaintCoords({ ...smoothed });
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
        // Click behavior →create default frame and reset canvas position to center
        const mode = cropMode();
        const ratioAspect = cropAspect();
        const sizeTarget = cropSizeTarget();
        const aspect = mode === "ratio" && ratioAspect
          ? ratioAspect
          : mode === "size" && sizeTarget && sizeTarget.w > 0 && sizeTarget.h > 0
            ? { w: sizeTarget.w, h: sizeTarget.h }
            : null;

        const scale = 1;
        const centerPanX = (viewportWidth() - docWidth() * zoom() * scale) / 2;
        const centerPanY = (viewportHeight() - docHeight() * zoom() * scale) / 2;
        setViewportState({ x: centerPanX, y: centerPanY, zoom: zoom() });
        setModernCropImageTransform({ offsetX: 0, offsetY: 0, rotation: 0, scale: 1 });

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
        // Reset canvas position to center
        const centerPanX = (viewportWidth() - docWidth() * zoom()) / 2;
        const centerPanY = (viewportHeight() - docHeight() * zoom()) / 2;
        setViewportState({ x: centerPanX, y: centerPanY, zoom: zoom() });

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

    if (activeTool() === "selection") {
      const sel = engine.getSelection();
      if (sel) {
        setSelectionBoxSignal({ x: sel.x, y: sel.y, w: sel.width, h: sel.height, angle: sel.angle });
      } else {
        setSelectionBoxSignal(null);
      }
    } else {
      setSelectionBoxSignal(null);
    }
  };

  function commitDragCreateFrame(
    startX: number, startY: number, endX: number, endY: number, shiftKey: boolean,
  ) {
    const vw = viewportWidth();
    const vh = viewportHeight();
    const snappedPreview = modernDragSnappedPreview;
    const selW = snappedPreview ? snappedPreview.w : Math.abs(endX - startX);
    const selH = snappedPreview ? snappedPreview.h : Math.abs(endY - startY);
    const selCenterX = snappedPreview
      ? snappedPreview.x + snappedPreview.w / 2
      : Math.min(startX, endX) + selW / 2;
    const selCenterY = snappedPreview
      ? snappedPreview.y + snappedPreview.h / 2
      : Math.min(startY, endY) + selH / 2;

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

    const clamped = clampFrameToProjectedBounds(
      { x: 0, y: 0, w: frameW, h: frameH },
      projected,
      MIN_CROP_SIZE,
    );

    const frame = {
      ...clamped,
      x: (vw - clamped.w) / 2,
      y: (vh - clamped.h) / 2,
    };

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
    const history = workspace.getActiveHistory();
    if (!engine) return;

    tryReleasePointerCapture(params.getCanvasRef(), e.pointerId);

    const tool = (interactiveState.dragTool ?? activeTool()) as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (history && layerId && interactiveState.strokePoints.length > 0) {
        interactiveState.onPaintStroke?.(
          [...interactiveState.strokePoints],
          tool === "eraser",
          interactiveState.paintSettings,
          true,
        );
        params.commitBrushStroke(engine, history, layerId, tool === "eraser");
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
    // Capture already lost →no releasePointerCapture call needed
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine) return;

    const tool = (interactiveState.dragTool ?? activeTool()) as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (history && layerId && interactiveState.strokePoints.length > 0) {
        interactiveState.onPaintStroke?.(
          [...interactiveState.strokePoints],
          tool === "eraser",
          interactiveState.paintSettings,
          true,
        );
        params.commitBrushStroke(engine, history, layerId, tool === "eraser");
      }
    }

    interactiveState.strokePoints = [];
    interactiveState.isDragging = false;
    interactiveState.dragTool = null;
    setCropDragPreview(null);
    resetModernDragState();
  };

  const startSelectionRotation = () =>
    startSelectionRotationFn(
      () => selectionBox(),
      (box) => setSelectionBoxSignal(box),
      () => params.getCanvasContainerRef(),
      () => workspace.getActiveEngine(),
    );

  return {
    cropDragPreview,
    setCropDragPreview,
    snapLines,
    setSnapLines,
    selectionBox,
    setSelectionBoxSignal,
    startSelectionRotation,
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
