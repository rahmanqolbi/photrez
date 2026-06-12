import type { LayerNode } from "@/engine/types";
import type { DocumentEngine } from "@/engine/document";
import { writeFileBytes, showSaveDialog } from "@/tauri/native";
import { drawLayerToContext } from "@/engine/layerComposite";

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

export async function encodeComposite(
  engine: DocumentEngine,
  format: ExportFormat,
  quality: number,
): Promise<Uint8Array> {
  const width = engine.getWidth();
  const height = engine.getHeight();
  const layers = engine.getLayers();

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
  // that the frontend renderer uses — ensures blend mode parity
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || !layer.imageBitmap) continue;
    drawLayerToContext(ctx, layer);
  }

  const mimeType = getMimeType(format);
  const blob = await canvas.convertToBlob({
    type: mimeType,
    quality: format !== "png" ? quality / 100 : undefined,
  });

  return new Uint8Array(await blob.arrayBuffer());
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
