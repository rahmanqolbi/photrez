// apps/desktop/src/components/editor/__tests__/crossDocLayerOps.engine.test.ts
//
// Integration test: cross-doc layer ops against the REAL DocumentEngine
// (no mocks). This catches the bug class that mocked-engine unit tests miss:
//  - Mock engines accept any args; real engines enforce invariants
//  - Mock engines don't have setLayerBlendMode, setLayerOpacity, etc.
//  - Real engines use addLayer(name, w?, h?) — only name + size set
//  - Other properties (opacity, blend mode, transform, lock, visibility)
//    must be set explicitly via setters
//
// Reference: AGENTS.md §Definition of Done for a New Tool + test-overhaul
// §"every new tool passes unit test but fails in frontend" pattern.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WorkspaceManager } from "@/engine/workspace";
import { addLayerFromCrossDoc, addFilesAsLayers, createNewDocsFromFiles, type WorkspaceFacade } from "../crossDocLayerOps";
import type { LayerDragPayload } from "../dragTypes";
import { resetToasts } from "../Toast";

const nativeMock = vi.hoisted(() => ({
  readFileBytes: vi.fn(),
}));

vi.mock("@/tauri/native", () => ({
  readFileBytes: nativeMock.readFileBytes,
}));

// Note: we deliberately do NOT mock Toast — the real toast side effects must
// work with the real engine. If a test triggers an unexpected error toast,
// that's a real signal to investigate.

