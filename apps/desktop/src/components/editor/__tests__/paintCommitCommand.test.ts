import { describe, expect, it, vi } from "vitest";
import { DocumentEngine } from "@/engine/document";
import { CommandHistory } from "@/engine/history";
import { commitPaintBitmap } from "../paintCommitCommand";

function makeBitmap(label: string): ImageBitmap {
  return {
    close: vi.fn(),
    width: 10,
    height: 10,
    label,
  } as unknown as ImageBitmap;
}

describe("commitPaintBitmap", () => {
  it("commits history before replacing the layer bitmap and uploading it", () => {
    const engine = new DocumentEngine("doc-1", "Paint Doc", 10, 10);
    const layer = engine.addLayer("Paint Layer", 10, 10);
    const history = new CommandHistory();
    const originalBitmap = makeBitmap("original");
    const nextBitmap = makeBitmap("next");
    const events: string[] = [];
    const uploader = {
      uploadImage: vi.fn(() => events.push("upload")),
    };
    const requestRender = vi.fn(() => events.push("render"));

    engine.setLayerImageBitmap(layer.id, originalBitmap);

    const committed = commitPaintBitmap(
      { engine, history, uploader, requestRender },
      { layerId: layer.id, bitmap: nextBitmap },
    );

    expect(committed).toBe(true);
    expect(history.getUndoCount()).toBe(1);
    expect(engine.getLayer(layer.id)?.imageBitmap).toBe(nextBitmap);
    expect(uploader.uploadImage).toHaveBeenCalledWith(layer.id, nextBitmap);
    expect(requestRender).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["upload", "render"]);

    const previous = history.undo(engine.snapshot());
    expect(previous?.layers.find((entry) => entry.id === layer.id)?.imageBitmap).toBe(originalBitmap);
  });

  it("closes the generated bitmap and skips mutation when the target layer is gone", () => {
    const engine = new DocumentEngine("doc-1", "Paint Doc", 10, 10);
    const history = new CommandHistory();
    const bitmap = makeBitmap("orphan");
    const uploader = { uploadImage: vi.fn() };
    const requestRender = vi.fn();

    const committed = commitPaintBitmap(
      { engine, history, uploader, requestRender },
      { layerId: "missing-layer", bitmap },
    );

    expect(committed).toBe(false);
    expect(history.getUndoCount()).toBe(0);
    expect(uploader.uploadImage).not.toHaveBeenCalled();
    expect(requestRender).not.toHaveBeenCalled();
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });
});
