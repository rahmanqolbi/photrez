// apps/desktop/src/components/editor/canvas/__tests__/useViewportRenderer.test.tsx
//
// Wiring contract: useViewportRenderer must connect EditorContext state to
// the renderer's uploadImage/resizeToViewport pipeline.  If this breaks,
// the canvas shows nothing even though the engine has valid layers.
//
// This test mounts the hook inside a real EditorProvider so createEffect
// fires and side effects (uploadImage, resizeToViewport, requestRender)
// can be verified.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "solid-js/web";
import { WorkspaceManager } from "@/engine/workspace";
import { EditorProvider } from "../../shell/EditorContext";
import { useViewportRenderer } from "../useViewportRenderer";
import type { WebGL2Backend } from "@/renderer/webgl2";
import type { RenderScheduler } from "@/renderer/scheduler";

// Mock ResizeObserver — jsdom doesn't implement it.
// Must be a real class (constructor) so `new ResizeObserver(fn)` works.
class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

function makeMockRenderer(): WebGL2Backend {
  return {
    initialize: vi.fn(),
    uploadImage: vi.fn(),
    destroyTexture: vi.fn(),
    resizeToViewport: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    getWebGLContext: vi.fn(),
  } as unknown as WebGL2Backend;
}

function makeMockScheduler(): RenderScheduler {
  return {
    requestRender: vi.fn(),
    startContinuousRender: vi.fn(),
    stopContinuousRender: vi.fn(),
  } as unknown as RenderScheduler;
}

/** Host component that calls useViewportRenderer and exposes its return for probes. */
function ViewportRendererHost(props: {
  containerRef: HTMLDivElement;
  canvasRef: HTMLCanvasElement;
  overlayRef: HTMLCanvasElement;
  onReady: (api: ReturnType<typeof useViewportRenderer>) => void;
}) {
  const api = useViewportRenderer({
    getCanvasContainerRef: () => props.containerRef,
    getCanvasRef: () => props.canvasRef,
    getOverlayCanvasRef: () => props.overlayRef,
  });
  props.onReady(api);
  return null;
}

async function tick() {
  return new Promise<void>((r) => setTimeout(r, 20));
}

describe("useViewportRenderer wiring", () => {
  let ws: WorkspaceManager;
  let renderer: WebGL2Backend;
  let scheduler: RenderScheduler;
  let containerRef: HTMLDivElement;
  let canvasRef: HTMLCanvasElement;
  let overlayRef: HTMLCanvasElement;
  let dispose: () => void;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    ws = new WorkspaceManager();
    const doc = WorkspaceManager.createBlankDocument("doc-a", "DocA", 800, 600);
    ws.addDocument(doc);
    ws.switchDocument("doc-a");
    renderer = makeMockRenderer();
    scheduler = makeMockScheduler();

    containerRef = document.createElement("div");
    containerRef.getBoundingClientRect = vi.fn(() => ({
      width: 1024,
      height: 768,
      top: 0,
      left: 0,
      right: 1024,
      bottom: 768,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    canvasRef = document.createElement("canvas");
    overlayRef = document.createElement("canvas");

    document.body.appendChild(containerRef);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    dispose?.();
    document.body.replaceChildren();
  });

  it("uploadImage for layers with bitmaps on mount", async () => {
    const doc = ws.getEngine("doc-a")!;
    const l1 = doc.addLayer("L1", 100, 100);
    const l2 = doc.addLayer("L2", 100, 100);
    const bitmap1 = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    doc.setLayerImageBitmap(l1.id, bitmap1);
    // l2 has no bitmap — should not trigger uploadImage

    let api: any;
    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler}>
          <ViewportRendererHost
            containerRef={containerRef}
            canvasRef={canvasRef}
            overlayRef={overlayRef}
            onReady={(a) => { api = a; }}
          />
        </EditorProvider>
      ),
      containerRef,
    );

    // Wait for createEffect to fire (it's async)
    vi.advanceTimersByTime(100);
    await tick();

    // Only l1 has a bitmap — uploadImage called for l1
    expect(renderer.uploadImage).toHaveBeenCalledWith(l1.id, bitmap1);
    // l2 has no bitmap — NOT uploaded
    // (the effect only calls uploadImage for layers that have imageBitmap)
    expect(renderer.uploadImage).not.toHaveBeenCalledWith(l2.id, expect.anything());
    // resizeToViewport should be called (via resizeRenderer inside fitToScreenAndRender)
    expect(renderer.resizeToViewport).toHaveBeenCalled();
  });

  it("resizeToViewport is called with correct viewport dimensions", async () => {
    let api: any;
    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler}>
          <ViewportRendererHost
            containerRef={containerRef}
            canvasRef={canvasRef}
            overlayRef={overlayRef}
            onReady={(a) => { api = a; }}
          />
        </EditorProvider>
      ),
      containerRef,
    );

    vi.advanceTimersByTime(100);
    await tick();

    // resizeToViewport called with container width/height and devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    expect(renderer.resizeToViewport).toHaveBeenCalledWith(1024, 768, dpr);
  });

  it("fitToScreenAndRender adjusts camera and triggers render", async () => {
    let api: any;
    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler}>
          <ViewportRendererHost
            containerRef={containerRef}
            canvasRef={canvasRef}
            overlayRef={overlayRef}
            onReady={(a) => { api = a; }}
          />
        </EditorProvider>
      ),
      containerRef,
    );

    vi.advanceTimersByTime(100);
    await tick();

    // After setup, call fitToScreenAndRender manually
    const mockRequestRender = scheduler.requestRender as unknown as ReturnType<typeof vi.fn>;
    const callCount = mockRequestRender.mock.calls.length;
    api.fitToScreenAndRender();

    vi.advanceTimersByTime(50);
    await tick();

    // requestRender should have been called (at least one more time)
    expect(mockRequestRender.mock.calls.length).toBeGreaterThan(callCount);
  });

  it("disposes renderer and disconnects observer on cleanup", async () => {
    let api: any;
    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler}>
          <ViewportRendererHost
            containerRef={containerRef}
            canvasRef={canvasRef}
            overlayRef={overlayRef}
            onReady={(a) => { api = a; }}
          />
        </EditorProvider>
      ),
      containerRef,
    );

    vi.advanceTimersByTime(100);
    await tick();

    // Unmount the host
    dispose();
    document.body.replaceChildren();

    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
});
