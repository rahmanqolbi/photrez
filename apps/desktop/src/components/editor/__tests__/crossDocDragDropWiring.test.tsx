// apps/desktop/src/components/editor/__tests__/crossDocDragDropWiring.test.tsx
//
// Wiring contract tests for cross-document drag-and-drop.
//
// What this catches: the "tests pass but app fails" pattern. Pure-function
// unit tests for addLayerFromCrossDoc / addFilesAsLayers / createNewDocsFromFiles
// pass, but the *wiring* from real user input to those functions is broken
// (Tauri listener not mounted globally, dragController state never set, etc).
//
// This file tests the wiring that connects:
//   - Tauri OS file drop ΓåÆ GlobalDragDropHost ΓåÆ dispatchTauriFileDrop
//   - Pure zone resolution: findDropZoneAtPoint by data attribute
//
// If any of these wirings break, the feature silently no-ops in the real app.
// See AI_HISTORY ┬º"[2026-06-16] BUG FIX ΓÇö Cross-Doc Drag-Drop Wiring".

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../shell/EditorContext";
import { WorkspaceManager } from "@/engine/workspace";
import { GlobalDragDropHost } from "../GlobalDragDropHost";
import { LayerItem } from "../layers/LayerItem";
import { DocumentTabsBar } from "../shell/DocumentTabsBar";
import { DragControllerProvider, useDragController } from "../DragController";
import { findDropZoneAtPoint, dispatchTauriFileDrop } from "../crossDocDropDispatch";
import { resetToasts } from "../Toast";
import type { LayerNode } from "@/engine/types";

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  Tauri webview mock ΓÇö captures the onDragDropEvent callback so tests can
//  fire OS file-drop events synchronously. Without this listener being
//  mounted globally, file drops silently no-op in the real app.
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const tauriState = vi.hoisted(() => ({
  capturedCallback: null as null | ((event: any) => void),
  unlisten: vi.fn(),
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: (cb: any) => {
      tauriState.capturedCallback = cb;
      return Promise.resolve(tauriState.unlisten);
    },
  }),
}));

vi.mock("@/tauri/native", () => ({
  readFileBytes: vi.fn().mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
}));

let mockElementFromPoint: ReturnType<typeof vi.fn>;
let originalCreateImageBitmap: typeof globalThis.createImageBitmap;

beforeEach(() => {
  tauriState.capturedCallback = null;
  tauriState.unlisten = vi.fn();
  originalCreateImageBitmap = globalThis.createImageBitmap;
  globalThis.createImageBitmap = vi.fn().mockResolvedValue({
    width: 100,
    height: 100,
    close: () => {},
  } as ImageBitmap);
  // jsdom 29 does not implement elementFromPoint — polyfill it on the
  // document instance so crossDocDropDispatch can call it.
  mockElementFromPoint = vi.fn().mockReturnValue(null);
  (document as any).elementFromPoint = mockElementFromPoint;
  resetToasts();
});

afterEach(() => {
  globalThis.createImageBitmap = originalCreateImageBitmap;
  vi.restoreAllMocks();
});

