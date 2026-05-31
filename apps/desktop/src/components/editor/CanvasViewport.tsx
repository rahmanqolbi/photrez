import { createSignal, createMemo, onMount, onCleanup, Show } from "solid-js";
import { screenToDocument } from "@/viewport/coords";
import {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  ToolType,
  ToolContext,
} from "@/viewport/input-handler";
import { resolveCursor } from "@/viewport/cursorResolver";
import { useEditor } from "./EditorContext";
import { SelectionTransformOverlay } from "./SelectionTransformOverlay";
import { HoverHighlight } from "./HoverHighlight";
import { SmartGuides } from "./SmartGuides";
import { BrushCursorOverlay } from "./BrushCursorOverlay";
import { CropOverlay } from "./CropOverlay";
import { CropModeIndicator } from "./CropModeIndicator";

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
    layers,
    syncViewport,
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

  // Crop overlay state
  const [cropRect, setCropRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropGuideMode, setCropGuideMode] = createSignal<"none" | "thirds" | "grid" | "diagonal" | "golden">("none");

  // Spacebar and Middle-click panning states
  const [isSpacePressed, setIsSpacePressed] = createSignal(false);
  const [isPanning, setIsPanning] = createSignal(false);
  let panDragStart = { clientX: 0, clientY: 0, panX: 0, panY: 0 };

  // Alt key state for eyedropper shortcut (Alt+Brush/Eraser)
  const [isAltPressed, setIsAltPressed] = createSignal(false);

  // Hover handle state for cursor resolver (will be wired to crop/move handles)
  const [hoverHandle, setHoverHandle] = createSignal<string | null>(null);

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

  const cursorClass = () => resolveCursor({
    isSpacePressed: isSpacePressed(),
    isPanning: isPanning(),
    activeTool: activeTool() as ToolType,
    isAltPressed: isAltPressed(),
    hoverHandle: hoverHandle(),
    cropOn: false,
    isLayerLocked: isLayerLocked(),
    eyedropperTarget: null,
  });

  // Transient interactive panning & dragging state
  const toolContext: ToolContext = {
    fgColor: fgColor(),
    bgColor: bgColor(),
    brushSize: 20,
    brushHardness: 0.8,
    brushOpacity: 1.0,
    selectedLayerId: null,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    setFgColor,
    setBgColor,
    onSelectionCreated: (x, y, w, h) => {
      setSelectionBox({ x, y, w, h });
    },
    onPaintStroke: async (
      points: { x: number; y: number }[],
      isEraser: boolean,
    ) => {
      const activeEngine = workspace.getActiveEngine();
      if (!activeEngine) return;
      const activeId = activeEngine.getActiveLayerId();
      if (!activeId) return;

      const layer = activeEngine.getLayer(activeId);
      if (!layer || layer.locked || !layer.visible) return;

      const width = layer.width;
      const height = layer.height;

      // Create offscreen canvas to paint the stroke
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;

      // Draw current layer contents
      if (layer.imageBitmap) {
        ctx.drawImage(layer.imageBitmap, 0, 0);
      }

      // Draw stroke path
      ctx.save();
      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1.0)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = fgColor();
      }
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 20; // 20px default size
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();

      try {
        const newBitmap = await createImageBitmap(offscreen);
        activeEngine.setLayerImageBitmap(layer.id, newBitmap);
        renderer.uploadImage(layer.id, newBitmap);
        scheduler.requestRender();
      } catch (err) {
        console.error("Failed to update ImageBitmap on stroke drawing:", err);
      }
    },
  };

  // Sync contextual settings reactively
  onMount(() => {
    // 1. Initialize WebGL2 context
    renderer.initialize(canvasRef);

    // 2. Resize WebGL canvas to document dimensions (1:1 pixel mapping).
    //    CSS transform handles all viewport positioning — no resize needed
    //    when the container resizes, only when document size changes.
    renderer.resize(docWidth(), docHeight());
    scheduler.requestRender();

    // Auto-fit document to screen on first load
    const engine = workspace.getActiveEngine();
    if (engine) {
      const rect = canvasContainerRef.getBoundingClientRect();
      engine.fitToScreen(rect.width, rect.height);
      syncViewport();
      scheduler.requestRender();
    }

    // Re-fit viewport on window resize
    const resizeObserver = new ResizeObserver(() => {
      const engine = workspace.getActiveEngine();
      if (engine) {
        const rect = canvasContainerRef.getBoundingClientRect();
        engine.fitToScreen(rect.width, rect.height);
        syncViewport();
        scheduler.requestRender();
      }
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

      const engine = workspace.getActiveEngine();
      if (!engine) return;

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

        const rect = canvasContainerRef.getBoundingClientRect();
        engine.fitToScreen(rect.width, rect.height);
        syncViewport();
        scheduler.requestRender();
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
      const engine = workspace.getActiveEngine();
      if (engine) {
        const rect = canvasContainerRef.getBoundingClientRect();
        engine.fitToScreen(rect.width, rect.height);
        syncViewport();
        scheduler.requestRender();
      }
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

  const onPointerDown = (e: PointerEvent) => {
    stopMomentum();

    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    // Check if panning navigation is active (either Space held or middle mouse click)
    if (isSpacePressed() || e.button === 1) {
      canvasRef.setPointerCapture(e.pointerId);
      setIsPanning(true);
      panDragStart = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: engine.getViewport().panX,
        panY: engine.getViewport().panY,
      };
      // Record starting pointer position for flick velocity calculation
      lastPointerPositions = [{ time: Date.now(), x: e.clientX, y: e.clientY }];
      return;
    }

    canvasRef.setPointerCapture(e.pointerId);
    const coords = getDocCoords(e);

    // Set parameters
    toolContext.fgColor = fgColor();
    toolContext.bgColor = bgColor();
    toolContext.selectedLayerId = engine.getActiveLayerId();

    handlePointerDown(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      history,
      () => scheduler.requestRender(),
      toolContext,
    );
  };

  const onPointerMove = (e: PointerEvent) => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    // If currently drag-panning, update viewport offsets
    if (isPanning()) {
      const dx = e.clientX - panDragStart.clientX;
      const dy = e.clientY - panDragStart.clientY;
      const nextPanX = panDragStart.panX + dx;
      const nextPanY = panDragStart.panY + dy;
      engine.setViewport({ panX: nextPanX, panY: nextPanY });
      syncViewport();
      scheduler.requestRender();

      // Record position tracking for flick momentum
      const now = Date.now();
      lastPointerPositions.push({ time: now, x: e.clientX, y: e.clientY });
      lastPointerPositions = lastPointerPositions.filter(
        (p) => now - p.time < 100,
      );
      return;
    }

    const coords = getDocCoords(e);
    handlePointerMove(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      () => scheduler.requestRender(),
      toolContext,
    );
  };

  const onPointerUp = (e: PointerEvent) => {
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    // Release panning and initiate kinetic momentum physics
    if (isPanning()) {
      canvasRef.releasePointerCapture(e.pointerId);
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

          // Damping clamp to avoid wild infinite flies
          const maxSpeed = 80;
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > 1) {
            const scale = Math.min(speed, maxSpeed) / speed;
            momentumVelocity = { x: vx * scale, y: vy * scale };
            startMomentumDeceleration();
          }
        }
      }
      return;
    }

    canvasRef.releasePointerCapture(e.pointerId);
    const coords = getDocCoords(e);
    handlePointerUp(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      history,
      () => scheduler.requestRender(),
      toolContext,
    );

    // Reset temporary selection marquee visual
    setSelectionBox(null);
  };

  return (
    <div
      ref={canvasContainerRef}
      data-viewport-container
      class="flex flex-1 items-center justify-center overflow-hidden bg-editor-canvas relative"
      onWheel={handleWheel}
      onDblClick={handleDoubleClick}
    >
      {/* CSS Transform container — GPU-accelerated pan/zoom */}
      <Show when={workspace.getActiveEngine()}>
        <div
          style={{
            transform: `translate3d(${pan().x}px, ${pan().y}px, 0) scale(${zoom()})`,
            "transform-origin": "0 0",
            transition: isPanning() ? "none" : "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
            "will-change": isPanning() ? "transform" : "auto",
            position: "absolute",
            width: `${docWidth()}px`,
            height: `${docHeight()}px`,
          }}
        >
          {/* WebGL Canvas — fills document space */}
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              cursor: cursorClass(),
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
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
            <SmartGuides lines={[]} />
            <BrushCursorOverlay />
            <CropOverlay
              cropRect={cropRect()}
              guideMode={cropGuideMode()}
              canvasWidth={docWidth()}
              canvasHeight={docHeight()}
            />
          </svg>

          {/* Crop mode indicator bar */}
          <CropModeIndicator isActive={activeTool() === "crop"} />

          {/* SelectionTransformOverlay — document-space coordinates */}
          <Show when={activeTool() === "move"}>
            <SelectionTransformOverlay />
          </Show>
        </div>
      </Show>
    </div>
  );
}
