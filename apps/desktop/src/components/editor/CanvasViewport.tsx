import { createSignal, createMemo, createEffect, onMount, onCleanup, Show } from "solid-js";
import { screenToDocument } from "@/viewport/coords";
import {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  ToolType,
  ToolContext,
} from "@/viewport/input-handler";
import { resolveCursor } from "@/viewport/cursorResolver";
import { computeSnapAdjustment } from "@/viewport/smartGuides";
import type { SnapRect } from "@/viewport/smartGuides";
import { getLayerAabb } from "@/viewport/transformGeometry";
import { buildCropSnapTargets } from "@/viewport/cropSnap";
import { constrainCropRectToDocument } from "@/viewport/cropGeometry";
import { hitTestLayers } from "@/viewport/layerHitTest";
import type { LayerInfo } from "@/viewport/layerHitTest";
import type { DocumentEngine } from "@/engine/document";
import { useEditor } from "./EditorContext";
import { useCanvasKeyboard } from "./useCanvasKeyboard";
import { useBrushOverlay } from "./useBrushOverlay";
import { usePanNavigation } from "./usePanNavigation";
import { SelectionTransformOverlay } from "./SelectionTransformOverlay";
import { HoverHighlight } from "./HoverHighlight";
import { SmartGuides } from "./SmartGuides";
import { BrushCursorOverlay } from "./BrushCursorOverlay";
import { CropOverlay } from "./CropOverlay";
import { CropModeIndicator } from "./CropModeIndicator";
import { TransformHud } from "./TransformHud";
import type { HudMode } from "./TransformHud";


const interactiveState: ToolContext = {
  fgColor: "",
  bgColor: "",
  brushSize: 20,
  brushHardness: 0.8,
  brushOpacity: 1.0,
  selectedLayerId: null,
  isAltPressed: false,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  dragCurrent: { x: 0, y: 0 },
  strokePoints: [],
};

