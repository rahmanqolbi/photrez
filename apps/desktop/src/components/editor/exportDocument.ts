import type { LayerNode } from "@/engine/types";
import type { DocumentEngine } from "@/engine/document";
import { getEffectiveMaxDim } from "@/engine/types";
import { writeFileBytes, showSaveDialog } from "@/tauri/native";
import { drawLayerToContext } from "@/engine/layerComposite";
import { applyBasicAdjustmentToPixels } from "@/engine/layerAdjustments";

export type ExportFormat = "png" | "jpeg" | "webp";

function getMimeType(format: ExportFormat): string {
  switch (format) {
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    default: return "image/png";
  }
}

function getExtension(format: ExportFormat): string {
  switch (format) {
    case "jpeg": return "jpg";
    case "webp": return "webp";
    default: return "png";
  }
}

// Bakes a layer's basic adjustment (Brightness/Contrast/Saturation) into a
// fresh bitmap for export. The live preview applies the same math on the GPU
// (see renderer/shaders.ts :: applyAdjustment), so the exported file matches
// what the user sees. Operates on straight-alpha RGBA (getImageData), which is
// what applyBasicAdjustmentToPixels expects.
function bakeAdjustment(layer: LayerNode): ImageBitmap {
  const canvas = new OffscreenCanvas(layer.width, layer.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(layer.imageBitmap!, 0, 0);
  const imageData = ctx.getImageData(0, 0, layer.width, layer.height);
  imageData.data.set(applyBasicAdjustmentToPixels(imageData.data, layer.basicAdjustment!));
  ctx.putImageData(imageData, 0, 0);
  return canvas.transferToImageBitmap();
}

export async function encodeComposite(
  engine: DocumentEngine,
  format: ExportFormat,
  quality: number,
): Promise<Uint8Array> {
  const t0 = performance.now();
  const width = Math.min(engine.getWidth(), getEffectiveMaxDim());
  const height = Math.min(engine.getHeight(), getEffectiveMaxDim());
  const layers = engine.getLayers();
  const clampedQuality = Math.max(0, Math.min(1, quality / 100));

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  // Start with transparent canvas
  ctx.clearRect(0, 0, width, height);

  // JPEG does not support alpha — composite over white
  if (format === "jpeg") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
  }

  // Composite layers bottom-to-top using the same drawLayerToContext
  // that the frontend renderer uses — ensures blend mode parity.
  // Adjustments are non-destructive (applied in the GPU shader live), so we
  // bake them into a temporary bitmap here for the exported pixels.
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || !layer.imageBitmap) continue;
    if (layer.basicAdjustment) {
      const adjusted = bakeAdjustment(layer);
      drawLayerToContext(ctx, { ...layer, imageBitmap: adjusted });
      adjusted.close();
    } else {
      drawLayerToContext(ctx, layer);
    }
  }

  const mimeType = getMimeType(format);
  const blob = await canvas.convertToBlob({
    type: mimeType,
    quality: format !== "png" ? clampedQuality : undefined,
  });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  return bytes;
}

export async function exportActiveDocument(
  engine: DocumentEngine,
  displayName: string,
  format: ExportFormat,
  quality: number,
): Promise<string | null> {
  const ext = getExtension(format);
  const defaultName = displayName.replace(/\.[^.]+$/, "") + "." + ext;

  const path = await showSaveDialog(defaultName);
  if (!path) return null;

  const bytes = await encodeComposite(engine, format, quality);
  await writeFileBytes(path, bytes);

  return path;
}
