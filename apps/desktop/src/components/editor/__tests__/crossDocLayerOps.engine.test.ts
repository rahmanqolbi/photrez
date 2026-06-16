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

  it("places layer at target center for tab drop", () => {
    addLayerFromCrossDoc(
      basePayload,
      { type: "tab", docId: targetDocId },
      { x: 200, y: 150 },
      ws as unknown as WorkspaceFacade
    );

    const targetEngine = ws.getEngine(targetDocId)!;
    const cloned = targetEngine.getLayers().find((l) => l.name === "MyLogo")!;
    // tab target centers: (targetW - sourceW) / 2, (targetH - sourceH) / 2
    // targetDoc = 1000x800, source layer inherits docA = 800x600
    expect(cloned.transform.x).toBe(100);
    expect(cloned.transform.y).toBe(100);
  });
});
