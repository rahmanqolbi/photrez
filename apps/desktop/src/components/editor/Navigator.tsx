import { createEffect, createSignal, Show, onMount, onCleanup } from "solid-js";
import { clsx } from "clsx";
import { useEditor } from "./EditorContext";
import { Icon } from "./icons";

export function Navigator() {
  const {
    workspace,
    zoom,
    setZoom,
    pan,
    setPan,
    docWidth,
    docHeight,
    viewportWidth,
    viewportHeight,
    activeDocumentId,
    layers,
    syncViewport,
    scheduler
  } = useEditor();

  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  // Render variables
  const [scale, setScale] = createSignal(1);
  const [offsetX, setOffsetX] = createSignal(0);
  const [offsetY, setOffsetY] = createSignal(0);
  const [thumbW, setThumbW] = createSignal(0);
  const [thumbH, setThumbH] = createSignal(0);

  // Re-calculate thumbnail size and scale whenever document bounds change
  createEffect(() => {
    const dw = docWidth();
    const dh = docHeight();
    if (dw <= 0 || dh <= 0) return;

    // Available Navigator container size is 208px width, 88px height (240px minus padding)
    const containerW = 208;
    const containerH = 88;

    const s = Math.min(containerW / dw, containerH / dh);
    setScale(s);

    const w = dw * s;
    const h = dh * s;
    setThumbW(w);
    setThumbH(h);

    setOffsetX((containerW - w) / 2);
    setOffsetY((containerH - h) / 2);
  });

  // Render loop for composite image + Red Box overlay
  createEffect(() => {
    if (!canvasRef || !activeDocumentId()) return;
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    const dw = docWidth();
    const dh = docHeight();
    const s = scale();
    const ox = offsetX();
    const oy = offsetY();
    const tw = thumbW();
    const th = thumbH();

    // Clear canvas
    ctx.clearRect(0, 0, 208, 88);

    // Draw background grid checkerboard inside document bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, tw, th);
    ctx.clip();

    for (let y = 0; y < th; y += 4) {
      for (let x = 0; x < tw; x += 4) {
        ctx.fillStyle = (x + y) % 8 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.15)";
        ctx.fillRect(ox + x, oy + y, 4, 4);
      }
    }
    ctx.restore();

    // Draw layers from bottom to top
    const allLayers = [...layers()].reverse();
    for (const layer of allLayers) {
      if (!layer.visible || !layer.imageBitmap) continue;

      ctx.save();
      // Translate and scale to navigator space
      ctx.translate(ox, oy);
      ctx.scale(s, s);

      // Apply opacity
      ctx.globalAlpha = layer.opacity;

      // Layer specific transformations
      const lw = layer.width;
      const lh = layer.height;
      const sx = layer.transform.scaleX;
      const sy = layer.transform.scaleY;
      const cx = layer.transform.x + (lw * Math.abs(sx)) / 2;
      const cy = layer.transform.y + (lh * Math.abs(sy)) / 2;

      ctx.translate(cx, cy);
      if (layer.transform.rotation) {
        ctx.rotate((layer.transform.rotation * Math.PI) / 180);
      }
      const flipX = layer.transform.flipH ? -1 : 1;
      const flipY = layer.transform.flipV ? -1 : 1;
      ctx.scale(sx * flipX, sy * flipY);

      // Draw it
      ctx.drawImage(layer.imageBitmap, -lw / 2, -lh / 2);
      ctx.restore();
    }

    // ─── Draw Viewport Box (Red Box) ───
    const currentZoom = zoom();
    const currentPan = pan();
    const vw = viewportWidth();
    const vh = viewportHeight();

    // Map viewport frame coordinates from main workspace space into navigator canvas space
    // mainViewportLeftInDocSpace = -panX / zoom
    const vLeft = -currentPan.x / currentZoom;
    const vTop = -currentPan.y / currentZoom;
    const vWidth = vw / currentZoom;
    const vHeight = vh / currentZoom;

    // Convert doc space coordinates to navigator thumbnail coordinates
    const navLeft = ox + vLeft * s;
    const navTop = oy + vTop * s;
    const navWidth = vWidth * s;
    const navHeight = vHeight * s;

    // Draw border
    ctx.strokeStyle = "#E15A17"; // Photon Amber
    ctx.lineWidth = 1.5;
    ctx.strokeRect(navLeft, navTop, navWidth, navHeight);

    // Optional semi-transparent mask outside viewport
    ctx.fillStyle = "rgba(225, 90, 23, 0.08)";
    ctx.fillRect(navLeft, navTop, navWidth, navHeight);
  });

  // Pan to a target Navigator canvas relative coordinate
  const panToNavigatorCoord = (clientX: number, clientY: number) => {
    const engine = workspace.getActiveEngine();
    if (!engine || !canvasRef) return;

    const rect = canvasRef.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    // Convert navigator coordinate to document space coordinate
    const ox = offsetX();
    const oy = offsetY();
    const s = scale();

    const docX = (mouseX - ox) / s;
    const docY = (mouseY - oy) / s;

    // Update pan so that the center of the main viewport lines up with docX and docY
    const vw = viewportWidth();
    const vh = viewportHeight();
    const currentZoom = zoom();

    const panX = vw / 2 - docX * currentZoom;
    const panY = vh / 2 - docY * currentZoom;

    engine.setViewport({ panX, panY });
    setPan({ x: panX, y: panY });
    scheduler.requestRender();
  };

  // Pointer dragging states for the Red Box navigation
  let isDragging = false;

  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    isDragging = true;
    panToNavigatorCoord(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    panToNavigatorCoord(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDragging) return;
    const target = e.target as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    isDragging = false;
  };

  return (
    <div ref={containerRef} class="px-4 pt-4 select-none">
      <Show
        when={activeDocumentId()}
        fallback={
          <div class="flex h-[88px] flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-editor-divider/50 text-center">
            <Icon name="crop" class="size-5 text-editor-text-dim opacity-50" strokeWidth={1.5} />
            <span class="text-[12px] text-editor-text-dim">No image open</span>
          </div>
        }
      >
        <div 
          class="relative h-[88px] w-full rounded-[3px] border border-editor-divider bg-editor-panel overflow-hidden flex items-center justify-center cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            width={208}
            height={88}
            class="pointer-events-none"
          />
        </div>
      </Show>
    </div>
  );
}
