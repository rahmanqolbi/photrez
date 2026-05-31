import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { screenToDocument } from "@/viewport/coords";
import { handlePointerDown, handlePointerMove, handlePointerUp, ToolType, ToolContext } from "@/viewport/input-handler";
import { useEditor } from "./EditorContext";
import { SelectionTransformOverlay } from "./SelectionTransformOverlay";


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
    setZoom,
    pan,
    setPan
  } = useEditor();

  let canvasContainerRef!: HTMLDivElement;
  let canvasRef!: HTMLCanvasElement;

  // Selection visual marquee boundaries
  const [selectionBox, setSelectionBox] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);

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
    onPaintStroke: async (points: { x: number; y: number }[], isEraser: boolean) => {
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
    }
  };

  // Sync contextual settings reactively
  onMount(() => {
    // 1. Initialize WebGL2 context
    renderer.initialize(canvasRef);

    // 2. Setup Resize Observer to resize GPU drawing buffer matching container
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.resize(width, height);
        scheduler.requestRender();
      }
    });
    resizeObserver.observe(canvasContainerRef);

    // Initial resize
    const rect = canvasContainerRef.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);
    scheduler.requestRender();

    onCleanup(() => {
      resizeObserver.disconnect();
      renderer.dispose();
    });
  });

  // Wheel zoom (Ctrl+scroll)
  const handleWheel = (e: WheelEvent) => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    if (e.ctrlKey) {
      e.preventDefault();
      const rect = canvasRef.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      
      // Zoom centered at cursor position
      engine.zoom(factor, e.clientX, e.clientY);
      setZoom(engine.getViewport().zoom);
      setPan({ x: engine.getViewport().panX, y: engine.getViewport().panY });
      scheduler.requestRender();
    } else {
      // Regular pan offset scroll
      const engine = workspace.getActiveEngine();
      if (engine) {
        engine.pan(-e.deltaX, -e.deltaY);
        setPan({ x: engine.getViewport().panX, y: engine.getViewport().panY });
        scheduler.requestRender();
      }
    }
  };

  // Pointer interaction routing
  const getDocCoords = (e: PointerEvent) => {
    const rect = canvasRef.getBoundingClientRect();
    const activeEngine = workspace.getActiveEngine();
    if (!activeEngine) return { x: 0, y: 0 };
    return screenToDocument(e.clientX, e.clientY, rect, activeEngine.getViewport());
  };

  const onPointerDown = (e: PointerEvent) => {
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

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
      toolContext
    );
  };

  const onPointerMove = (e: PointerEvent) => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    const coords = getDocCoords(e);
    handlePointerMove(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      () => scheduler.requestRender(),
      toolContext
    );
  };

  const onPointerUp = (e: PointerEvent) => {
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    canvasRef.releasePointerCapture(e.pointerId);
    const coords = getDocCoords(e);
    handlePointerUp(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      history,
      () => scheduler.requestRender(),
      toolContext
    );

    // Reset temporary selection marquee visual
    setSelectionBox(null);
  };

  return (
    <div
      ref={canvasContainerRef}
      class="flex flex-1 items-center justify-center overflow-hidden bg-editor-canvas relative"
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        class="absolute inset-0 w-full h-full cursor-crosshair"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* Photoshop-style Move & Transform Overlay */}
      <Show when={activeTool() === "move"}>
        <SelectionTransformOverlay />
      </Show>

      {/* Screen-space Selection Marquee Visual Overlay */}
      <Show when={selectionBox()}>
        {(box) => {
          const rect = canvasRef?.getBoundingClientRect();
          const engine = workspace.getActiveEngine();
          if (!rect || !engine) return null;

          const viewport = engine.getViewport();
          const screenStart = {
            x: box().x * viewport.zoom + viewport.panX,
            y: box().y * viewport.zoom + viewport.panY
          };
          const screenWidth = box().w * viewport.zoom;
          const screenHeight = box().h * viewport.zoom;

          return (
            <div
              class="absolute border border-dashed border-accent pointer-events-none select-none animate-dash"
              style={{
                left: `${screenStart.x}px`,
                top: `${screenStart.y}px`,
                width: `${screenWidth}px`,
                height: `${screenHeight}px`
              }}
            />
          );
        }}
      </Show>
    </div>
  );
}