export function CanvasViewport() {
  const {
    workspace,
    renderer,
    scheduler,
    activeTool,
    fgColor,
    bgColor,
    setFgColor,
    setBgColor,
    zoom,
    pan,
    docWidth,
    docHeight,
    activeLayerId,
    activeDocumentId,
    layers,
    hoverHandle,
    setHoverHandle,
    syncViewport,
    moveAutoSelect,
    moveSnapEnabled,
    setActiveTool,
    cropRect, setCropRect,
    cropMode, setCropMode,
    cropGuideMode, setCropGuideMode,
    cropDeletePixels, setCropDeletePixels,
    cropAspect, setCropAspect,
    cropSizeTarget, setCropSizeTarget,
    cropRotation, setCropRotation,
    hoverPos,
    setHoverPos,
    setViewportWidth,
    setViewportHeight,
  } = useEditor();

  const {
    onPaintStroke,
    commitBrushStroke,
    setOverlayCanvasRef,
    getOverlayCanvasRef,
  } = useBrushOverlay();

  let canvasContainerRef!: HTMLDivElement;
  let canvasRef!: HTMLCanvasElement;

  // Selection visual marquee boundaries
  const [selectionBox, setSelectionBox] = createSignal<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const {
    isSpacePressed,
    setIsSpacePressed,
    isPanning,
    setIsPanning,
    stopMomentum,
    startMomentumDeceleration,
    handleWheel,
    onViewportPointerDown,
    onViewportPointerMove,
    onViewportPointerUp,
  } = usePanNavigation({
    getCanvasContainerRef: () => canvasContainerRef,
    fitToScreenAndRender,
  });

  // Alt key state for eyedropper shortcut (Alt+Brush/Eraser)
  const [isAltPressed, setIsAltPressed] = createSignal(false);

  // Active crop handle drag state
  const [isCropDragging, setIsCropDragging] = createSignal(false);

  // Fit transition state — gates CSS transition OFF during fitToScreen for snap-to-fit feel
  const [isFitTransition, setIsFitTransition] = createSignal(false);
  let fitTransitionTimeoutId = 0;

  const [snapLines, setSnapLines] = createSignal<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

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

  const [hudInfo, setHudInfoInner] = createSignal<HudData | null>(null);

  const setHudInfo = (hud: HudData | null) => {
    if (!hud) return setHudInfoInner(null);
    const rect = canvasContainerRef?.getBoundingClientRect();
    const engine = workspace.getActiveEngine();
    if (!rect || !engine) return setHudInfoInner(hud);
    const doc = screenToDocument(hud.clientX, hud.clientY, rect, engine.getViewport());
    setHudInfoInner({
      ...hud,
      clientX: doc.x,
      clientY: doc.y,
    });
  };

  // Derived: is active layer locked
  const isLayerLocked = createMemo(() => {
    const id = activeLayerId();
    if (!id) return false;
    const layer = layers().find((l) => l.id === id);
    return layer?.locked ?? false;
  });

  // ─── Crop tool auto-init ───
  const ensureCropRect = () => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const rect = cropRect();
    if (rect && rect.w > 0 && rect.h > 0) return;
    const docW = engine.getWidth();
    const docH = engine.getHeight();
    setCropRect({ x: 0, y: 0, w: docW, h: docH });
  };

  createEffect(() => {
    if (activeTool() !== "crop") {
      setCropRotation(0);
      return;
    }
    ensureCropRect();
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
    isSpacePressed: isSpacePressed(),
    isPanning: isPanning(),
    activeTool: activeTool() as ToolType,
    isAltPressed: isAltPressed(),
    hoverHandle: hoverHandle(),
    isLayerLocked: isLayerLocked(),
    eyedropperTarget: null,
    layerRotation: layerRotation(),
    layerScaleX: layerScaleX(),
    layerScaleY: layerScaleY(),
    hoverPos: hoverPos(),
    layerBoundingBox: layerBoundingBox(),
  }));

  // Viewport container cursor: grab/grabbing when Space held, default otherwise
  const viewportCursorClass = createMemo(() => {
    if (isSpacePressed()) return isPanning() ? "grabbing" : "grab";
    return "default";
  });

  // Imperative cursor sync — bypass JSX style:cursor binding for guaranteed reactivity
  createEffect(() => {
    const c = viewportCursorClass();
    if (canvasContainerRef) canvasContainerRef.style.cursor = c;
  });
  createEffect(() => {
    const c = cursorClass();
    if (canvasRef) canvasRef.style.cursor = c;
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

  // ─── Stable tool context wiring ───
  // Synchronize reactive signal values into the stable module-level ref
  // before each pointer event handler call.
  function prepareToolContext() {
    const engine = workspace.getActiveEngine();
    interactiveState.fgColor = fgColor();
    interactiveState.bgColor = bgColor();
    interactiveState.selectedLayerId = engine ? engine.getActiveLayerId() : null;
    interactiveState.isAltPressed = isAltPressed();
    interactiveState.setFgColor = setFgColor;
    interactiveState.setBgColor = setBgColor;
    interactiveState.onSelectionCreated = (x, y, w, h) => {
      setSelectionBox({ x, y, w, h });
    };
    interactiveState.onCropCreated = (x, y, w, h) => {
      setCropRect({ x, y, w, h });
    };
    interactiveState.onHoverHandle = setHoverHandle;
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
    interactiveState.onPaintStroke = onPaintStroke;
  }

  // Shared fit-to-screen workflow — used by ResizeObserver, double-click, Ctrl+0, and reactive per-document setup
  function fitToScreenAndRender() {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const rect = canvasContainerRef?.getBoundingClientRect();
    if (!rect) return;
    
    // Update global viewport dimensions in EditorContext
    setViewportWidth(rect.width);
    setViewportHeight(rect.height);

    // Disable CSS transition for snap-to-fit feel, then re-enable after 200ms
    if (fitTransitionTimeoutId) clearTimeout(fitTransitionTimeoutId);
    setIsFitTransition(true);
    engine.fitToScreen(rect.width, rect.height);
    syncViewport();
    resizeRenderer();
    scheduler.requestRender();
    fitTransitionTimeoutId = window.setTimeout(() => setIsFitTransition(false), 200);
  }

  // Shared renderer resize — scales canvas pixel buffer by zoom × devicePixelRatio for HiDPI sharpness
  function resizeRenderer() {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const dpr = window.devicePixelRatio || 1;
    renderer.resize(engine.getWidth(), engine.getHeight(), engine.getViewport().zoom, dpr);
  }

  // ─── One-time setup (renderer, overlay, observers, listeners) ───
  useCanvasKeyboard({
    isSpacePressed,
    setIsSpacePressed,
    isAltPressed,
    setIsAltPressed,
    isPanning,
    setIsPanning,
    stopMomentum,
    fitToScreenAndRender,
    syncViewport,
    getCanvasContainerRef: () => canvasContainerRef,
  });

  onMount(() => {
    try {
      renderer.initialize(canvasRef);
    } catch (err) {
      console.error("Renderer init failed:", err);
    }

    // ─── ResizeObserver — always active ───
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportWidth(entry.contentRect.width);
        setViewportHeight(entry.contentRect.height);
      }
      fitToScreenAndRender();
    });
    resizeObserver.observe(canvasContainerRef);

    onCleanup(() => {
      resizeObserver.disconnect();
      renderer.dispose();
      stopMomentum();
    });
  });

  // ─── Reactive per-document setup (fitToScreen, renderer resize, layer upload) ───
  createEffect(() => {
    const id = activeDocumentId();
    if (!id) return;

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    if (activeTool() === "crop") {
      setCropRect({ x: 0, y: 0, w: engine.getWidth(), h: engine.getHeight() });
    } else {
      setCropRect(null);
    }
    setCropRotation(0);

    try {
      const overlayCanvas = getOverlayCanvasRef();
      if (overlayCanvas) {
        overlayCanvas.width = engine.getWidth();
        overlayCanvas.height = engine.getHeight();
      }

      resizeRenderer();

      for (const layer of engine.getLayers()) {
        if (layer.imageBitmap) {
          renderer.uploadImage(layer.id, layer.imageBitmap);
        }
      }

      fitToScreenAndRender();
    } catch (err) {
      console.error("Viewport sync failed:", err);
    }
  });


  // Double Click empty background to fit screen
  const handleDoubleClick = (e: MouseEvent) => {
    if (e.target === canvasContainerRef || e.target === canvasRef) {
      fitToScreenAndRender();
    }
  };

  // Pointer interaction routing
  const getDocCoords = (e: PointerEvent) => {
    const rect = canvasContainerRef.getBoundingClientRect();
    const activeEngine = workspace.getActiveEngine();
    if (!activeEngine) return { x: 0, y: 0 };
    return screenToDocument(
      e.clientX,
      e.clientY,
      rect,
      activeEngine.getViewport(),
    );
  };


  // ─── Canvas element handlers: tool interactions only ───
  const onCanvasPointerDown = (e: PointerEvent) => {
    // Ignore if panning is active (Space held or middle-click) — viewport handles it
    if (isSpacePressed() || e.button === 1) return;

    stopMomentum();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    // Auto-select layer under cursor for Move Tool
    if (activeTool() === "move" && moveAutoSelect()) {
      const coords = getDocCoords(e);
      const allLayers = [...engine.getLayers()];
      const hit = hitTestLayers(coords, allLayers as LayerInfo[]);
      if (hit && hit.id !== engine.getActiveLayerId()) {
        engine.setActiveLayer(hit.id);
        scheduler.requestRender();
      }
    }

    prepareToolContext();
    setSnapLines([]);
    canvasRef.setPointerCapture(e.pointerId);

    const coords = getDocCoords(e);
    handlePointerDown(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      history,
      () => scheduler.requestRender(),
      interactiveState,
    );
  };

  const onCanvasPointerMove = (e: PointerEvent) => {
    // Ignore if panning is active
    if (isPanning()) return;

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    interactiveState.isAltPressed = isAltPressed();

    const coords = getDocCoords(e);
    handlePointerMove(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      () => scheduler.requestRender(),
      interactiveState,
    );
  };

  const onCanvasPointerUp = (e: PointerEvent) => {
    // Ignore if panning is active
    if (isPanning()) return;

    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    setSnapLines([]);
    canvasRef.releasePointerCapture(e.pointerId);

    const coords = getDocCoords(e);
    handlePointerUp(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      history,
      () => scheduler.requestRender(),
      interactiveState,
    );

    const tool = activeTool() as ToolType;
    if (tool === "brush" || tool === "eraser") {
      const layerId = engine.getActiveLayerId();
      if (layerId) commitBrushStroke(engine, layerId);
    }

    setSelectionBox(null);
  };

  return (
    <div
      ref={canvasContainerRef}
      id="canvas-container"
      data-viewport-container
      class="flex-1 relative overflow-hidden bg-editor-canvas"
      onWheel={handleWheel}
      onDblClick={handleDoubleClick}
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
    >
      {/* CSS Transform container — GPU-accelerated pan/zoom */}
      <Show when={workspace.getActiveEngine()}>
        <div
          style={{
            transform: `translate3d(${pan().x}px, ${pan().y}px, 0) scale(${zoom()})`,
            "transform-origin": "0 0",
            transition: isPanning() || isFitTransition() || isCropDragging() ? "none" : "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
            "will-change": isPanning() || isCropDragging() ? "transform" : "auto",
            position: "absolute",
            width: `${docWidth()}px`,
            height: `${docHeight()}px`,
          }}
        >
          {/* WebGL Canvas — fills document space */}
          <canvas
            ref={canvasRef}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              transform: activeTool() === "crop" && cropRect() && cropRotation() !== 0 ? `rotate(${-cropRotation()}deg)` : "none",
              "transform-origin": activeTool() === "crop" && cropRect() ? `${cropRect()!.x + cropRect()!.w / 2}px ${cropRect()!.y + cropRect()!.h / 2}px` : "center center",
            }}
          />

          {/* Overlay canvas — sync 2D brush preview, no createImageBitmap per move */}
          <canvas
            ref={setOverlayCanvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              "pointer-events": "none",
            }}
          />

          {/* Artboard border & shadow */}
          <div
            class="absolute inset-0 pointer-events-none border border-white/10"
            style={{
              "box-shadow": "0 0 0 1px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(0, 0, 0, 0.7)",
              transform: activeTool() === "crop" && cropRect() && cropRotation() !== 0 ? `rotate(${-cropRotation()}deg)` : "none",
              "transform-origin": activeTool() === "crop" && cropRect() ? `${cropRect()!.x + cropRect()!.w / 2}px ${cropRect()!.y + cropRect()!.h / 2}px` : "center center",
            }}
          />

          {/* SVG Overlay Layer in document space */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              "pointer-events": "none",
            }}
          >
            {/* Selection marquee — document-space coordinates */}
            <Show when={selectionBox()}>
              {(box) => (
                <rect
                  x={box().x}
                  y={box().y}
                  width={box().w}
                  height={box().h}
                  fill="none"
                  stroke="#E15A17"
                  stroke-width={1 / zoom()}
                  stroke-dasharray="4 4"
                  class="animate-dash"
                  style={{ "pointer-events": "none" }}
                />
              )}
            </Show>
            <HoverHighlight />
            <SmartGuides lines={snapLines()} />
            <BrushCursorOverlay />
            <Show when={hudInfo()}>
              {(h) => (
                <TransformHud
                  mode={h().mode}
                  clientX={h().clientX}
                  clientY={h().clientY}
                  zoom={zoom()}
                  deltaX={h().deltaX}
                  deltaY={h().deltaY}
                  width={h().width}
                  height={h().height}
                  scalePercent={h().scalePercent}
                  angle={h().angle}
                  snapActive={h().snapActive}
                />
              )}
            </Show>
          </svg>

          {/* SelectionTransformOverlay — document-space coordinates */}
          <Show when={activeTool() === "move"}>
            <SelectionTransformOverlay
              isNavigationMode={isSpacePressed() || isPanning()}
              onHudUpdate={setHudInfo}
              onComputeSnap={(rect) => {
                const engine = workspace.getActiveEngine();
                if (!engine) return { dx: 0, dy: 0, lines: [] };
                const movingId = engine.getActiveLayerId();
                const docW = engine.getWidth();
                const docH = engine.getHeight();
                const layerTargets: SnapRect[] = engine.getLayers()
                  .filter((l) => l.visible && l.id !== movingId)
                  .map((l) => {
                    const aabb = getLayerAabb(l.transform, l.width, l.height);
                    return { x: aabb.x, y: aabb.y, w: aabb.width, h: aabb.height };
                  });
                const snapTargets: SnapRect[] = [
                  { x: 0, y: 0, w: docW, h: docH, snapThreshold: 12, snapPriority: 3 },
                  { x: docW / 2, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
                  { x: -Infinity, y: docH / 2, w: Infinity, h: 0, snapThreshold: 6, snapPriority: 2 },
                  ...layerTargets,
                ];
                const result = computeSnapAdjustment(rect, snapTargets);
                setSnapLines(result.lines);
                return result;
              }}
              onSnapClear={() => setSnapLines([])}
              onScreenToDoc={(cx, cy) => {
                const rect = canvasContainerRef?.getBoundingClientRect();
                const engine = workspace.getActiveEngine();
                if (!rect || !engine) return { x: cx / zoom(), y: cy / zoom() };
                return screenToDocument(cx, cy, rect, engine.getViewport());
              }}
              snapActive={snapLines().length > 0}
            />
          </Show>

          {/* Crop Overlay — self-contained SVG with pointer capture */}
          <Show when={activeTool() === "crop" && cropRect()}>
            <CropOverlay
              cropRect={cropRect()}
              guideMode={cropGuideMode()}
              canvasWidth={docWidth()}
              canvasHeight={docHeight()}
              zoom={zoom()}
              cropMode={cropMode()}
              cropAspect={cropAspect()}
              cropRotation={cropRotation()}
              onCropRectChange={(rect) => setCropRect(rect)}
              onCropRotationChange={setCropRotation}
              onHoverHandleChange={setHoverHandle}
              snapTargets={cropSnapTargets()}
              snapEnabled={moveSnapEnabled()}
              onSnapLines={setSnapLines}
              onDragStateChange={setIsCropDragging}
            />
          </Show>
        </div>

        {/* Crop mode indicator bar — placed outside pan/zoom div so it stays fixed on screen */}
        <CropModeIndicator isActive={activeTool() === "crop"} />
      </Show>
    </div>
  );
}
