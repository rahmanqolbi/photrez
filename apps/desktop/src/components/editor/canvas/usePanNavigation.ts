import { createSignal, onCleanup } from "solid-js";
import { useEditor } from "../shell/EditorContext";
import type { ModernCropFrame } from "@/viewport/modernCropGeometry";

interface PanNavigationOptions {
  getCanvasContainerRef: () => HTMLDivElement | undefined;
  fitToScreenAndRender: () => void;
}

export function usePanNavigation(options: PanNavigationOptions) {
  const { workspace, scheduler, camera, syncFromCamera, modernCropFrame, setModernCropFrame, cropInteractionMode, setZoom, setPan } = useEditor();

  /** When panning in Modern crop mode, shift the frame along with the viewport. */
  function shiftModernCropFrame(dx: number, dy: number) {
    if (cropInteractionMode() !== "modern") return;
    setModernCropFrame((prev: ModernCropFrame | null) => {
      if (!prev) return null;
      return { ...prev, x: prev.x + dx, y: prev.y + dy };
    });
  }

  const [isSpacePressed, setIsSpacePressed] = createSignal(false);
  const [isPanning, setIsPanning] = createSignal(false);

  let panDragStart = { clientX: 0, clientY: 0, panX: 0, panY: 0 };
  let lastPointerPositions: { time: number; x: number; y: number }[] = [];
  let momentumVelocity = { x: 0, y: 0 };
  let momentumRafId = 0;

  // unmounts. Without this, a CanvasViewport tear-down during panning
  // leaves the RAF callback alive, calling workspace.getActiveEngine()
  // on a stale context and producing console noise.
  onCleanup(() => {
    if (momentumRafId) {
      cancelAnimationFrame(momentumRafId);
      momentumRafId = 0;
    }
  });

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

      camera.pan(momentumVelocity.x, momentumVelocity.y);
      shiftModernCropFrame(momentumVelocity.x, momentumVelocity.y);
      syncFromCamera();
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
      const factor = e.deltaY < 0 ? 1.25 : 0.8;

      // Zoom centered at cursor position (container-relative coordinates) - instant for Ctrl+scroll
      const containerRect = canvasContainerRef.getBoundingClientRect();
      camera.zoomToPoint(factor, e.clientX - containerRect.left, e.clientY - containerRect.top);
      syncFromCamera();
      scheduler.requestRender();
    } else {
      e.preventDefault();
      // Holding Shift scrolls horizontal, normal scrolls vertical
      let dx = -e.deltaX;
      let dy = -e.deltaY;
      if (e.shiftKey) {
        dx = -e.deltaY;
        dy = 0;
      }
      camera.pan(dx, dy);
      shiftModernCropFrame(dx, dy);
      syncFromCamera();
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
      panX: camera.getState().x,
      panY: camera.getState().y,
    };
    lastPointerPositions = [{ time: Date.now(), x: e.clientX, y: e.clientY }];
  };

  const onViewportPointerMove = (e: PointerEvent) => {
    if (!isPanning()) return;

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    const dx = e.clientX - panDragStart.clientX;
    const dy = e.clientY - panDragStart.clientY;
    const prevPanX = camera.getState().x;
    const prevPanY = camera.getState().y;
    camera.setState({
      x: panDragStart.panX + dx,
      y: panDragStart.panY + dy,
      zoom: camera.getState().zoom,
    });
    const actualDx = camera.getState().x - prevPanX;
    const actualDy = camera.getState().y - prevPanY;
    shiftModernCropFrame(actualDx, actualDy);
    // Update zoom/pan signals without calling syncFromCamera() (which also
    // calls engine.setViewport → notifyChange → sync → setSelectedLayerId).
    // During panning that would re-select a deselected layer on every tick.
    const camState = camera.getState();
    setZoom(camState.zoom);
    setPan({ x: camState.x, y: camState.y });
    scheduler.requestRender();

    const now = Date.now();
    lastPointerPositions.push({ time: now, x: e.clientX, y: e.clientY });
    lastPointerPositions = lastPointerPositions.filter(
      (p) => now - p.time < 100,
    );
  };

  function resetPanning(pointerId?: number) {
    if (pointerId !== undefined) {
      const ref = options.getCanvasContainerRef();
      if (ref) {
        try { ref.releasePointerCapture(pointerId); } catch { /* capture may already be gone */ }
      }
    }
    setIsPanning(false);
    panDragStart = { clientX: 0, clientY: 0, panX: 0, panY: 0 };
    momentumVelocity = { x: 0, y: 0 };
    stopMomentum();
  }

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

  const onViewportPointerCancel = (e: PointerEvent) => {
    if (!isPanning()) return;
    resetPanning(e.pointerId);
  };

  const onViewportLostPointerCapture = (e: PointerEvent) => {
    if (!isPanning()) return;
    resetPanning(e.pointerId);
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
    onViewportPointerCancel,
    onViewportLostPointerCapture,
  };
}
