import { describe, it, expect, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../EditorContext";
import { useCanvasLayerDrag } from "../useCanvasLayerDrag";
import { WorkspaceManager } from "@/engine/workspace";
import { ViewportCamera } from "../../../viewport/viewportCamera";
import type { LayerNode } from "@/engine/types";

function makeLayer(name: string, x: number, y: number, w = 100, h = 100): LayerNode {
  return {
    id: `layer-${name}`,
    name,
    type: "raster",
    visible: true,
    opacity: 1,
    locked: false,
    blendMode: "normal",
    transform: {
      x,
      y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
    },
    width: w,
    height: h,
    imageBitmap: null,
  };
}

describe("useCanvasLayerDrag (wiring: click+drag in canvas moves layer)", () => {
  function setupWithLayer() {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("wiring-canvas", "Canvas", 800, 600);
    ws.addDocument(session);
    const a = session.engine.addLayer("Draggable") as LayerNode;
    a.transform.x = 100;
    a.transform.y = 100;
    // addLayer inserts at index 0 (newest at front). findLayerAt now iterates
    // top→bottom (index 0 first) so the freshly-added Draggable is on top and
    // hit first. No reorder workaround needed.
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const camera = new ViewportCamera();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const canvasEl = document.createElement("div");
    canvasEl.setAttribute("data-canvas-container", "true");
    canvasEl.style.position = "absolute";
    canvasEl.style.left = "0px";
    canvasEl.style.top = "0px";
    canvasEl.style.width = "800px";
    canvasEl.style.height = "600px";
    document.body.appendChild(canvasEl);

    let dragApi: ReturnType<typeof useCanvasLayerDrag> | null = null;
    function Probe() {
      dragApi = useCanvasLayerDrag();
      return null;
    }
    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any} camera={camera}>
          <Probe />
        </EditorProvider>
      ),
      container,
    );
    // Attach the hook's pointerdown handler to canvasEl (mimics what CanvasViewport does)
    canvasEl.addEventListener("pointerdown", (e) => dragApi?.handlePointerDown(e as PointerEvent));
    return { ws, canvasEl, getDragApi: () => dragApi!, dispose, container };
  }

  function teardown(ctx: { dispose: () => void; container: HTMLDivElement; canvasEl: HTMLDivElement }) {
    ctx.dispose();
    ctx.container.parentNode?.removeChild(ctx.container);
    ctx.canvasEl.parentNode?.removeChild(ctx.canvasEl);
    vi.restoreAllMocks();
  }

  it("click+drag in canvas translates the layer's transform.x and transform.y", () => {
    const ctx = setupWithLayer();
    try {
      const engine = ctx.ws.getEngine("wiring-canvas")!;
      const layer = engine.getLayers().find((l) => l.name === "Draggable")!;
      expect(layer.transform.x).toBe(100);
      expect(layer.transform.y).toBe(100);

      // Simulate pointerdown at center of layer (100,100 in doc space = screen 100,100)
      ctx.canvasEl.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 100,
        clientY: 100,
      }));

      // Simulate pointermove at (200, 150) on document
      document.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        button: 0,
        clientX: 200,
        clientY: 150,
      }));

      // Layer should have moved by the delta
      expect(layer.transform.x).toBe(200);
      expect(layer.transform.y).toBe(150);
      expect(ctx.getDragApi().isDragging()).toBe(true);

      // Simulate pointerup at (200, 150)
      document.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true,
        button: 0,
        clientX: 200,
        clientY: 150,
      }));

      expect(ctx.getDragApi().isDragging()).toBe(false);
    } finally {
      teardown(ctx);
    }
  });

  it("pointerdown on empty canvas area (no layer) does not start drag", () => {
    const ctx = setupWithLayer();
    try {
      const engine = ctx.ws.getEngine("wiring-canvas")!;
      const layer = engine.getLayers().find((l) => l.name === "Draggable")!;
      const startX = layer.transform.x;
      const startY = layer.transform.y;

      // Click at (700, 500) — far from any layer
      ctx.canvasEl.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 700,
        clientY: 500,
      }));

      document.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        clientX: 710,
        clientY: 510,
      }));

      expect(ctx.getDragApi().isDragging()).toBe(false);
      expect(layer.transform.x).toBe(startX);
      expect(layer.transform.y).toBe(startY);
    } finally {
      teardown(ctx);
    }
  });
});
