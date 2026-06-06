import { createSignal } from "solid-js";
import { useEditor } from "./EditorContext";
import { screenToDocument } from "@/viewport/coords";
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
import { resetCropPreviewToCanvas, restoreHiddenCropPreview, createCropRectFromDocumentPoints } from "./cropToolActions";

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
    cropRect,
    setCropRect,
    cropRotation,
    setCropRotation,
    hiddenCropPreview,
    setHiddenCropPreview,
    setHoverHandle,
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
  const paintSmoother = new PaintSmoother();

  const [snapLines, setSnapLines] = createSignal<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [selectionBox, setSelectionBoxSignal] = createSignal<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [hudInfo, setHudInfoInner] = createSignal<HudData | null>(null);

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

    if (activeTool() === "crop" && !cropRect() && e.button === 0) {
      isPendingCropClick = true;
    } else {
      isPendingCropClick = false;
    }

    if (activeTool() === "move" && moveAutoSelect()) {
      const coords = getDocCoords(e);
      const allLayers = [...engine.getLayers()];
      const hit = hitTestLayers(coords, allLayers as LayerInfo[]);
      if (hit && hit.id !== engine.getActiveLayerId()) {
        engine.setActiveLayer(hit.id);
        scheduler.requestRender();
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

    const tool = activeTool() as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (layerId) params.commitBrushStroke(engine, layerId, tool === "eraser");
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

    const tool = activeTool() as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (layerId && interactiveState.strokePoints.length > 0) {
        params.commitBrushStroke(engine, layerId, tool === "eraser");
      }
    }

    interactiveState.strokePoints = [];
    interactiveState.isDragging = false;
  };

  const onCanvasLostPointerCapture = (e: PointerEvent) => {
    paintSmoother.reset();
    // Capture already lost — no releasePointerCapture call needed
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    const tool = activeTool() as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (layerId && interactiveState.strokePoints.length > 0) {
        params.commitBrushStroke(engine, layerId, tool === "eraser");
      }
    }

    interactiveState.strokePoints = [];
    interactiveState.isDragging = false;
  };

  return {
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
