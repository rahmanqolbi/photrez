// apps/desktop/src/components/editor/layers/__tests__/layerOperations.test.ts
//
// Contract tests for layerOperations.ts — pure functions operating on a
// real DocumentEngine.  If these break, layer merge/flatten silently fail
// (user clicks "Merge Down" → nothing happens).

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { DocumentEngine } from "@/engine/document";
import { CommandHistory } from "@/engine/history";
import { mergeActiveLayerDown, flattenAllLayers } from "../layerOperations";
import type { WebGL2Backend } from "@/renderer/webgl2";

// Polyfill OffscreenCanvas for jsdom — DocumentEngine.mergeDown and
// flattenLayers use OffscreenCanvas internally for pixel compositing.
// The 2D context mock must support all operations used by drawLayerToContext:
// save, restore, translate, rotate, scale, globalAlpha, globalCompositeOperation, drawImage.
const OriginalOffscreenCanvas = (globalThis as any).OffscreenCanvas;
beforeAll(() => {
  if (typeof OffscreenCanvas === "undefined") {
    (globalThis as any).OffscreenCanvas = class {
      width: number;
      height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() {
        return {
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          scale: vi.fn(),
          drawImage: vi.fn(),
          globalAlpha: 1,
          globalCompositeOperation: "source-over",
          canvas: this,
        } as any;
      }
      transferToImageBitmap() {
        return { width: this.width, height: this.height, close: vi.fn() } as unknown as ImageBitmap;
      }
    };
  }
});
afterAll(() => {
  if (OriginalOffscreenCanvas) {
    (globalThis as any).OffscreenCanvas = OriginalOffscreenCanvas;
  }
});

function makeMockRenderer(): WebGL2Backend {
  return {
    uploadImage: vi.fn(),
    destroyTexture: vi.fn(),
    render: vi.fn(),
    resizeToViewport: vi.fn(),
    getWebGLContext: vi.fn(),
  } as unknown as WebGL2Backend;
}

