import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useEditor } from "./EditorContext";

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
  } = useEditor();

  const [isFitTransition, setIsFitTransition] = createSignal(false);
  let fitTransitionTimeoutId = 0;

  // Shared renderer resize — scales canvas pixel buffer by zoom × devicePixelRatio for HiDPI sharpness
  function resizeRenderer() {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const dpr = window.devicePixelRatio || 1;
    renderer.resize(engine.getWidth(), engine.getHeight(), engine.getViewport().zoom, dpr);
  }

  // Shared fit-to-screen workflow
  function fitToScreenAndRender() {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const container = params.getCanvasContainerRef();
    const rect = container?.getBoundingClientRect();
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

  onMount(() => {
    const canvas = params.getCanvasRef();
    if (canvas) {
      try {
        renderer.initialize(canvas);
      } catch (err) {
        console.error("Renderer init failed:", err);
      }
    }

    const container = params.getCanvasContainerRef();
    if (container) {
      // ─── ResizeObserver — always active ───
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setViewportWidth(entry.contentRect.width);
          setViewportHeight(entry.contentRect.height);
        }
        fitToScreenAndRender();
      });
      resizeObserver.observe(container);

      onCleanup(() => {
        resizeObserver.disconnect();
        renderer.dispose();
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
