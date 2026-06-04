import { createSignal } from "solid-js";
import { useEditor } from "./EditorContext";

interface PanNavigationOptions {
  getCanvasContainerRef: () => HTMLDivElement | undefined;
  fitToScreenAndRender: () => void;
}

export function usePanNavigation(options: PanNavigationOptions) {
  const { workspace, scheduler, syncViewport } = useEditor();

  const [isSpacePressed, setIsSpacePressed] = createSignal(false);
  const [isPanning, setIsPanning] = createSignal(false);

  let panDragStart = { clientX: 0, clientY: 0, panX: 0, panY: 0 };
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

  const handleWheel = (e: WheelEvent) => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    stopMomentum();

    const canvasContainerRef = options.getCanvasContainerRef();
    if (!canvasContainerRef) return;

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

  const onViewportPointerDown = (e: PointerEvent) => {
    // Only handle panning (Space held or middle mouse click)
    if (!isSpacePressed() && e.button !== 1) return;

    stopMomentum();
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    const canvasContainerRef = options.getCanvasContainerRef();
    if (!canvasContainerRef) return;

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

    const canvasContainerRef = options.getCanvasContainerRef();
    if (canvasContainerRef) {
      canvasContainerRef.releasePointerCapture(e.pointerId);
    }
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

  return {
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
  };
}