describe("addLayerFromCrossDoc — real engine integration", () => {
  let ws: WorkspaceManager;
  let sourceDocId: string;
  let targetDocId: string;
  let sourceLayerId: string;
  let basePayload: LayerDragPayload;

  beforeEach(() => {
    resetToasts();
    nativeMock.readFileBytes.mockResolvedValue(new Uint8Array([1, 2, 3]));
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 100, height: 100 } as ImageBitmap);
    ws = new WorkspaceManager();
    const sA = WorkspaceManager.createBlankDocument("docA", "DocA", 800, 600);
    ws.addDocument(sA);
    const sB = WorkspaceManager.createBlankDocument("docB", "DocB", 1000, 800);
    ws.addDocument(sB);
    ws.switchDocument("docA");
    sourceDocId = "docA";
    targetDocId = "docB";

    // Create a source layer with ALL properties non-default
    const engineA = ws.getEngine("docA")!;
    const layer = engineA.addLayer("MyLogo");
    engineA.setLayerOpacity(layer.id, 0.42);
    engineA.setLayerBlendMode(layer.id, "multiply");
    engineA.setLayerLocked(layer.id, false);
    engineA.setLayerVisibility(layer.id, true);
    engineA.transformLayer(layer.id, {
      x: 50,
      y: 75,
      scaleX: 1.5,
      scaleY: 0.5,
      rotation: 30,
    });
    sourceLayerId = layer.id;

    basePayload = {
      version: 1,
      sourceDocId: "docA",
      layerId: sourceLayerId,
      sourceName: "MyLogo",
      isAltPressed: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves opacity when copying across documents", () => {
    const before = ws.getEngine(sourceDocId)!.getLayer(sourceLayerId)!;
    expect(before.opacity).toBe(0.42);

    addLayerFromCrossDoc(
      basePayload,
      { type: "tab", docId: targetDocId },
      { x: 0, y: 0 },
      ws as unknown as WorkspaceFacade
    );

    const targetEngine = ws.getEngine(targetDocId)!;
    const targetLayers = targetEngine.getLayers();
    const cloned = targetLayers.find((l) => l.name === "MyLogo")!;
    expect(cloned).toBeDefined();
    expect(cloned.opacity).toBe(0.42);
  });

  it("preserves blend mode when copying across documents", () => {
    addLayerFromCrossDoc(
      basePayload,
      { type: "tab", docId: targetDocId },
      { x: 0, y: 0 },
      ws as unknown as WorkspaceFacade
    );

    const targetEngine = ws.getEngine(targetDocId)!;
    const cloned = targetEngine.getLayers().find((l) => l.name === "MyLogo")!;
    expect(cloned.blendMode).toBe("multiply");
  });

  it("preserves visibility when copying across documents", () => {
    const sourceEngine = ws.getEngine(sourceDocId)!;
    sourceEngine.setLayerVisibility(sourceLayerId, false);

    addLayerFromCrossDoc(
      basePayload,
      { type: "tab", docId: targetDocId },
      { x: 0, y: 0 },
      ws as unknown as WorkspaceFacade
    );

    const targetEngine = ws.getEngine(targetDocId)!;
    const cloned = targetEngine.getLayers().find((l) => l.name === "MyLogo")!;
    expect(cloned.visible).toBe(false);
  });

  it("preserves size (width/height) of source layer", () => {
    // Source layer "MyLogo" was created via addLayer(name) which uses doc size.
    // For real size preservation, we'd need to set the size differently.
    // This test documents the expected behavior: size should match source.
    const sourceEngine = ws.getEngine(sourceDocId)!;
    const source = sourceEngine.getLayer(sourceLayerId)!;
    expect(source.width).toBe(800);  // doc width
    expect(source.height).toBe(600); // doc height

    addLayerFromCrossDoc(
      basePayload,
      { type: "tab", docId: targetDocId },
      { x: 0, y: 0 },
      ws as unknown as WorkspaceFacade
    );

    const targetEngine = ws.getEngine(targetDocId)!;
    const cloned = targetEngine.getLayers().find((l) => l.name === "MyLogo")!;
    expect(cloned.width).toBe(800);
    expect(cloned.height).toBe(600);
  });

  it("places layer at cursor pos for tab drop (editor-standard: user aims the landing position)", () => {
    addLayerFromCrossDoc(
      basePayload,
      { type: "tab", docId: targetDocId },
      { x: 333, y: 444 },
      ws as unknown as WorkspaceFacade
    );

    const targetEngine = ws.getEngine(targetDocId)!;
    const cloned = targetEngine.getLayers().find((l) => l.name === "MyLogo")!;
    expect(cloned.transform.x).toBe(333);
    expect(cloned.transform.y).toBe(444);
  });

  it("transfers source layer's bitmap to the cloned layer (regression: empty-layer bug)", () => {
    // User-reported bug: cross-doc copy created a layer with the right
    // name and size, but no bitmap — the new layer looked empty. The
    // addLayerFromCrossDoc path forgot to call setLayerImageBitmap.
    const sourceEngine = ws.getEngine(sourceDocId)!;
    const fakeBitmap = { width: 200, height: 150, __tag: "source-bitmap" } as unknown as ImageBitmap;
    sourceEngine.setLayerImageBitmap(sourceLayerId, fakeBitmap);

    addLayerFromCrossDoc(
      basePayload,
      { type: "tab", docId: targetDocId },
      { x: 0, y: 0 },
      ws as unknown as WorkspaceFacade
    );

    const targetEngine = ws.getEngine(targetDocId)!;
    const cloned = targetEngine.getLayers().find((l) => l.name === "MyLogo")!;
    expect(cloned).toBeDefined();
    expect(cloned.imageBitmap).toBe(fakeBitmap);
  });

  it("does not copy to target when Alt-moving the source document's last layer", () => {
    const sourceEngine = ws.getEngine(sourceDocId)!;
    const targetEngine = ws.getEngine(targetDocId)!;
    sourceEngine.deleteLayer(sourceLayerId);
    const onlyLayer = sourceEngine.getLayers()[0];
    const targetLayerCount = targetEngine.getLayers().length;

    const result = addLayerFromCrossDoc(
      { ...basePayload, layerId: onlyLayer.id, sourceName: onlyLayer.name, isAltPressed: true },
      { type: "tab", docId: targetDocId },
      { x: 0, y: 0 },
      ws
    );

    expect(result.newLayerId).toBeNull();
    expect(sourceEngine.getLayers()).toHaveLength(1);
    expect(targetEngine.getLayers()).toHaveLength(targetLayerCount);
  });
});

describe("addFilesAsLayers — real engine decode-first contract", () => {
  let ws: WorkspaceManager;

  beforeEach(() => {
    resetToasts();
    ws = new WorkspaceManager();
    ws.addDocument(WorkspaceManager.createBlankDocument("docA", "DocA", 800, 600));
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 100, height: 100 } as ImageBitmap);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not commit history or create empty layers when any file fails before mutation", async () => {
    const engine = ws.getEngine("docA")!;
    const history = ws.getHistory("docA")!;
    const commitSpy = vi.spyOn(history, "commit");
    const initialLayerCount = engine.getLayers().length;

    nativeMock.readFileBytes.mockImplementation(async (path: string) => {
      if (path.includes("bad")) throw new Error("decode failed");
      return new Uint8Array([1, 2, 3]);
    });

    const created = await addFilesAsLayers(
      ["/ok.png", "/bad.png"],
      { type: "canvas" },
      { x: 12, y: 34 },
      ws
    );

    expect(created).toEqual([]);
    expect(engine.getLayers().length).toBe(initialLayerCount);
    expect(commitSpy).not.toHaveBeenCalled();
  });
});
