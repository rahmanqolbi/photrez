import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { useLayerDragReorder } from "../useLayerDragReorder";
import { WorkspaceManager } from "@/engine/workspace";

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
    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          {(() => {
            api = useLayerDragReorder();
            api.setLayerListRef(list);
            return null;
          })()}
        </EditorProvider>
      ),
      container,
    );

    return { ws, scheduler, list, dispose, api: () => api! };
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
});
