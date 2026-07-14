import { bakeAdjustmentToBitmap, type BasicAdjustment } from "../../engine/layerAdjustments";

export interface AdjustmentBakeRequest {
  base: ImageBitmap;
  adjustment: BasicAdjustment;
  overlay: ImageBitmap;
  width: number;
  height: number;
  isEraser: boolean;
  gen: number;
}

export interface AdjustmentBakeResponse {
  bitmap: ImageBitmap;
  gen: number;
  error?: string;
}

// Off-main-thread rasterization: bake the layer's non-destructive adjustment
// into the base, then composite the brush overlay on top. Keeping this off the
// UI thread means a brush stroke on a large, adjusted layer never blocks the
// pointerup (the 50–200ms CPU pixel loop runs here instead).
const workerSelf = self as unknown as {
  onmessage: ((e: MessageEvent<AdjustmentBakeRequest>) => void) | null;
  postMessage: (message: AdjustmentBakeResponse, transfer?: Transferable[]) => void;
};

workerSelf.onmessage = async (e: MessageEvent<AdjustmentBakeRequest>) => {
  const { base, adjustment, overlay, width, height, isEraser, gen } = e.data;
  let source: ImageBitmap = base;
  try {
    const needsBake =
      !isEraser &&
      (adjustment.brightness !== 0 || adjustment.contrast !== 0 || adjustment.saturation !== 0);
    // bakeAdjustmentToBitmap reuses the exact same applyBasicAdjustmentToPixels
    // math as export, so the bake matches the live GPU preview (no visual jump).
    if (needsBake) source = bakeAdjustmentToBitmap(base, width, height, adjustment);

    const out = new OffscreenCanvas(width, height);
    const octx = out.getContext("2d");
    if (!octx) throw new Error("adjustmentWorker: failed to acquire 2D context");
    octx.drawImage(source, 0, 0);
    octx.drawImage(overlay, 0, 0);
    const bitmap = out.transferToImageBitmap();
    workerSelf.postMessage({ bitmap, gen }, [bitmap]);
  } catch (err) {
    workerSelf.postMessage(
      { bitmap: null as unknown as ImageBitmap, gen, error: err instanceof Error ? err.message : String(err) },
    );
  } finally {
    // base + overlay were transferred in (owned by this worker) — free them.
    // source is a fresh bake (distinct from base) only when needsBake; close it.
    if (source && source !== base) source.close();
    base.close();
    overlay.close();
  }
};
