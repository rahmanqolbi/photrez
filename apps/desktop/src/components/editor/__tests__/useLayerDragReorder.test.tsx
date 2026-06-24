import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { useLayerDragReorder } from "../useLayerDragReorder";
import { DragControllerProvider, useDragController } from "../DragController";
import { WorkspaceManager } from "@/engine/workspace";
import type { LayerDragPayload } from "../dragTypes";

function setRect(el: HTMLElement, top: number, height: number) {
  el.getBoundingClientRect = vi.fn(() => ({
    x: 0,
    y: top,
    left: 0,
    top,
    right: 200,
    bottom: top + height,
    width: 200,
    height,
    toJSON: () => ({}),
  }));
}

function makeList() {
  const list = document.createElement("div");
  for (let i = 0; i < 3; i++) {
    const item = document.createElement("div");
    item.dataset.layerIdx = String(i);
    setRect(item, i * 50, 50);
    list.appendChild(item);
  }
  return list;
}

describe("useLayerDragReorder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  function setup() {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("reorder-doc", "Reorder", 800, 600);
    ws.addDocument(session);
    session.engine.addLayer("Bottom");
    session.engine.addLayer("Middle");
    session.engine.addLayer("Top");

    const scheduler = { requestRender: vi.fn() };
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const container = document.createElement("div");
    const list = makeList();
    container.appendChild(list);
    document.body.appendChild(container);

    let api: ReturnType<typeof useLayerDragReorder> | null = null;
    let drag: ReturnType<typeof useDragController> | null = null;
    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <DragControllerProvider>
            {(() => {
              api = useLayerDragReorder();
              api.setLayerListRef(list);
              drag = useDragController();
              return null;
            })()}
          </DragControllerProvider>
        </EditorProvider>
      ),
      container,
    );

    return { ws, scheduler, list, dispose, api: () => api!, drag: () => drag! };
  }

  it("reorders top/middle/bottom correctly when dragging the top row below the bottom row", () => {
    const ctx = setup();
    try {
      const rows = ctx.list.querySelectorAll<HTMLElement>("[data-layer-idx]");
      rows[0].addEventListener("pointerdown", (e) => ctx.api().handlePointerDragStart(e as PointerEvent, 0));

      rows[0].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientY: 10 }));
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, button: 0, clientY: 145 }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, clientY: 145 }));

      expect(ctx.ws.getActiveEngine()!.getLayers().map((l) => l.name).filter((name) => name !== "Background")).toEqual([
        "Middle",
        "Bottom",
        "Top",
      ]);
      expect(ctx.scheduler.requestRender).toHaveBeenCalled();
      expect(ctx.ws.getActiveHistory()?.canUndo()).toBe(true);
    } finally {
      ctx.dispose();
    }
  });

  it("reorders top/middle/bottom correctly when dragging the bottom row above the top row", () => {
    const ctx = setup();
    try {
      const rows = ctx.list.querySelectorAll<HTMLElement>("[data-layer-idx]");
      rows[2].addEventListener("pointerdown", (e) => ctx.api().handlePointerDragStart(e as PointerEvent, 2));

      rows[2].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientY: 110 }));
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, button: 0, clientY: 5 }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, clientY: 5 }));

      expect(ctx.ws.getActiveEngine()!.getLayers().map((l) => l.name).filter((name) => name !== "Background")).toEqual([
        "Bottom",
        "Top",
        "Middle",
      ]);
    } finally {
      ctx.dispose();
    }
  });

  // Regression: when the HTML5 drag controller activates during the
  // pointer drag (e.g. browser fires dragstart while pointermove is
  // still running), the in-panel pointer drag abandons. Before Pass
  // 11, the abandon branch removed the pointerup listener WITHOUT
  // clearing draggedIndex — so the source layer stayed visually
  // "stuck" as dragged until the next pointerup cycle. The fix
  // clears all drag signals in the abandon branch. This test pins
  // the cleanup contract: after abandonment, all drag state signals
  // return to null/false and no reorder is committed even when the
  // user later releases the mouse.
  it("clears drag state when HTML5 drag activates during pointer drag (no stuck visual)", () => {
    const ctx = setup();
    try {
      const rows = ctx.list.querySelectorAll<HTMLElement>("[data-layer-idx]");
      rows[0].addEventListener("pointerdown", (e) => ctx.api().handlePointerDragStart(e as PointerEvent, 0));

      const initialNames = ctx.ws.getActiveEngine()!.getLayers().map((l) => l.name);

      // 1. Pointer down on row 0 (Top).
      rows[0].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientY: 10 }));

      // 2. Move past dead-zone — this activates dragActive and
      //    sets draggedIndex(0).
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, button: 0, clientY: 80 }));
      expect(ctx.api().draggedIndex()).toBe(0);
      expect(ctx.api().dragActive()).toBe(true);

      // 3. HTML5 drag fires mid-pointermove. This is what happens
      //    in production when the browser dispatches dragstart after
      //    the row becomes "draggable".
      ctx.drag().beginLayerDrag(
        {
          version: 1,
          sourceDocId: "reorder-doc",
          layerId: "any",
          sourceName: "any",
          isAltPressed: false,
        } satisfies LayerDragPayload,
        null,
      );

      // 4. Next pointermove detects dragKind !== null → abandons.
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, button: 0, clientY: 120 }));

      // 5. Critical: all drag signals must be cleared so the source
      //    layer is not visually stuck.
      expect(ctx.api().draggedIndex()).toBeNull();
      expect(ctx.api().dragActive()).toBe(false);
      expect(ctx.api().dragOverIndex()).toBeNull();
      expect(ctx.api().dropPosition()).toBeNull();

      // 6. pointerup fires later — but the listener was removed in
      //    the abandon branch. Simulate a delayed mouse release to
      //    prove it does not trigger reorder or cause errors.
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, clientY: 120 }));

      // 7. Engine layer order is unchanged.
      const afterNames = ctx.ws.getActiveEngine()!.getLayers().map((l) => l.name);
      expect(afterNames).toEqual(initialNames);

      // 8. No reorder history was committed.
      expect(ctx.ws.getActiveHistory()?.canUndo()).toBe(false);
    } finally {
      ctx.dispose();
    }
  });
});
