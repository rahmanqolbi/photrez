import type { LayerNode } from "./types";

// Reusable 1x1 scratch canvas — avoids allocating a new OffscreenCanvas
// per layer per sample during Alt+drag eyedropper (was ~50-200µs each).
// Lazily created on first use so module import does not fail in envs
// without OffscreenCanvas (e.g. jsdom test runner).
let sampleCanvas: OffscreenCanvas | null = null;
let sampleCtx: OffscreenCanvasRenderingContext2D | null = null;

function getSampleCtx(): OffscreenCanvasRenderingContext2D | null {
  if (sampleCtx) return sampleCtx;
  sampleCanvas = new OffscreenCanvas(1, 1);
  sampleCtx = sampleCanvas.getContext("2d");
  return sampleCtx;
}

export function performPixelSampling(
  layers: readonly LayerNode[],
  docWidth: number,
  docHeight: number,
  x: number,
  y: number
): [number, number, number, number] {
  // If coordinates are out of bounds, return fully transparent
  if (x < 0 || x >= docWidth || y < 0 || y >= docHeight) {
    return [0, 0, 0, 0];
  }

  // Dynamic color sampling from layers bottom-to-top (we compose them simple Normal blending for eyedropper)
  let composed: [number, number, number, number] = [0, 0, 0, 0];

  // Iterating backwards from bottom (index length-1) to top (index 0)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || !layer.imageBitmap) continue;

    // Map document coordinates to layer relative coordinates
    const rx = Math.floor(x - layer.transform.x);
    const ry = Math.floor(y - layer.transform.y);

     if (rx >= 0 && rx < layer.width && ry >= 0 && ry < layer.height) {
       try {
        const ctx = getSampleCtx();
        if (ctx) {
          ctx.clearRect(0, 0, 1, 1);
          ctx.drawImage(layer.imageBitmap, rx, ry, 1, 1, 0, 0, 1, 1);
          const imgData = ctx.getImageData(0, 0, 1, 1);
          const r = imgData.data[0];
          const g = imgData.data[1];
          const b = imgData.data[2];
          const a = (imgData.data[3] / 255) * layer.opacity;

          // Simple alpha blend composed and current layer
          const [cr, cg, cb, ca] = composed;
          const outA = a + ca * (1.0 - a);
          if (outA > 0) {
            const outR = Math.round((r * a + cr * ca * (1.0 - a)) / outA);
            const outG = Math.round((g * a + cg * ca * (1.0 - a)) / outA);
            const outB = Math.round((b * a + cb * ca * (1.0 - a)) / outA);
            composed = [outR, outG, outB, outA];
          }
        }
      } catch {
        // Fallback if canvas read fails
        composed = [225, 90, 23, 1.0]; // Photon Amber fallback
      }
    }
  }

  return composed;
}