function makeBitmap(width = 100, height = 100): ImageBitmap {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

describe("mergeActiveLayerDown", () => {
  let engine: DocumentEngine;
  let history: CommandHistory;
  let renderer: WebGL2Backend;

  beforeEach(() => {
    engine = new DocumentEngine("doc-1", "Test", 200, 200);
    history = new CommandHistory();
    renderer = makeMockRenderer();
  });

  it("merges active layer into the layer below it", () => {
    // addLayer inserts BEFORE the active layer and auto-sets active.
    // Bottom first, then Top → layers = [Top, Bottom], active = Top.
    const bottom = engine.addLayer("Bottom", 100, 100);
    const top = engine.addLayer("Top", 100, 100);
    const topBitmap = makeBitmap();
    const bottomBitmap = makeBitmap();
    engine.setLayerImageBitmap(top.id, topBitmap);
    engine.setLayerImageBitmap(bottom.id, bottomBitmap);

    const result = mergeActiveLayerDown(engine, history, renderer, top.id);

    expect(result).toBe(true);
    // After merge, only the bottom layer remains (top was merged into it)
    const layers = engine.getLayers();
    expect(layers).toHaveLength(1);
    expect(history.getUndoCount()).toBe(1);
    // Top layer bitmap was destroyed in renderer
    expect(renderer.destroyTexture).toHaveBeenCalledWith(top.id);
    expect(renderer.destroyTexture).toHaveBeenCalledWith(bottom.id);
    // Merged layer bitmap was uploaded
    expect(renderer.uploadImage).toHaveBeenCalled();
  });

  it("returns false when active layer is the bottom-most layer (no layer below)", () => {
    engine.addLayer("Only", 100, 100);
    const onlyId = engine.getLayers()[0].id;
    engine.setActiveLayer(onlyId);

    const result = mergeActiveLayerDown(engine, history, renderer, onlyId);

    expect(result).toBe(false);
    expect(history.getUndoCount()).toBe(0);
    expect(renderer.destroyTexture).not.toHaveBeenCalled();
  });

  it("does nothing when activeId is missing from engine", () => {
    const result = mergeActiveLayerDown(engine, history, renderer, "non-existent");

    expect(result).toBe(false);
    expect(history.getUndoCount()).toBe(0);
  });
});

describe("flattenAllLayers", () => {
  let engine: DocumentEngine;
  let history: CommandHistory;
  let renderer: WebGL2Backend;

  beforeEach(() => {
    engine = new DocumentEngine("doc-1", "Test", 200, 200);
    history = new CommandHistory();
    renderer = makeMockRenderer();
  });

  it("flattens multiple layers into one", () => {
    const l1 = engine.addLayer("Layer 1", 100, 100);
    const l2 = engine.addLayer("Layer 2", 100, 100);
    const l3 = engine.addLayer("Layer 3", 100, 100);
    engine.setLayerImageBitmap(l1.id, makeBitmap());
    engine.setLayerImageBitmap(l2.id, makeBitmap());
    engine.setLayerImageBitmap(l3.id, makeBitmap());

    const result = flattenAllLayers(engine, history, renderer);

    expect(result).toBe(true);
    // All layers flattened into one (no separate background layer)
    const layers = engine.getLayers();
    expect(layers).toHaveLength(1);
    expect(history.getUndoCount()).toBe(1);
    // Each old layer's texture was destroyed
    expect(renderer.destroyTexture).toHaveBeenCalledWith(l1.id);
    expect(renderer.destroyTexture).toHaveBeenCalledWith(l2.id);
    expect(renderer.destroyTexture).toHaveBeenCalledWith(l3.id);
    // Flattened bitmap uploaded
    expect(renderer.uploadImage).toHaveBeenCalledTimes(1);
  });

  it("returns false when there is only the background layer (nothing to flatten)", () => {
    const result = flattenAllLayers(engine, history, renderer);

    expect(result).toBe(false);
    expect(history.getUndoCount()).toBe(0);
    expect(renderer.destroyTexture).not.toHaveBeenCalled();
    expect(renderer.uploadImage).not.toHaveBeenCalled();
  });

  it("commits history before flattening (undo restores pre-flatten state)", () => {
    engine.addLayer("L1", 100, 100);
    engine.addLayer("L2", 100, 100);
    const preFlattenSnapshot = engine.snapshot();

    flattenAllLayers(engine, history, renderer);

    // Undo should restore exactly the pre-flatten state
    engine.restore(history.undo(engine.snapshot())!);
    const restoredLayers = engine.getLayers();
    expect(restoredLayers).toHaveLength(preFlattenSnapshot.layers.length);
  });
});

// ─────────────────────────────────────────────────────────────
//  useLayerActions wiring test — mount the hook inside a
//  mock EditorProvider and verify each action produces the
//  expected engine + history + renderer side effects.
// ─────────────────────────────────────────────────────────────

// (OffscreenCanvas polyfill is at the top of the file — covers all tests)

import { renderHook } from "@solidjs/testing-library";
import { EditorProvider, useEditor } from "../../shell/EditorContext";
import { useLayerActions } from "../useLayerActions";
import { WorkspaceManager } from "@/engine/workspace";
import { DialogProvider } from "../../dialogs/DialogProvider";

describe("useLayerActions wiring", () => {
  function createWrapper() {
    const ws = new WorkspaceManager();
    ws.addDocument(WorkspaceManager.createBlankDocument("doc-a", "DocA", 800, 600));
    ws.switchDocument("doc-a");
    const engine = ws.getEngine("doc-a")!;
    const history = ws.getHistory("doc-a")!;
    const renderer = makeMockRenderer();
    const scheduler = { requestRender: vi.fn() };

    const wrapper = (props: { children: any }) => (
      <DialogProvider>
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          {props.children}
        </EditorProvider>
      </DialogProvider>
    );

    return { ws, engine, history, renderer, scheduler, wrapper };
  }

  it("handleAddLayer creates a new layer and commits history", () => {
    const { engine, history, wrapper } = createWrapper();
    const { result } = renderHook(() => useLayerActions(), { wrapper });

    const beforeCount = engine.getLayers().length;
    result.handleAddLayer();

    expect(engine.getLayers()).toHaveLength(beforeCount + 1);
    expect(history.getUndoCount()).toBe(1);
  });

  it("handleDuplicateActiveLayer duplicates the active layer", () => {
    const { engine, history, renderer, wrapper } = createWrapper();
    engine.addLayer("Source", 100, 100);
    const src = engine.getLayers().find(l => l.name === "Source")!;
    engine.setActiveLayer(src.id);
    engine.setLayerImageBitmap(src.id, makeBitmap());

    const { result } = renderHook(() => useLayerActions(), { wrapper });

    result.handleDuplicateActiveLayer();

    const layers = engine.getLayers();
    const dup = layers.find(l => l.name === "Source copy");
    expect(dup).toBeDefined();
    expect(history.getUndoCount()).toBe(1);
    // Duplicated layer bitmap was uploaded
    expect(renderer.uploadImage).toHaveBeenCalledWith(dup!.id, dup!.imageBitmap);
  });

  it("handleSelectLayer calls setActiveLayer", () => {
    const { engine, wrapper } = createWrapper();
    engine.addLayer("Target", 100, 100);
    const target = engine.getLayers().find(l => l.name === "Target")!;

    const { result } = renderHook(() => useLayerActions(), { wrapper });

    result.handleSelectLayer(target.id);

    expect(engine.getActiveLayerId()).toBe(target.id);
  });

  it("handleMoveUp and handleMoveDown reorder layers", () => {
    const { engine, history, scheduler, wrapper } = createWrapper();
    // addLayer inserts BEFORE the active layer. Add Top first, then Bottom
    // so Top ends up at index 1 (below Bottom), making handleMoveUp valid.
    engine.addLayer("Top", 100, 100);
    engine.addLayer("Bottom", 100, 100);
    const layers = engine.getLayers();
    const topIdx = layers.findIndex(l => l.name === "Top");

    const { result } = renderHook(() => useLayerActions(), { wrapper });

    result.handleMoveUp({ stopPropagation: vi.fn() } as any, topIdx);

    // The top layer should now be above the bottom layer
    const afterUp = engine.getLayers();
    expect(afterUp[0].name).toBe("Top");
    expect(history.getUndoCount()).toBe(1);
    expect(scheduler.requestRender).toHaveBeenCalled();
  });

  it("handleMergeActiveLayerDown calls the underlying merge function", () => {
    const { engine, history, renderer, scheduler, wrapper } = createWrapper();
    const top = engine.addLayer("Top", 100, 100);
    const bottom = engine.addLayer("Bottom", 100, 100);
    engine.setActiveLayer(top.id);
    engine.setLayerImageBitmap(top.id, makeBitmap());
    engine.setLayerImageBitmap(bottom.id, makeBitmap());

    const { result } = renderHook(() => useLayerActions(), { wrapper });

    result.handleMergeActiveLayerDown();

    expect(history.getUndoCount()).toBe(1);
    expect(scheduler.requestRender).toHaveBeenCalled();
  });
});
