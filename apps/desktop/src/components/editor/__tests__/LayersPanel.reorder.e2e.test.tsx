import { describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { LayersPanel } from "../LayersPanel";
import { DragControllerProvider, useDragController } from "../DragController";
import { WorkspaceManager } from "@/engine/workspace";
import type { LayerDragPayload } from "../dragTypes";

/**
 * ponytail: end-to-end smoke test for the in-panel layer reorder fix.
 * The panel's drop handler must forward the tracked dropTarget (with
 * insertAt + insertPosition) to addLayerFromCrossDoc so the
 * same-doc reorder lands at the row the user aimed at.
 */
describe("LayersPanel — in-panel reorder end-to-end", () => {
  function setupWithMockedRects(rectsByIndex: Array<{ top: number; height: number }>) {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("reorder-doc", "Reorder", 400, 300);
    ws.addDocument(session);
    session.engine.addLayer("Bottom");
    session.engine.addLayer("Middle");
    session.engine.addLayer("Top");

    const scheduler = { requestRender: vi.fn() };
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const container = document.createElement("div");
    document.body.appendChild(container);

    let probe: ReturnType<typeof useDragController> | null = null;
    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <DragControllerProvider>
            <LayersPanel />
            {(() => {
              probe = useDragController();
              return null;
            })()}
          </DragControllerProvider>
        </EditorProvider>
      ),
      container,
    );

    // ponytail: jsdom returns zero rects for everything. The panel's
    // computeInsertionHint iterates row rects to decide which row the
    // pointer is over. Stub each row's getBoundingClientRect to
    // produce a known layout so the test is deterministic.
    const rows = container.querySelectorAll<HTMLElement>("[data-layer-idx]");
    rows.forEach((row, i) => {
      const r = rectsByIndex[i] ?? { top: i * 50, height: 50 };
      row.getBoundingClientRect = () =>
        ({
          x: 0,
          y: r.top,
          left: 0,
          top: r.top,
          right: 200,
          bottom: r.top + r.height,
          width: 200,
          height: r.height,
          toJSON: () => ({}),
        }) as DOMRect;
    });

    return {
      ws,
      container,
      rows,
      probe: () => probe!,
      dispose,
    };
  }

  function fireDragEvent(
    target: Element,
    type: string,
    init: { clientY: number; clientX: number },
  ) {
    const dt = { setData: () => {}, types: [] } as any;
    const evt = new Event(type, { bubbles: true, cancelable: true }) as any;
    evt.clientY = init.clientY;
    evt.clientX = init.clientX;
    evt.dataTransfer = dt;
    target.dispatchEvent(evt);
    return dt;
  }

  function getPayload(ws: WorkspaceManager, sourceIdx: number): LayerDragPayload {
    const layer = ws.getActiveEngine()!.getLayers()[sourceIdx];
    return {
      version: 1,
      sourceDocId: "reorder-doc",
      layerId: layer.id,
      sourceName: layer.name,
      isAltPressed: false,
    };
  }

  it("reorders via tracked dropTarget with insertion above (Top → above Middle)", () => {
    // Layer order: [Top, Middle, Bottom, Background] (indices 0..3).
    // Each row 50px tall, stacked: row 0 = 0..50, row 1 = 50..100, etc.
    const ctx = setupWithMockedRects([
      { top: 0, height: 50 },
      { top: 50, height: 50 },
      { top: 100, height: 50 },
      { top: 150, height: 50 },
    ]);

    try {
      const initialOrder = ctx.ws.getActiveEngine()!.getLayers().map((l) => l.name);
      expect(initialOrder).toEqual(["Top", "Middle", "Bottom", "Background"]);

      const panelDz = ctx.container.querySelector<HTMLElement>("[data-layers-panel-drop-zone]")!;
      ctx.probe().beginLayerDrag(getPayload(ctx.ws, 0), null);

      // Dragover at upper-half of Middle row (y=60) → insertAt=1, above.
      fireDragEvent(panelDz, "dragover", { clientY: 60, clientX: 5 });
      const dt = ctx.probe().state().dropTarget;
      expect(dt?.type).toBe("layers-panel");
      if (dt?.type === "layers-panel") {
        expect(dt.insertAt).toBe(1);
        expect(dt.insertPosition).toBe("above");
      }

      fireDragEvent(panelDz, "drop", { clientY: 60, clientX: 5 });

      // Top (sourceIdx=0) above Middle (insertAt=1, above):
      // sourceIdx < insertAt, position=above → targetIdx = 0.
      // reorderLayer(0, 0) is a no-op (targetIdx === sourceIdx) → no-op.
      const afterOrder = ctx.ws.getActiveEngine()!.getLayers().map((l) => l.name);
      expect(afterOrder).toEqual(["Top", "Middle", "Bottom", "Background"]);
    } finally {
      ctx.dispose();
      document.body.replaceChildren();
    }
  });

  it("reorders via tracked dropTarget with insertion below (Top → below Bottom)", () => {
    const ctx = setupWithMockedRects([
      { top: 0, height: 50 },
      { top: 50, height: 50 },
      { top: 100, height: 50 },
      { top: 150, height: 50 },
    ]);

    try {
      const panelDz = ctx.container.querySelector<HTMLElement>("[data-layers-panel-drop-zone]")!;
      ctx.probe().beginLayerDrag(getPayload(ctx.ws, 0), null);

      // Dragover at lower-half of Bottom row (y=140) → insertAt=2, below.
      fireDragEvent(panelDz, "dragover", { clientY: 140, clientX: 5 });
      const dt = ctx.probe().state().dropTarget;
      expect(dt?.type).toBe("layers-panel");
      if (dt?.type === "layers-panel") {
        expect(dt.insertAt).toBe(2);
        expect(dt.insertPosition).toBe("below");
      }

      fireDragEvent(panelDz, "drop", { clientY: 140, clientX: 5 });

      // Top (sourceIdx=0) below Bottom (insertAt=2, below):
      // sourceIdx < insertAt, position=below → targetIdx = insertAt = 2.
      // reorderLayer(0, 2) → splice out index 0, insert at index 2
      // → [Middle, Bottom, Top, Background].
      const afterOrder = ctx.ws.getActiveEngine()!.getLayers().map((l) => l.name);
      expect(afterOrder).toEqual(["Middle", "Bottom", "Top", "Background"]);
    } finally {
      ctx.dispose();
      document.body.replaceChildren();
    }
  });

  it("reorders correctly when source sits after the insertion target", () => {
    const ctx = setupWithMockedRects([
      { top: 0, height: 50 },
      { top: 50, height: 50 },
      { top: 100, height: 50 },
      { top: 150, height: 50 },
    ]);

    try {
      const panelDz = ctx.container.querySelector<HTMLElement>("[data-layers-panel-drop-zone]")!;
      // Drag Middle (sourceIdx=1) above Top (insertAt=0, above).
      ctx.probe().beginLayerDrag(getPayload(ctx.ws, 1), null);
      fireDragEvent(panelDz, "dragover", { clientY: 10, clientX: 5 });
      fireDragEvent(panelDz, "drop", { clientY: 10, clientX: 5 });

      // Middle (sourceIdx=1) above Top (insertAt=0, above):
      // sourceIdx > insertAt, position=above → targetIdx = insertAt = 0.
      // reorderLayer(1, 0) → splice out index 1, insert at 0
      // → [Middle, Top, Bottom, Background].
      const afterOrder = ctx.ws.getActiveEngine()!.getLayers().map((l) => l.name);
      expect(afterOrder).toEqual(["Middle", "Top", "Bottom", "Background"]);
    } finally {
      ctx.dispose();
      document.body.replaceChildren();
    }
  });
});