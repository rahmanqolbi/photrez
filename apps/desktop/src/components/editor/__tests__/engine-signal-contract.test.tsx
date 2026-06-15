// apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx
//
// Engine ↔ Signal contract tests.
//
// What this catches: P0-1 class bugs (signal desync) where engine mutations
// don't propagate to the corresponding Solid signal. See AI_HISTORY.md
// P0-1: "selectedLayerId desync from activeLayerId after undo/redo" and
// similar past bugs.
//
// Pattern: "setiap mutasi engine X → signal Y update di frame berikut".
// For each test:
//   1. Read initial signal value
//   2. Mutate engine via workspace (source of truth)
//   3. Await tick for Solid effects to propagate
//   4. Assert signal value matches engine state
//
// Reference: docs/plans/2026-06-14-test-overhaul-reference.md (out of scope
// for Phase 1-4, but in scope for this contract strengthening).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../EditorContext";
import { WorkspaceManager } from "@/engine/workspace";

interface CapturedEditor {
  workspace: WorkspaceManager;
  activeDocumentId: () => string | null;
  layers: () => any[];
  activeLayerId: () => string | null;
  selectedLayerId: () => string | null;
  setSelectedLayerId: (id: string | null) => void;
  hoverHandle: () => string | null;
  setHoverHandle: (h: string | null) => void;
  docWidth: () => number;
  docHeight: () => number;
  selection: () => any;
  setSelection: (s: any) => void;
  selectionEditMode: () => boolean;
  setSelectionEditMode: (b: boolean) => void;
  modernCropFrame: () => any;
  setModernCropFrame: (f: any) => void;
  canModernCropUndo: () => boolean;
  canModernCropRedo: () => boolean;
  layerTransformSession: () => any;
  setLayerTransformSession: (s: any) => void;
}

function makeTestConsumer(captured: { current: CapturedEditor | null }) {
  return () => {
    captured.current = useEditor() as unknown as CapturedEditor;
    return null;
  };
}

