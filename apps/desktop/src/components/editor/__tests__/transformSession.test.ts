import { describe, expect, it, vi } from "vitest";
import {
  cancelLayerTransformSession,
  commitLayerTransformSession,
  resetLayerTransformPreview,
} from "../transformSession";
import type { Transform2D, DocumentModel } from "@/engine/types";
import type { LayerTransformSession } from "../tools/editorState";

const original: Transform2D = { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false };
const preview: Transform2D = { x: 10, y: 20, scaleX: 2, scaleY: 1, rotation: 15, flipH: false, flipV: false };

function makeSnapshot(opts: { dirty: boolean; transform: Transform2D }): DocumentModel {
  return {
    id: "doc-1",
    name: "fjord.png",
    width: 800,
    height: 600,
    layers: [
      {
        id: "L1",
        name: "Layer 1",
        type: "raster",
        visible: true,
        locked: false,
        lockTransparency: false,
        lockPosition: false,
        lockRotation: false,
        opacity: 1,
        blendMode: "normal" as any,
        transform: opts.transform,
        width: 100,
        height: 100,
        imageBitmap: null,
      },
    ],
    activeLayerId: "L1",
    selection: null,
    viewport: { panX: 0, panY: 0, zoom: 1, rotation: 0 },
    dirty: opts.dirty,
  };
}

function makeSession(opts: Partial<LayerTransformSession>): LayerTransformSession {
  return {
    documentId: "doc-1",
    layerId: "L1",
    originalSnapshot: makeSnapshot({ dirty: false, transform: original }),
    originalTransform: original,
    mode: "resize",
    lockRatio: false,
    startedAt: 1,
    ...opts,
  };
}

function makeEngine(opts: { id: string; transform: Transform2D }) {
  return {
    getId: () => opts.id,
    snapshot: () => makeSnapshot({ dirty: true, transform: opts.transform }),
    restore: vi.fn(),
    getLayer: () => ({ id: "L1", transform: opts.transform }),
    transformLayer: vi.fn(),
  };
}

describe("transformSession helpers", () => {
  it("commits the captured original snapshot, not a mutated preview snapshot", () => {
    const history = { commit: vi.fn() };
    const originalSnapshot = makeSnapshot({ dirty: false, transform: original });
    const engine = makeEngine({ id: "doc-1", transform: preview });

    const ok = commitLayerTransformSession(
      makeSession({ documentId: "doc-1", originalSnapshot, originalTransform: original }),
      engine,
      history
    );

    expect(ok).toBe(true);
    expect(history.commit).toHaveBeenCalledWith(originalSnapshot, "Transform Layer");
  });

  it("cancelLayerTransformSession calls engine.restore(originalSnapshot)", () => {
    const originalSnapshot = makeSnapshot({ dirty: false, transform: original });
    const engine = makeEngine({ id: "doc-1", transform: preview });

    const ok = cancelLayerTransformSession(
      makeSession({ documentId: "doc-1", originalSnapshot }),
      engine
    );

    expect(ok).toBe(true);
    expect(engine.restore).toHaveBeenCalledWith(originalSnapshot);
  });

  it("resetLayerTransformPreview calls engine.transformLayer(layerId, originalTransform) and keeps history untouched", () => {
    const engine = makeEngine({ id: "doc-1", transform: preview });

    const ok = resetLayerTransformPreview(
      makeSession({ documentId: "doc-1", originalTransform: original }),
      engine
    );

    expect(ok).toBe(true);
    expect(engine.transformLayer).toHaveBeenCalledWith("L1", original);
  });

  it("helpers return false when session.documentId !== engine.getId()", () => {
    const history = { commit: vi.fn() };
    const engine = makeEngine({ id: "doc-2", transform: preview });
    const session = makeSession({ documentId: "doc-1" });

    expect(commitLayerTransformSession(session, engine, history)).toBe(false);
    expect(cancelLayerTransformSession(session, engine)).toBe(false);
    expect(resetLayerTransformPreview(session, engine)).toBe(false);
  });
});
