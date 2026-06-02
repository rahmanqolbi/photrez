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
import { hitTestLayers } from "@/viewport/layerHitTest";
import type { LayerInfo } from "@/viewport/layerHitTest";
import type { DocumentEngine } from "@/engine/document";
import { useEditor } from "./EditorContext";
import { SelectionTransformOverlay } from "./SelectionTransformOverlay";
import { HoverHighlight } from "./HoverHighlight";
import { SmartGuides } from "./SmartGuides";
import { BrushCursorOverlay } from "./BrushCursorOverlay";
import { CropOverlay } from "./CropOverlay";
import { CropModeIndicator } from "./CropModeIndicator";
import { TransformHud } from "./TransformHud";
import type { HudMode } from "./TransformHud";

// Overlay canvas for real-time brush stroke preview — sync 2D drawing, no createImageBitmap per move
let overlayCanvasRef!: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D | null = null;
let prevStrokePointCount = 0;
let strokeGen = 0;

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
  } = useEditor();

  let canvasContainerRef!: HTMLDivElement;
  let canvasRef!: HTMLCanvasElement;

  // Selection visual marquee boundaries
  const [selectionBox, setSelectionBox] = createSignal<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Crop drag state for overlay interaction
  const [cropDragState, setCropDragState] = createSignal<{
    handle: string | null;
    startRect: { x: number; y: number; w: number; h: number };
    startPointer: { x: number; y: number };
  } | null>(null);

  // Spacebar and Middle-click panning states
  const [isSpacePressed, setIsSpacePressed] = createSignal(false);
  const [isPanning, setIsPanning] = createSignal(false);
  let panDragStart = { clientX: 0, clientY: 0, panX: 0, panY: 0 };

  // Alt key state for eyedropper shortcut (Alt+Brush/Eraser)
  const [isAltPressed, setIsAltPressed] = createSignal(false);

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

  // Kinetic momentum scroll physics
  let lastPointerPositions: { time: number; x: number; y: number }[] = [];
  let momentumVelocity = { x: 0, y: 0 };
  let momentumRafId = 0;

  function stopMomentum() {
    if (momentumRafId) {
      cancelAnimationFrame(momentumRafId);
      momentumRafId = 0;
    }
  }

  function startMomentumDeceleration() {
    stopMomentum();

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    const friction = 0.92; // Natural friction damping factor
    const step = () => {
      momentumVelocity.x *= friction;
      momentumVelocity.y *= friction;

      if (
        Math.abs(momentumVelocity.x) < 0.1 &&
        Math.abs(momentumVelocity.y) < 0.1
      ) {
        momentumVelocity = { x: 0, y: 0 };
        return;
      }

      engine.pan(momentumVelocity.x, momentumVelocity.y);
      syncViewport();
      scheduler.requestRender();

      momentumRafId = requestAnimationFrame(step);
    };

    momentumRafId = requestAnimationFrame(step);
  }

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

  function onPaintStroke(
    points: { x: number; y: number }[],
    isEraser: boolean,
  ) {
    const activeEngine = workspace.getActiveEngine();
    if (!activeEngine) return;
    const activeId = activeEngine.getActiveLayerId();
    if (!activeId) return;

    const layer = activeEngine.getLayer(activeId);
    if (!layer || layer.locked || !layer.visible) return;

    if (!overlayCtx) return;

    // Lazy resize overlay canvas to match layer dimensions
    if (overlayCanvasRef.width !== layer.width || overlayCanvasRef.height !== layer.height) {
      overlayCanvasRef.width = layer.width;
      overlayCanvasRef.height = layer.height;
    }

    // Seed overlay with current layer image at start of a new stroke
    if (prevStrokePointCount === 0) {
      if (layer.imageBitmap) {
        overlayCtx.drawImage(layer.imageBitmap, 0, 0);
      } else {
        overlayCtx.clearRect(0, 0, layer.width, layer.height);
      }
      overlayCtx.globalAlpha = 1.0;
      overlayCtx.lineWidth = 20;
      overlayCtx.lineCap = "round";
      overlayCtx.lineJoin = "round";
      overlayCtx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
      overlayCtx.strokeStyle = isEraser ? "rgba(0,0,0,1.0)" : fgColor();
    }

    // Draw only the delta segment since the last call
    const startIdx = prevStrokePointCount > 0 ? prevStrokePointCount - 1 : 0;
    overlayCtx.beginPath();
    overlayCtx.moveTo(points[startIdx].x, points[startIdx].y);
    for (let i = Math.max(1, prevStrokePointCount); i < points.length; i++) {
      overlayCtx.lineTo(points[i].x, points[i].y);
    }
    overlayCtx.stroke();

    prevStrokePointCount = points.length;
  }

  async function commitBrushStroke(engine: DocumentEngine, layerId: string) {
    if (prevStrokePointCount === 0) return;
    const w = overlayCanvasRef.width;
    const h = overlayCanvasRef.height;
    if (w === 0 || h === 0 || !overlayCtx) return;

    // Sync snapshot — captures current overlay pixels before any async gap
    const snapshot = new OffscreenCanvas(w, h);
    const sCtx = snapshot.getContext("2d")!;
    sCtx.drawImage(overlayCanvasRef, 0, 0);

    try {
      const gen = ++strokeGen;
      const newBitmap = await createImageBitmap(snapshot);
      if (gen !== strokeGen) {
        newBitmap.close();
        return;
      }
      engine.setLayerImageBitmap(layerId, newBitmap);
      renderer.uploadImage(layerId, newBitmap);
      scheduler.requestRender();
      overlayCtx.clearRect(0, 0, w, h);
      prevStrokePointCount = 0;
    } catch (err) {
      console.error("Stroke commit failed:", err);
    }
  }

  // ─── One-time setup (renderer, overlay, observers, listeners) ───
  onMount(() => {
    try {
      renderer.initialize(canvasRef);
    } catch (err) {
      console.error("Renderer init failed:", err);
    }

    if (overlayCanvasRef) {
      overlayCanvasRef.width = docWidth();
      overlayCanvasRef.height = docHeight();
      overlayCtx = overlayCanvasRef.getContext("2d");
    }

    // ─── ResizeObserver — always active ───
    const resizeObserver = new ResizeObserver(() => {
      fitToScreenAndRender();
    });
    resizeObserver.observe(canvasContainerRef);

    // 3. Register global keyboard listeners for premium Photoshop Navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable)
      )
        return;

      stopMomentum();

      const engine = workspace.getActiveEngine();
      if (!engine) return;

      const history = workspace.getActiveHistory();
      if (!history) return;

      // Crop tool keyboard shortcuts
      if (activeTool() === "crop") {
        if (e.key === "Enter") {
          e.preventDefault();
          const rect = cropRect();
          const engine2 = workspace.getActiveEngine();
          if (rect && engine2) {
            const history = workspace.getActiveHistory();
            history?.commit(engine2.snapshot());
            engine2.cropCanvas(rect.x, rect.y, rect.w, rect.h);
            scheduler.requestRender();
            setCropRect(null);
            setActiveTool("move");
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setCropRect(null);
          setActiveTool("move");
          return;
        }
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Alt key tracking for eyedropper shortcut
      if (e.key === "Alt") {
        setIsAltPressed(true);
      }

      // Spacebar panning toggle
      if (e.code === "Space") {
        e.preventDefault();
        stopMomentum();
        if (!isSpacePressed()) {
          setIsSpacePressed(true);
        }
        return;
      }

      // Keyboard nudge for Move Tool: Arrow = 1px, Shift+Arrow = 10px
      if (activeTool() === "move" && (e.key.startsWith("Arrow"))) {
        const activeId = engine.getActiveLayerId();
        if (!activeId) return;
        const layer = engine.getLayer(activeId);
        if (!layer || layer.locked) return;

        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        else if (e.key === "ArrowDown") dy = step;
        else if (e.key === "ArrowLeft") dx = -step;
        else if (e.key === "ArrowRight") dx = step;

        if (!e.repeat) {
          history.commit(engine.snapshot());
        }
        engine.moveLayer(activeId, layer.transform.x + dx, layer.transform.y + dy);
        scheduler.requestRender();
        return;
      }

      // Zoom Shortcuts: Ctrl + Plus / Equal
      if (
        ctrl &&
        (key === "=" ||
          key === "+" ||
          e.code === "Equal" ||
          e.code === "NumpadAdd")
      ) {
        e.preventDefault();
        e.stopPropagation();
        stopMomentum();

        const rect = canvasContainerRef.getBoundingClientRect();
        engine.zoom(1.2, rect.width / 2, rect.height / 2);
        syncViewport();
        scheduler.requestRender();
        return;
      }

      // Zoom Shortcuts: Ctrl + Minus
      if (
        ctrl &&
        (key === "-" || e.code === "Minus" || e.code === "NumpadSubtract")
      ) {
        e.preventDefault();
        e.stopPropagation();
        stopMomentum();

        const rect = canvasContainerRef.getBoundingClientRect();
        engine.zoom(0.8, rect.width / 2, rect.height / 2);
        syncViewport();
        scheduler.requestRender();
        return;
      }

      // Fit Screen Shortcuts: Ctrl + 0
      if (
        ctrl &&
        (key === "0" || e.code === "Digit0" || e.code === "Numpad0")
      ) {
        e.preventDefault();
        e.stopPropagation();
        stopMomentum();
        fitToScreenAndRender();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
      if (e.key === "Alt") {
        setIsAltPressed(false);
      }
    };

    const handleWindowBlur = () => {
      setIsSpacePressed(false);
      setIsPanning(false);
      setIsAltPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    onCleanup(() => {
      resizeObserver.disconnect();
      renderer.dispose();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      stopMomentum();
    });
  });

  // ─── Reactive per-document setup (fitToScreen, renderer resize, layer upload) ───
  createEffect(() => {
    const id = activeDocumentId();
    if (!id) return;

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    try {
      if (overlayCanvasRef) {
        overlayCanvasRef.width = engine.getWidth();
        overlayCanvasRef.height = engine.getHeight();
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

  // Wheel zoom (Ctrl+scroll or Alt+scroll) and Shift+Scroll horizontal panning
  const handleWheel = (e: WheelEvent) => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    stopMomentum();

    if (e.ctrlKey || e.altKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.85;

      // Zoom centered at cursor position (container-relative coordinates)
      const containerRect = canvasContainerRef.getBoundingClientRect();
      engine.zoom(factor, e.clientX - containerRect.left, e.clientY - containerRect.top);
      syncViewport();
      scheduler.requestRender();
    } else {
      e.preventDefault();
      // Holding Shift scrolls horizontal, normal scrolls vertical
      if (e.shiftKey) {
        engine.pan(-e.deltaY, 0);
      } else {
        engine.pan(-e.deltaX, -e.deltaY);
      }
      syncViewport();
      scheduler.requestRender();
    }
  };

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

  // ─── Viewport container handlers: panning only ───
  const onViewportPointerDown = (e: PointerEvent) => {
    // Only handle panning (Space held or middle mouse click)
    if (!isSpacePressed() && e.button !== 1) return;

    stopMomentum();
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    canvasContainerRef.setPointerCapture(e.pointerId);
    setIsPanning(true);
    panDragStart = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: engine.getViewport().panX,
      panY: engine.getViewport().panY,
    };
    lastPointerPositions = [{ time: Date.now(), x: e.clientX, y: e.clientY }];
  };

  const onViewportPointerMove = (e: PointerEvent) => {
    if (!isPanning()) return;

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    const dx = e.clientX - panDragStart.clientX;
    const dy = e.clientY - panDragStart.clientY;
    engine.setViewport({
      panX: panDragStart.panX + dx,
      panY: panDragStart.panY + dy,
    });
    syncViewport();
    scheduler.requestRender();

    const now = Date.now();
    lastPointerPositions.push({ time: now, x: e.clientX, y: e.clientY });
    lastPointerPositions = lastPointerPositions.filter(
      (p) => now - p.time < 100,
    );
  };

  const onViewportPointerUp = (e: PointerEvent) => {
    if (!isPanning()) return;

    canvasContainerRef.releasePointerCapture(e.pointerId);
    setIsPanning(false);

    const now = Date.now();
    lastPointerPositions = lastPointerPositions.filter(
      (p) => now - p.time < 100,
    );

    if (lastPointerPositions.length > 1) {
      const oldest = lastPointerPositions[0];
      const newest = lastPointerPositions[lastPointerPositions.length - 1];
      const dt = newest.time - oldest.time;
      if (dt > 10) {
        const frameMs = 16.67;
        const vx = ((newest.x - oldest.x) / dt) * frameMs;
        const vy = ((newest.y - oldest.y) / dt) * frameMs;

        const maxSpeed = 80;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > 1) {
          const scale = Math.min(speed, maxSpeed) / speed;
          momentumVelocity = { x: vx * scale, y: vy * scale };
          startMomentumDeceleration();
        }
      }
    }
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
            transition: isPanning() || isFitTransition() ? "none" : "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
            "will-change": isPanning() ? "transform" : "auto",
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
            }}
          />

          {/* Overlay canvas — sync 2D brush preview, no createImageBitmap per move */}
          <canvas
            ref={overlayCanvasRef}
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
            <CropOverlay
              cropRect={cropRect()}
              guideMode={cropGuideMode()}
              canvasWidth={docWidth()}
              canvasHeight={docHeight()}
              zoom={zoom()}
              cropMode={cropMode()}
              cropAspect={cropAspect()}
              onCropRectChange={(rect) => setCropRect(rect)}
            />
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

          {/* Crop mode indicator bar */}
          <CropModeIndicator isActive={activeTool() === "crop"} />

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
        </div>
      </Show>
    </div>
  );
}