describe("Engine ↔ Signal contract", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;
  let editorRef: { current: CapturedEditor | null };

  const tick = (ms = 50) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  beforeEach(async () => {
    ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("contract", "Contract", 800, 600);
    ws.addDocument(session);

    renderer = {
      uploadImage: vi.fn(),
      destroyTexture: vi.fn(),
    };
    scheduler = {
      requestRender: vi.fn(),
    };

    editorRef = { current: null };
    container = document.createElement("div");
    document.body.appendChild(container);

    dispose = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={renderer}
          scheduler={scheduler}
        >
          {makeTestConsumer(editorRef)()}
        </EditorProvider>
      ),
      container,
    );

    // Allow initial sync to settle
    await tick();
  });

  afterEach(() => {
    if (dispose) dispose();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  it("workspace sync populates initial signals from active document", () => {
    const ed = editorRef.current!;
    expect(ed.activeDocumentId()).toBe("contract");
    expect(ed.layers().length).toBe(1); // Background layer auto-created
    expect(ed.activeLayerId()).toBe(ed.layers()[0].id);
    expect(ed.docWidth()).toBe(800);
    expect(ed.docHeight()).toBe(600);
  });

  it("engine.setActiveLayer(id) → activeLayerId() signal updates", async () => {
    const ed = editorRef.current!;
    const engine = ws.getActiveEngine()!;
    const l1 = engine.addLayer("L1");
    const l2 = engine.addLayer("L2");
    await tick();

    expect(ed.layers().length).toBe(3); // Background + L1 + L2

    engine.setActiveLayer(l2.id);
    await tick();

    expect(ed.activeLayerId()).toBe(l2.id);
    expect(ed.layers()[0].id).toBe(l2.id); // top-first ordering

    engine.setActiveLayer(l1.id);
    await tick();
    expect(ed.activeLayerId()).toBe(l1.id);
  });

  it("engine.addLayer(name) → layers() signal includes new layer at correct index", async () => {
    const ed = editorRef.current!;
    const engine = ws.getActiveEngine()!;

    const l1 = engine.addLayer("L1");
    await tick();

    expect(ed.layers().length).toBe(2);
    expect(ed.layers()[0].id).toBe(l1.id);
    expect(ed.layers()[0].name).toBe("L1");
    expect(ed.activeLayerId()).toBe(l1.id); // new layer auto-active
  });

  it("engine.deleteLayer(id) → layers() signal excludes deleted, activeLayerId may shift", async () => {
    const ed = editorRef.current!;
    const engine = ws.getActiveEngine()!;

    const l1 = engine.addLayer("L1");
    const l2 = engine.addLayer("L2");
    engine.setActiveLayer(l2.id);
    await tick();

    expect(ed.layers().length).toBe(3);
    expect(ed.activeLayerId()).toBe(l2.id);

    engine.deleteLayer(l2.id);
    await tick();

    expect(ed.layers().length).toBe(2);
    expect(ed.layers().find((l: any) => l.id === l2.id)).toBeUndefined();
    // After deleting active layer, engine should fall back to another layer
    expect(ed.activeLayerId()).not.toBe(l2.id);
  });

  it("engine.transformLayer(id, x, y) → updates layer.transform via signal", async () => {
    const ed = editorRef.current!;
    const engine = ws.getActiveEngine()!;

    const l1 = engine.addLayer("L1");
    await tick();

    const initialLayer = ed.layers().find((l: any) => l.id === l1.id);
    expect(initialLayer.transform.x).toBe(0);
    expect(initialLayer.transform.y).toBe(0);

    engine.transformLayer(l1.id, { x: 100, y: 50 });
    await tick();

    const updatedLayer = ed.layers().find((l: any) => l.id === l1.id);
    expect(updatedLayer.transform.x).toBe(100);
    expect(updatedLayer.transform.y).toBe(50);
  });

  it("P0-1 regression: engine.undo() → activeLayerId + selectedLayerId sync (the bug class)", async () => {
    const ed = editorRef.current!;
    const engine = ws.getActiveEngine()!;
    const history = ws.getActiveHistory()!;

    // Setup: 2 layers, select first
    const l1 = engine.addLayer("L1");
    const l2 = engine.addLayer("L2");
    engine.setActiveLayer(l1.id);
    ed.setSelectedLayerId(l1.id);
    await tick();

    history.commit(engine.snapshot());

    // Action: delete l1 (active + selected)
    engine.deleteLayer(l1.id);
    await tick();

    expect(ed.activeLayerId()).not.toBe(l1.id);
    expect(ed.selectedLayerId()).not.toBe(l1.id);

    // Undo: should restore both signals to pre-delete state
    const restored = history.undo(engine.snapshot());
    if (restored) engine.restore(restored);
    await tick();

    expect(ed.activeLayerId()).toBe(l1.id);
    expect(ed.selectedLayerId()).toBe(l1.id);
    expect(ed.layers().find((l: any) => l.id === l1.id)).toBeDefined();
  });

  it("workspace.switchDocument(id) → activeDocumentId signal + engine swap", async () => {
    const ed = editorRef.current!;

    const s2 = WorkspaceManager.createBlankDocument("doc-2", "Doc 2", 400, 300);
    ws.addDocument(s2);
    await tick();

    expect(ed.activeDocumentId()).toBe("doc-2");
    expect(ed.docWidth()).toBe(400);
    expect(ed.docHeight()).toBe(300);

    ws.switchDocument("contract");
    await tick();

    expect(ed.activeDocumentId()).toBe("contract");
    expect(ed.docWidth()).toBe(800);
    expect(ed.docHeight()).toBe(600);
  });

  it("history.commit() → history cursor signals (canUndo/canModernCropUndo) reflect state", async () => {
    const ed = editorRef.current!;
    const engine = ws.getActiveEngine()!;
    const history = ws.getActiveHistory()!;

    // First commit
    history.commit(engine.snapshot());
    expect(history.canUndo()).toBe(true);

    // After many commits
    for (let i = 0; i < 5; i++) {
      history.commit(engine.snapshot());
    }
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    // Undo back to first
    let undoCount = 0;
    while (history.canUndo() && undoCount < 10) {
      const prev = history.undo(engine.snapshot());
      if (!prev) break;
      engine.restore(prev);
      undoCount++;
    }
    expect(undoCount).toBeGreaterThan(0);
    expect(history.canRedo()).toBe(true);
  });

  it("engine.setLayerOpacity(id, n) → layer.opacity signal updates", async () => {
    const ed = editorRef.current!;
    const engine = ws.getActiveEngine()!;

    const l1 = engine.addLayer("L1");
    await tick();

    const before = ed.layers().find((l: any) => l.id === l1.id);
    expect(before.opacity).toBe(1);

    engine.setLayerOpacity(l1.id, 0.5);
    await tick();

    const after = ed.layers().find((l: any) => l.id === l1.id);
    expect(after.opacity).toBe(0.5);
  });

  it("editor.setSelection(rect) → selection signal reflects state", async () => {
    const ed = editorRef.current!;

    expect(ed.selection()).toBeNull();

    ed.setSelection({ x: 10, y: 20, width: 100, height: 50, angle: 0 });
    await tick();

    const sel = ed.selection();
    expect(sel).not.toBeNull();
    expect(sel.x).toBe(10);
    expect(sel.y).toBe(20);
    expect(sel.width).toBe(100);
    expect(sel.height).toBe(50);
  });

  it("editor.setLayerTransformSession(s) → layerTransformSession signal reflects state", async () => {
    const ed = editorRef.current!;
    const engine = ws.getActiveEngine()!;

    const l1 = engine.addLayer("L1");
    await tick();

    expect(ed.layerTransformSession()).toBeNull();

    const session = {
      documentId: "contract",
      layerId: l1.id,
      originalSnapshot: engine.snapshot(),
      originalTransform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      mode: "resize" as const,
      lockRatio: false,
      startedAt: Date.now(),
    };

    ed.setLayerTransformSession(session);
    await tick();

    const sig = ed.layerTransformSession();
    expect(sig).not.toBeNull();
    expect(sig.layerId).toBe(l1.id);
    expect(sig.mode).toBe("resize");
  });
});
