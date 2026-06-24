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
  // still running), the in-panel pointer drag abandons. The abandon
  // branch must clear all drag signals â€” otherwise the source layer
  // stays visually "stuck" as dragged until the next pointerup cycle
  // (the pointerup listener is removed in the abandon branch, so its
  // cleanup block never runs).
  it("clears drag state when HTML5 drag activates during pointer drag (no stuck visual)", () => {
    const ctx = setup();
    try {
      const rows = ctx.list.querySelectorAll<HTMLElement>("[data-layer-idx]");
      rows[0].addEventListener("pointerdown", (e) => ctx.api().handlePointerDragStart(e as PointerEvent, 0));

      // 1. Pointer down on row 0 (Top).
      rows[0].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientY: 10 }));

      // 2. Move past dead-zone â€” this sets draggedIndex(0).
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, button: 0, clientY: 80 }));
      expect(ctx.api().draggedIndex()).toBe(0);

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

      // 4. Next pointermove detects dragKind !== null â†’ abandons.
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, button: 0, clientY: 120 }));

// 5. Critical: draggedIndex must be cleared so the source
      //    layer is not visually stuck.
      expect(ctx.api().draggedIndex()).toBeNull();
      expect(ctx.api().dragOverIndex()).toBeNull();
      expect(ctx.api().dropPosition()).toBeNull();

      // 6. pointerup fires later — but the listener was removed in
      //    the abandon branch. Simulate a delayed mouse release to
      //    prove it does not crash.
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, clientY: 120 }));
    } finally {
      ctx.dispose();
    }
  });

  // Regression: real-browser flow where HTML5 drag fires AFTER
  // pointer-based drag is already active, and the user releases the
  // mouse WITHOUT moving further (so no second pointermove fires).
  // The createEffect that watches dragController.state().dragKind
  // must fire on dragend → endDrag → dragKind=null and clear all
  // drag signals. This pins the regression where the source layer
  // stayed visually "stuck" as dragged until the next click.
  it("clears drag state via reactive effect when HTML5 drag completes without a second pointermove", async () => {
    const ctx = setup();
    try {
      const rows = ctx.list.querySelectorAll<HTMLElement>("[data-layer-idx]");
      rows[0].addEventListener("pointerdown", (e) => ctx.api().handlePointerDragStart(e as PointerEvent, 0));

      // 1. Pointer down on row 0.
      rows[0].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientY: 10 }));

      // 2. Move past dead-zone — this sets draggedIndex(0).
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, button: 0, clientY: 80 }));
      expect(ctx.api().draggedIndex()).toBe(0);

      // 3. HTML5 drag fires. After this, no more pointermove events
      //    fire because the browser captures pointer for HTML5 drag.
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

      // 4. User drops and releases — dragend fires → endDrag() →
      //    dragKind = null. No second pointermove fires.
      ctx.drag().endDrag();

      // 5. Reactive effect should detect dragKind === null and clear
      //    all drag signals. Solid effects run async (microtask).
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 6. Critical: draggedIndex must be cleared so the source
      //    layer is not visually stuck.
      expect(ctx.api().draggedIndex()).toBeNull();
      expect(ctx.api().dragOverIndex()).toBeNull();
expect(ctx.api().dropPosition()).toBeNull();
    } finally {
      ctx.dispose();
    }
  });
});
