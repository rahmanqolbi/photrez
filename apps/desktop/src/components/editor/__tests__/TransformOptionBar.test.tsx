import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { TransformOptionBar } from "../TransformOptionBar";
import * as EditorContextModule from "../shell/EditorContext";

describe("TransformOptionBar", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Transform pill, mode badge, Apply, Cancel when session exists", () => {
    const [layerTransformSession, setLayerTransformSession] = createSignal<any>({
      documentId: "doc-1",
      layerId: "layer-1",
      originalSnapshot: {},
      originalTransform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      mode: "resize",
      lockRatio: false,
      startedAt: Date.now(),
    });

    const mockLayers = () => [
      { id: "layer-1", name: "Layer 1", transform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false }, width: 100, height: 100, visible: true, locked: false }
    ];

    const mockActiveEngine = {
      getId: () => "doc-1",
      getLayer: (id: string) => mockLayers().find(l => l.id === id),
      transformLayer: vi.fn(),
      restore: vi.fn(),
      snapshot: () => ({}),
    };

    const mockActiveHistory = {
      commit: vi.fn(),
    };

    const mockValue = {
      workspace: {
        getActiveEngine: () => mockActiveEngine,
        getActiveHistory: () => mockActiveHistory,
      },
      scheduler: { requestRender: vi.fn() },
      activeLayerId: () => "layer-1",
      layerTransformSession,
      setLayerTransformSession,
    };

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => <TransformOptionBar />, container);

    expect(container.textContent).toContain("Transform");

    const buttons = container.querySelectorAll("button");
    const applyBtn = Array.from(buttons).find(b => b.textContent === "Apply");
    const cancelBtn = Array.from(buttons).find(b => b.textContent === "Cancel");

    expect(applyBtn).toBeDefined();
    expect(cancelBtn).toBeDefined();

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("Apply calls commit and clears session", () => {
    const [layerTransformSession, setLayerTransformSession] = createSignal<any>({
      documentId: "doc-1",
      layerId: "layer-1",
      originalSnapshot: { id: "original" },
      // originalTransform is what the layer WAS at session start; the current
      // layer transform (below) is what it is NOW (after user edited). The
      // session commits only when these differ — which mirrors the real
      // production guard we added 2026-06-18 to prevent ghost undo entries
      // from "Apply" on an unchanged session.
      originalTransform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      mode: "resize",
      lockRatio: false,
      startedAt: Date.now(),
    });

    const mockLayers = () => [
      { id: "layer-1", name: "Layer 1", transform: { x: 50, y: 80, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false }, width: 100, height: 100, visible: true, locked: false }
    ];

    const mockActiveEngine = {
      getId: () => "doc-1",
      getLayer: (id: string) => mockLayers().find(l => l.id === id),
      transformLayer: vi.fn(),
      restore: vi.fn(),
      snapshot: () => ({}),
    };

    const mockActiveHistory = {
      commit: vi.fn(),
    };

    const setSessionSpy = vi.fn((val) => setLayerTransformSession(val));

    const mockValue = {
      workspace: {
        getActiveEngine: () => mockActiveEngine,
        getActiveHistory: () => mockActiveHistory,
      },
      scheduler: { requestRender: vi.fn() },
      activeLayerId: () => "layer-1",
      layerTransformSession,
      setLayerTransformSession: setSessionSpy,
    };

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => <TransformOptionBar />, container);

    const buttons = container.querySelectorAll("button");
    const applyBtn = Array.from(buttons).find(b => b.textContent === "Apply") as HTMLButtonElement;
    applyBtn.click();

    expect(mockActiveHistory.commit).toHaveBeenCalledWith({ id: "original" }, "Transform Layer");
    expect(setSessionSpy).toHaveBeenCalledWith(null);

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("Cancel calls restore and clears session", () => {
    const [layerTransformSession, setLayerTransformSession] = createSignal<any>({
      documentId: "doc-1",
      layerId: "layer-1",
      originalSnapshot: { id: "original" },
      originalTransform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      mode: "resize",
      lockRatio: false,
      startedAt: Date.now(),
    });

    const mockLayers = () => [
      { id: "layer-1", name: "Layer 1", transform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false }, width: 100, height: 100, visible: true, locked: false }
    ];

    const mockActiveEngine = {
      getId: () => "doc-1",
      getLayer: (id: string) => mockLayers().find(l => l.id === id),
      transformLayer: vi.fn(),
      restore: vi.fn(),
      snapshot: () => ({}),
    };

    const setSessionSpy = vi.fn((val) => setLayerTransformSession(val));

    const mockValue = {
      workspace: {
        getActiveEngine: () => mockActiveEngine,
        getActiveHistory: () => vi.fn() as any,
      },
      scheduler: { requestRender: vi.fn() },
      activeLayerId: () => "layer-1",
      layerTransformSession,
      setLayerTransformSession: setSessionSpy,
    };

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => <TransformOptionBar />, container);

    const buttons = container.querySelectorAll("button");
    const cancelBtn = Array.from(buttons).find(b => b.textContent === "Cancel") as HTMLButtonElement;
    cancelBtn.click();

    expect(mockActiveEngine.restore).toHaveBeenCalledWith({ id: "original" });
    expect(setSessionSpy).toHaveBeenCalledWith(null);

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("Apply with UNCHANGED transform skips commit (regression: ghost undo entry)", () => {
    // Reproduces regression 2026-06-18: pressing Apply on a transform session
    // that the user never modified used to push a ghost entry to the undo
    // stack — undoing it would do nothing visible, making the history feel
    // unreliable. The fix in transformSession.ts skips the commit when the
    // layer transform matches the originalTransform.
    const sameTransform = { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false };
    const [layerTransformSession, setLayerTransformSession] = createSignal<any>({
      documentId: "doc-1",
      layerId: "layer-1",
      originalSnapshot: { id: "original" },
      originalTransform: sameTransform,
      mode: "resize",
      lockRatio: false,
      startedAt: Date.now(),
    });

    const mockLayers = () => [
      { id: "layer-1", name: "Layer 1", transform: sameTransform, width: 100, height: 100, visible: true, locked: false }
    ];

    const mockActiveEngine = {
      getId: () => "doc-1",
      getLayer: (id: string) => mockLayers().find(l => l.id === id),
      transformLayer: vi.fn(),
      restore: vi.fn(),
      snapshot: () => ({}),
    };

    const mockActiveHistory = { commit: vi.fn() };
    const setSessionSpy = vi.fn((val) => setLayerTransformSession(val));

    const mockValue = {
      workspace: {
        getActiveEngine: () => mockActiveEngine,
        getActiveHistory: () => mockActiveHistory,
      },
      scheduler: { requestRender: vi.fn() },
      activeLayerId: () => "layer-1",
      layerTransformSession,
      setLayerTransformSession: setSessionSpy,
    };

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const dispose = render(() => <TransformOptionBar />, container);

    const buttons = container.querySelectorAll("button");
    const applyBtn = Array.from(buttons).find(b => b.textContent === "Apply") as HTMLButtonElement;
    applyBtn.click();

    // Session is cleared (so the user can exit transform mode), but NO ghost
    // entry was pushed to history.
    expect(mockActiveHistory.commit).not.toHaveBeenCalled();
    expect(setSessionSpy).toHaveBeenCalledWith(null);

    dispose();
    container.parentNode?.removeChild(container);
  });
});
