import type { LayerNode } from "./types";
import { createMergedLayerNode } from "./layerFactory";
import { normalizeRotation } from "@/viewport/transformGeometry";

export function performCropCanvas(layers: LayerNode[], x: number, y: number): void {
  for (const layer of layers) {
    if (!layer.locked) {
      layer.transform.x -= x;
      layer.transform.y -= y;
    }
  }
}

export function performApplyCrop(
  layers: LayerNode[],
  x: number,
  y: number,
  width: number,
  height: number,
  options?: {
    deleteCroppedPixels?: boolean;
    targetSize?: { w: number; h: number } | null;
    rotation?: number;
    fillBackgroundColor?: string | null;
  }
): void {
  const deleteCropped = options?.deleteCroppedPixels ?? false;
  const targetSize = options?.targetSize ?? null;
  const cropRotation = options?.rotation ?? 0;

  const cropCenterX = x + width / 2;
  const cropCenterY = y + height / 2;

  const rad = (-cropRotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const finalW = targetSize ? targetSize.w : width;
  const finalH = targetSize ? targetSize.h : height;
  const exportScaleX = finalW / width;
  const exportScaleY = finalH / height;
  const fillBackgroundColor = options?.fillBackgroundColor ?? null;

  for (const layer of layers) {
    if (layer.locked) continue;

    const lw = layer.width;
    const lh = layer.height;
    const lsx = layer.transform.scaleX;
    const lsy = layer.transform.scaleY;

    // Calculate center in document space
    const lcx = layer.transform.x + (lw * Math.abs(lsx)) / 2;
    const lcy = layer.transform.y + (lh * Math.abs(lsy)) / 2;

    // Vector from crop center to layer center
    const vx = lcx - cropCenterX;
    const vy = lcy - cropCenterY;

    // Rotate vector
    const rvx = vx * cos - vy * sin;
    const rvy = vx * sin + vy * cos;

    // New center in crop space
    const nlcx = width / 2 + rvx;
    const nlcy = height / 2 + rvy;

    // Scale center to target size. X and Y must be independent because
    // explicit crop target sizes can intentionally change aspect ratio.
    const finalCX = nlcx * exportScaleX;
    const finalCY = nlcy * exportScaleY;

    const finalScaleX = lsx * exportScaleX;
    const finalScaleY = lsy * exportScaleY;
    const finalRotation = normalizeRotation(layer.transform.rotation - cropRotation);

    if (deleteCropped && layer.imageBitmap) {
      try {
        const offscreen = new OffscreenCanvas(finalW, finalH);
        const ctx = offscreen.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, finalW, finalH);
          ctx.save();
          ctx.translate(finalCX, finalCY);
          ctx.rotate((finalRotation * Math.PI) / 180);
          const flipX = layer.transform.flipH ? -1 : 1;
          const flipY = layer.transform.flipV ? -1 : 1;
          ctx.scale(finalScaleX * flipX, finalScaleY * flipY);
          ctx.drawImage(layer.imageBitmap, -lw / 2, -lh / 2);
          ctx.restore();

          const newBitmap = offscreen.transferToImageBitmap();
          // NOTE: we intentionally do NOT close the old imageBitmap here.
          // applyCropPreview commits engine.snapshot() to history BEFORE
          // calling engine.applyCrop(), so the snapshot holds a reference
          // to the bitmap we are about to replace. Closing it would make
          // the snapshot point to a closed/detached ImageBitmap, causing
          // "image source is detached" errors on restore (undo/redo) —
          // the layer would render as a black/empty texture. Memory is
          // reclaimed by GC once all snapshot references are evicted.
          if (layer.baseImageBitmap) {
            try {
              layer.baseImageBitmap.close();
            } catch {
              // jsdom and some test doubles don't implement close().
            }
            layer.baseImageBitmap = null;
          }
          layer.basicAdjustment = undefined;
          layer.hasAdjustments = false;

          layer.imageBitmap = newBitmap;
          layer.width = finalW;
          layer.height = finalH;
        }
      } catch (err) {
        console.error("Failed to crop layer bitmap:", err);
      }
      // Baked layer sits at (0, 0) with scale=1, rotation=0, flips=false
      layer.transform.x = 0;
      layer.transform.y = 0;
      layer.transform.scaleX = 1;
      layer.transform.scaleY = 1;
      layer.transform.rotation = 0;
      layer.transform.flipH = false;
      layer.transform.flipV = false;
    } else {
      // Non-destructive path or no bitmap (adjustment/group layers)
      const newX = finalCX - (lw * Math.abs(finalScaleX)) / 2;
      const newY = finalCY - (lh * Math.abs(finalScaleY)) / 2;

      layer.transform.x = newX;
      layer.transform.y = newY;
      layer.transform.scaleX = finalScaleX;
      layer.transform.scaleY = finalScaleY;
      layer.transform.rotation = finalRotation;
      // flipH and flipV remain unchanged
    }
  }

  if (fillBackgroundColor) {
    try {
      const offscreen = new OffscreenCanvas(finalW, finalH);
      const ctx = offscreen.getContext("2d");
      if (ctx) {
        ctx.fillStyle = fillBackgroundColor;
        ctx.fillRect(0, 0, finalW, finalH);
        const bitmap = offscreen.transferToImageBitmap();
        const fillLayer = createMergedLayerNode(
          "Crop Fill Background",
          finalW,
          finalH,
          bitmap,
          false,
          "normal",
        );
        layers.push(fillLayer);
      }
    } catch (err) {
      console.error("Failed to create crop fill background:", err);
    }
  }
}
