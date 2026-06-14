import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useEditor } from "./EditorContext";
import { centerModernCropFrame } from "@/viewport/modernCropGeometry";
import { easeOutCubic } from "@/viewport/easing";

interface UseViewportRendererParams {
  getCanvasContainerRef: () => HTMLDivElement | undefined;
  getCanvasRef: () => HTMLCanvasElement | undefined;
  getOverlayCanvasRef: () => HTMLCanvasElement | undefined;
}

export function useViewportRenderer(params: UseViewportRendererParams) {
  const {
    workspace,
    renderer,
    scheduler,
    activeDocumentId,
    zoom,
    syncViewport,
    setViewportWidth,
    setViewportHeight,
    modernCropFrame,
    setModernCropFrame,
    cropInteractionMode,
    activeTool,
    viewportWidth,
    viewportHeight,
    camera,
    syncFromCamera,
  } = useEditor();

  const [isFitTransition, setIsFitTransition] = createSignal(false);
  let fitTransitionTimeoutId = 0;

  // Shared renderer resize — scales canvas pixel buffer by viewport size or zoom × devicePixelRatio
  function resizeRenderer() {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const dpr = window.devicePixelRatio || 1;
    // Resize the WebGL canvas backing buffer to match the container so the
    // browser does NOT need to scale the buffer to fit (which would cause
    // non-uniform scaling and stretched cells). The camera's matrix and
    // the GL viewport both refer to this same buffer, so layer compositing
    // in pass 1 is geometrically consistent.
    renderer.resizeToViewport(viewportWidth(), viewportHeight(), dpr);
  }

  // Shared fit-to-screen workflow
  function fitToScreenAndRender(animated = false) {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const container = params.getCanvasContainerRef();
    const rect = container?.getBoundingClientRect();
    if (!rect) return;

    // Update global viewport dimensions in EditorContext
    setViewportWidth(rect.width);
    setViewportHeight(rect.height);
    camera.setViewportSize(rect.width, rect.height);

    const padding = 80;
    const fitZoom = Math.max(0.05, Math.min(
      (rect.width - padding) / engine.getWidth(),
      (rect.height - padding) / engine.getHeight(),
      10.0
    ));
    const targetX = (rect.width - engine.getWidth() * fitZoom) / 2;
    const targetY = (rect.height - engine.getHeight() * fitZoom) / 2;

    if (fitTransitionTimeoutId) clearTimeout(fitTransitionTimeoutId);

    if (animated) {
      setIsFitTransition(true);
      camera.animateTo({ x: targetX, y: targetY, zoom: fitZoom }, 150, easeOutCubic);
      fitTransitionTimeoutId = window.setTimeout(() => setIsFitTransition(false), 200);
    } else {
      camera.setState({ x: targetX, y: targetY, zoom: fitZoom });
      syncFromCamera();
      if (cropInteractionMode() === "modern") {
        setModernCropFrame((prev: any) => {
          if (!prev) return null;
          return centerModernCropFrame(prev, rect.width, rect.height);
        });
      }
      resizeRenderer();
      scheduler.requestRender();
    }
  }

  onMount(() => {
    const canvas = params.getCanvasRef();
    if (canvas) {
      try {
        renderer.initialize(canvas);
      } catch (err) {
        console.error("Renderer init failed:", err);
      }
    }

    let animFrameId = 0;
    const tickLoop = () => {
      if (camera.isAnimating()) {
        camera.tick(performance.now());
        syncFromCamera();
        animFrameId = requestAnimationFrame(tickLoop);
      }
    };

    camera.onAnimationStart = () => {
      scheduler.startContinuousRender();
      cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(tickLoop);
    };

    camera.onAnimationEnd = () => {
      scheduler.stopContinuousRender();
      cancelAnimationFrame(animFrameId);
    };

    const container = params.getCanvasContainerRef();
    if (container) {
      // ─── ResizeObserver — always active ───
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setViewportWidth(entry.contentRect.width);
          setViewportHeight(entry.contentRect.height);
          camera.setViewportSize(entry.contentRect.width, entry.contentRect.height);
        }
        fitToScreenAndRender();
      });
      resizeObserver.observe(container);

      onCleanup(() => {
        resizeObserver.disconnect();
        renderer.dispose();
        cancelAnimationFrame(animFrameId);
        camera.onAnimationStart = undefined;
        camera.onAnimationEnd = undefined;
      });
    }
  });

  // Reactive per-document setup (fitToScreen, renderer resize, layer upload)
  createEffect(() => {
    const id = activeDocumentId();
    if (!id) return;

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    try {
      const overlayCanvas = params.getOverlayCanvasRef();
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

  // Reactive zoom sync — resize WebGL canvas buffer when zoom changes.
  // Without this, the canvas backing buffer stays at the old zoom resolution,
  // causing CSS scale(zoom) to stretch/compress a stale buffer → blurry image.
  createEffect(() => {
    const _z = zoom();
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    resizeRenderer();
  });

  return {
    isFitTransition,
    fitToScreenAndRender,
    resizeRenderer,
  };
}