// ————————————————————————————————————————————————————————————————————————————
//  Pure function: findDropZoneAtPoint
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("findDropZoneAtPoint (zone resolution)", () => {
  it("returns 'canvas' when point is over a data-canvas-drop-zone element", () => {
    const el = document.createElement("div");
    el.setAttribute("data-canvas-drop-zone", "");
    mockElementFromPoint.mockReturnValue(el);
    expect(findDropZoneAtPoint(100, 100)).toEqual({ type: "canvas" });
  });

  it("returns 'layers-panel' when point is over a data-layers-panel-drop-zone", () => {
    const el = document.createElement("div");
    el.setAttribute("data-layers-panel-drop-zone", "");
    mockElementFromPoint.mockReturnValue(el);
    expect(findDropZoneAtPoint(100, 100)).toEqual({ type: "layers-panel" });
  });

  it("returns 'tab' with docId when point is over a data-document-tab", () => {
    const el = document.createElement("div");
    el.setAttribute("data-document-tab", "doc-abc");
    mockElementFromPoint.mockReturnValue(el);
    expect(findDropZoneAtPoint(100, 100)).toEqual({ type: "tab", docId: "doc-abc" });
  });

  it("returns 'tab-empty' when point is over the tab bar background", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tab-bar-empty", "");
    mockElementFromPoint.mockReturnValue(el);
    expect(findDropZoneAtPoint(100, 100)).toEqual({ type: "tab-empty" });
  });

  it("returns 'outside' when elementFromPoint returns null", () => {
    mockElementFromPoint.mockReturnValue(null);
    expect(findDropZoneAtPoint(100, 100)).toEqual({ type: "outside" });
  });

  it("walks up the DOM to find the nearest zone marker", () => {
    const zone = document.createElement("div");
    zone.setAttribute("data-canvas-drop-zone", "");
    const child = document.createElement("span");
    zone.appendChild(child);
    mockElementFromPoint.mockReturnValue(child);
    expect(findDropZoneAtPoint(0, 0)).toEqual({ type: "canvas" });
  });
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  Integration: GlobalDragDropHost is mounted + wires Tauri events to dispatch
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("GlobalDragDropHost wiring (Tauri OS file drop)", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;

  function renderWith(setupDocs: () => void) {
    ws = new WorkspaceManager();
    setupDocs();
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };

    container = document.createElement("div");
    document.body.appendChild(container);

    dispose = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={renderer}
          scheduler={scheduler}
        >
          <GlobalDragDropHost />
        </EditorProvider>
      ),
      container,
    );
  }

  const tick = (ms = 50) => new Promise<void>((r) => setTimeout(r, ms));

  it("subscribes to Tauri onDragDropEvent on mount (the bug that broke file drop)", async () => {
    renderWith(() => {});
    await tick();
    expect(tauriState.capturedCallback).not.toBeNull();
  });

  it("Tauri drop on canvas zone ΓåÆ addFilesAsLayers ΓåÆ active doc gains layer", async () => {
    renderWith(() => {
      const session = WorkspaceManager.createBlankDocument("wiring-canvas", "Canvas", 800, 600);
      ws.addDocument(session);
    });
    await tick();

    const canvasEl = document.createElement("div");
    canvasEl.setAttribute("data-canvas-drop-zone", "");
    mockElementFromPoint.mockReturnValue(canvasEl);

    tauriState.capturedCallback!({
      payload: { type: "drop", paths: ["/test.png"], position: { x: 400, y: 300 } },
    });
    await tick();
    await tick();

    const engine = ws.getEngine("wiring-canvas")!;
    expect(engine.getLayers().length).toBe(2); // bg + new layer
    expect(renderer.uploadImage).toHaveBeenCalled();
    expect(scheduler.requestRender).toHaveBeenCalled();
  });

  it("Tauri drop on layers-panel zone ΓåÆ addFilesAsLayers (same doc)", async () => {
    renderWith(() => {
      const session = WorkspaceManager.createBlankDocument("wiring-panel", "Panel", 800, 600);
      ws.addDocument(session);
    });
    await tick();

    const panelEl = document.createElement("div");
    panelEl.setAttribute("data-layers-panel-drop-zone", "");
    mockElementFromPoint.mockReturnValue(panelEl);

    tauriState.capturedCallback!({
      payload: { type: "drop", paths: ["/test.png"], position: { x: 50, y: 200 } },
    });
    await tick();
    await tick();

    const engine = ws.getEngine("wiring-panel")!;
    expect(engine.getLayers().length).toBe(2);
  });

  it("Tauri drop on a tab zone ΓåÆ addFilesAsLayers targeting that specific doc", async () => {
    renderWith(() => {
      const a = WorkspaceManager.createBlankDocument("doc-a", "A", 800, 600);
      const b = WorkspaceManager.createBlankDocument("doc-b", "B", 800, 600);
      ws.addDocument(a);
      ws.addDocument(b);
      ws.switchDocument("doc-a");
    });
    await tick();

    const tabEl = document.createElement("div");
    tabEl.setAttribute("data-document-tab", "doc-b");
    mockElementFromPoint.mockReturnValue(tabEl);

    tauriState.capturedCallback!({
      payload: { type: "drop", paths: ["/test.png"], position: { x: 100, y: 20 } },
    });
    await tick();
    await tick();

    expect(ws.getEngine("doc-b")!.getLayers().length).toBe(2);
    expect(ws.getEngine("doc-a")!.getLayers().length).toBe(1);
  });

  it("Tauri drop on tab-empty area ΓåÆ createNewDocsFromFiles (new doc)", async () => {
    renderWith(() => {
      const a = WorkspaceManager.createBlankDocument("existing", "Existing", 800, 600);
      ws.addDocument(a);
    });
    await tick();

    const tabBarEl = document.createElement("div");
    tabBarEl.setAttribute("data-tab-bar-empty", "");
    mockElementFromPoint.mockReturnValue(tabBarEl);

    tauriState.capturedCallback!({
      payload: { type: "drop", paths: ["/test.png"], position: { x: 500, y: 20 } },
    });
    await tick();
    await tick();

    expect(ws.getDocumentCount()).toBe(2);
  });

  it("Tauri drop on outside zone (no marker) ΓåÆ createNewDocsFromFiles", async () => {
    renderWith(() => {
      const a = WorkspaceManager.createBlankDocument("existing2", "Existing2", 800, 600);
      ws.addDocument(a);
    });
    await tick();

    mockElementFromPoint.mockReturnValue(null);

    tauriState.capturedCallback!({
      payload: { type: "drop", paths: ["/test.png"], position: { x: 0, y: 0 } },
    });
    await tick();
    await tick();

    expect(ws.getDocumentCount()).toBe(2);
  });
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  In-app layer drag wiring: LayerItem.onDragStart must call
//  dragController.beginLayerDrag so drop zones can read state.payload.
//  This was the OTHER half of the "feature doesn't work in real app" bug.
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("LayerItem wiring (in-app layer drag)", () => {
  let container: HTMLDivElement;
  let dispose: () => void;
  let probeRef: { current: ReturnType<typeof useDragController> | null };

  const mockLayer: LayerNode = {
    id: "layer-1",
    name: "Layer 1",
    type: "raster",
    visible: true,
    opacity: 1,
    locked: false,
    blendMode: "normal",
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
    width: 100,
    height: 100,
    imageBitmap: null,
  };

  function renderLayer() {
    probeRef = { current: null };
    container = document.createElement("div");
    document.body.appendChild(container);
    const Probe = () => {
      probeRef!.current = useDragController();
      return null;
    };
    dispose = render(
      () => (
        <DragControllerProvider workspaceOverride={{ switchDocument: vi.fn() }}>
          <LayerItem
            layer={mockLayer}
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
            workspace={{} as any}
            scheduler={{} as any}
            activeDocumentId="doc-source"
          />
          <Probe />
        </DragControllerProvider>
      ),
      container,
    );
  }

  function fireDragStart(el: Element, altKey = false) {
    const dt = {
      setData: vi.fn(),
      effectAllowed: "",
    } as any;
    const evt = new Event("dragstart", { bubbles: true, cancelable: true }) as any;
    evt.dataTransfer = dt;
    evt.altKey = altKey;
    el.dispatchEvent(evt);
    return dt;
  }

  it("onDragStart calls dragController.beginLayerDrag with the layer payload", () => {
    renderLayer();
    const layerEl = container.querySelector("[data-layer-idx='0']") as HTMLElement;
    expect(layerEl).not.toBeNull();
    fireDragStart(layerEl);
    const state = probeRef.current!.state();
    expect(state.dragKind).toBe("layer");
    expect(state.payload).toEqual({
      version: 1,
      sourceDocId: "doc-source",
      layerId: "layer-1",
      sourceName: "Layer 1",
      isAltPressed: false,
    });
  });

  it("onDragStart with Alt pressed sets isAltPressed=true (for Move vs Copy)", () => {
    renderLayer();
    const layerEl = container.querySelector("[data-layer-idx='0']") as HTMLElement;
    fireDragStart(layerEl, true);
    expect(probeRef.current!.state().payload?.isAltPressed).toBe(true);
  });

  it("onDragEnd clears dragController state (prevent orphan state)", () => {
    renderLayer();
    const layerEl = container.querySelector("[data-layer-idx='0']") as HTMLElement;
    fireDragStart(layerEl);
    expect(probeRef.current!.state().dragKind).toBe("layer");
    layerEl.dispatchEvent(new Event("dragend", { bubbles: true }));
    expect(probeRef.current!.state().dragKind).toBeNull();
  });

  it("onDragStart on locked layer does NOT begin a drag (early return)", () => {
    const lockedLayer: LayerNode = { ...mockLayer, locked: true };
    probeRef = { current: null };
    container = document.createElement("div");
    document.body.appendChild(container);
    const Probe = () => {
      probeRef!.current = useDragController();
      return null;
    };
    dispose = render(
      () => (
        <DragControllerProvider workspaceOverride={{ switchDocument: vi.fn() }}>
          <LayerItem
            layer={lockedLayer}
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
            workspace={{} as any}
            scheduler={{} as any}
            activeDocumentId="doc-source"
          />
          <Probe />
        </DragControllerProvider>
      ),
      container,
    );
    const layerEl = container.querySelector("[data-layer-idx='0']") as HTMLElement;
    // Locked layer is not draggable (LayerItem sets draggable={!locked}),
    // so the onDragStart should be a no-op even if dispatched manually.
    fireDragStart(layerEl);
    expect(probeRef.current!.state().dragKind).toBeNull();
  });
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  DocumentTabsBar wiring: handleTabDrop must handle BOTH file drag AND
//  layer drag. The previous code only handled file drag ΓåÆ layer drop on
//  tab was a silent no-op even though state.dragKind === "layer".
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("DocumentTabsBar wiring (tab drop with layer drag)", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;
  let probeRef: { current: ReturnType<typeof useDragController> | null };

  function renderTabs() {
    ws = new WorkspaceManager();
    const a = WorkspaceManager.createBlankDocument("doc-a", "A", 800, 600);
    const b = WorkspaceManager.createBlankDocument("doc-b", "B", 800, 600);
    ws.addDocument(a);
    ws.addDocument(b);
    ws.switchDocument("doc-a");
    // Add a layer to doc-a so we have something to drag
    const dragMeLayer = a.engine.addLayer("Drag Me");
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    probeRef = { current: null };
    container = document.createElement("div");
    document.body.appendChild(container);
    const Probe = () => {
      probeRef!.current = useDragController();
      return null;
    };
    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <DocumentTabsBar />
          <Probe />
        </EditorProvider>
      ),
      container,
    );
    return { dragMeLayerId: dragMeLayer.id };
  }

  const tick = (ms = 50) => new Promise<void>((r) => setTimeout(r, ms));

  function fireDrop(tabEl: Element) {
    const dt = { getData: vi.fn(), setData: vi.fn() } as any;
    const evt = new Event("drop", { bubbles: true, cancelable: true }) as any;
    evt.dataTransfer = dt;
    tabEl.dispatchEvent(evt);
  }

  it("drop on tab with layer state copies layer to target doc (the missing wiring)", async () => {
    const { dragMeLayerId } = renderTabs();
    await tick();

    probeRef.current!.beginLayerDrag(
      {
        version: 1,
        sourceDocId: "doc-a",
        layerId: dragMeLayerId,
        sourceName: "Drag Me",
        isAltPressed: false,
      },
      null,
    );

    const tabEl = container.querySelector('[data-document-tab="doc-b"]') as HTMLElement;
    expect(tabEl).not.toBeNull();
    fireDrop(tabEl);
    await tick();

    // The target doc should now have a new layer (bg + 1 copied layer = 2)
    const targetEngine = ws.getEngine("doc-b")!;
    expect(targetEngine.getLayers().length).toBe(2);
    // Source unchanged (default = copy, not move)
    expect(ws.getEngine("doc-a")!.getLayers().length).toBe(2);
    // The new layer is inserted above the bg (active layer); find by name to be
    // position-independent.
    const copied = targetEngine.getLayers().find(l => l.name === "Drag Me");
    expect(copied).toBeDefined();
  });

  it("drop on tab with Alt+drag MOVES layer from source to target", async () => {
    const { dragMeLayerId } = renderTabs();
    await tick();

    probeRef.current!.beginLayerDrag(
      {
        version: 1,
        sourceDocId: "doc-a",
        layerId: dragMeLayerId,
        sourceName: "Drag Me",
        isAltPressed: true,
      },
      null,
    );

    const tabEl = container.querySelector('[data-document-tab="doc-b"]') as HTMLElement;
    fireDrop(tabEl);
    await tick();

    // Source loses the layer (move)
    expect(ws.getEngine("doc-a")!.getLayers().length).toBe(1);
    // Target gains it (find by name to be position-independent)
    expect(ws.getEngine("doc-b")!.getLayers().length).toBe(2);
    expect(ws.getEngine("doc-b")!.getLayers().some(l => l.name === "Drag Me")).toBe(true);
  });

  it("drop on same-source tab is a no-op (same-doc drag prevented)", async () => {
    const { dragMeLayerId } = renderTabs();
    await tick();

    probeRef.current!.beginLayerDrag(
      {
        version: 1,
        sourceDocId: "doc-a",
        layerId: dragMeLayerId,
        sourceName: "Drag Me",
        isAltPressed: false,
      },
      null,
    );

    const sameTabEl = container.querySelector('[data-document-tab="doc-a"]') as HTMLElement;
    fireDrop(sameTabEl);
    await tick();

    // Both should be unchanged
    expect(ws.getEngine("doc-a")!.getLayers().length).toBe(2);
    expect(ws.getEngine("doc-b")!.getLayers().length).toBe(1);
  });
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  Hover-to-switch: dragover on a tab for 500ms must switch the active
//  document. This is the feature: "pas di drag ke tab maka akan terbuka
//  document yang satunya".
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("DocumentTabsBar wiring (hover-to-switch)", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;
  let probeRef: { current: any };

  function renderTabs() {
    ws = new WorkspaceManager();
    const a = WorkspaceManager.createBlankDocument("doc-a", "A", 800, 600);
    const b = WorkspaceManager.createBlankDocument("doc-b", "B", 800, 600);
    ws.addDocument(a);
    ws.addDocument(b);
    ws.switchDocument("doc-a");
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    probeRef = { current: null };
    container = document.createElement("div");
    document.body.appendChild(container);
    const Probe = () => {
      probeRef.current = { drag: useDragController(), editor: useEditor() };
      return null;
    };
    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <DocumentTabsBar />
          <Probe />
        </EditorProvider>
      ),
      container,
    );
  }

  function fireDragOver(tabEl: Element) {
    const dt = { types: ["application/x-photrez-layer"], setData: vi.fn() } as any;
    const evt = new Event("dragover", { bubbles: true, cancelable: true }) as any;
    evt.dataTransfer = dt;
    tabEl.dispatchEvent(evt);
  }

  it("dragover on a different tab sets dropTarget to that tab", async () => {
    renderTabs();
    const tabEl = container.querySelector('[data-document-tab="doc-b"]') as HTMLElement;
    fireDragOver(tabEl);
    const dropTarget = probeRef.current.drag.state().dropTarget;
    expect(dropTarget).toEqual({ type: "tab", docId: "doc-b" });
  });

  it("hovering over a different tab for 500ms switches through the real EditorProvider workspace", async () => {
    vi.useFakeTimers();
    try {
      renderTabs();
      expect(ws.getActiveDocumentId()).toBe("doc-a");

      const tabEl = container.querySelector('[data-document-tab="doc-b"]') as HTMLElement;
      fireDragOver(tabEl);
      expect(probeRef.current.drag.state().hoverTabId).toBe("doc-b");

      vi.advanceTimersByTime(500);
      expect(ws.getActiveDocumentId()).toBe("doc-b");
      expect(probeRef.current.drag.state().hoverTabId).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("dragleave on tab cancels the hover-to-switch timer", async () => {
    vi.useFakeTimers();
    try {
      renderTabs();
      const tabEl = container.querySelector('[data-document-tab="doc-b"]') as HTMLElement;
      fireDragOver(tabEl);
      expect(probeRef.current.drag.state().hoverTabId).toBe("doc-b");

      // Simulate leaving the tab ΓÇö no relatedTarget means we go off the tab
      const leaveEvt = new Event("dragleave", { bubbles: true, cancelable: true }) as any;
      leaveEvt.relatedTarget = null;
      Object.defineProperty(leaveEvt, "currentTarget", { value: tabEl });
      tabEl.dispatchEvent(leaveEvt);

      expect(probeRef.current.drag.state().hoverTabId).toBeNull();

      vi.advanceTimersByTime(500);
      expect(ws.getActiveDocumentId()).toBe("doc-a");
    } finally {
      vi.useRealTimers();
    }
  });
});
