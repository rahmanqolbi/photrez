import { describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { DragControllerProvider, useDragController } from "../DragController";
import { LayerItem } from "../LayerItem";
import type { LayerDragPayload } from "../dragTypes";
import { WorkspaceManager } from "@/engine/workspace";

// ponytail: LayerItem's "being dragged" highlight must reflect the
// dragController state directly. No pointer-based parallel signal
// system — `dragController.endDrag()` is the only "drag ended" path
// and SolidJS reactivity wires the visual to that single source of
// truth. This test pins that contract.
describe("LayerItem — dragController-bound visual", () => {
  function renderLayer() {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const session = WorkspaceManager.createBlankDocument("doc-test", "T", 200, 200);
    const engine = session.engine;
    engine.addLayer("Layer A");
    const layer = engine.getLayers()[0];
    const payload: LayerDragPayload = {
      version: 1,
      sourceDocId: "doc-test",
      layerId: layer.id,
      sourceName: layer.name,
      isAltPressed: false,
    };

    let dragRef: ReturnType<typeof useDragController> | null = null;
    const dispose = render(
      () => (
        <DragControllerProvider workspaceOverride={{ switchDocument: vi.fn() }}>
          {(() => {
            dragRef = useDragController();
            return (
              <LayerItem
                layer={layer}
                idx={0}
                isActive={false}
                isEditing={false}
                editName=""
                setEditingLayerId={vi.fn()}
                setEditName={vi.fn()}
                onSelect={vi.fn()}
                onToggleVisibility={vi.fn()}
                onToggleLock={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
                layersLength={1}
                workspace={
                  {
                    getActiveEngine: () => engine,
                    getActiveHistory: () => ({ commit: vi.fn() }),
                  } as any
                }
                scheduler={{ requestRender: vi.fn() } as any}
                activeDocumentId="doc-test"
              />
            );
          })()}
        </DragControllerProvider>
      ),
      container,
    );
    return {
      container,
      layer,
      payload,
      drag: () => dragRef!,
      dispose,
    };
  }

  it("applies 'being dragged' style while dragKind='layer' and payload matches this layer", () => {
    const ctx = renderLayer();
    try {
      const row = ctx.container.querySelector("[data-layer-idx='0']") as HTMLElement;
      expect(row.className).not.toMatch(/ring-editor-accent/);

      ctx.drag().beginLayerDrag(ctx.payload, null);
      expect(row.className).toMatch(/ring-editor-accent/);
    } finally {
      ctx.dispose();
      document.body.replaceChildren();
    }
  });

  it("clears 'being dragged' style when endDrag() is called (no parallel signal cleanup needed)", () => {
    const ctx = renderLayer();
    try {
      const row = ctx.container.querySelector("[data-layer-idx='0']") as HTMLElement;

      ctx.drag().beginLayerDrag(ctx.payload, null);
      expect(row.className).toMatch(/ring-editor-accent/);

      ctx.drag().endDrag();
      expect(row.className).not.toMatch(/ring-editor-accent/);
    } finally {
      ctx.dispose();
      document.body.replaceChildren();
    }
  });

  it("does not apply 'being dragged' style for other layers' payloads", () => {
    const ctx = renderLayer();
    try {
      const row = ctx.container.querySelector("[data-layer-idx='0']") as HTMLElement;

      ctx.drag().beginLayerDrag(
        { ...ctx.payload, layerId: "different-layer-id" },
        null,
      );
      expect(row.className).not.toMatch(/ring-editor-accent/);

      ctx.drag().endDrag();
    } finally {
      ctx.dispose();
      document.body.replaceChildren();
    }
  });
});