import { useEditor } from "./EditorContext";
import type { DocumentEngine } from "@/engine/document";

export function useBrushOverlay() {
  const { workspace, renderer, scheduler, fgColor, docWidth, docHeight } = useEditor();

  let overlayCanvasRef: HTMLCanvasElement | null = null;
  let overlayCtx: CanvasRenderingContext2D | null = null;
  let prevStrokePointCount = 0;
  let strokeGen = 0;

  function onPaintStroke(
    points: { x: number; y: number }[],
    isEraser: boolean,
  ) {
    const activeEngine = workspace.getActiveEngine();
    if (!activeEngine) return;
    const activeId = activeEngine.getActiveLayerId();
    if (!activeId) return;

    const layer = activeEngine.getLayer(activeId);
    if (!layer || layer.locked || !layer.visible) return;

    if (!overlayCanvasRef) return;
    if (!overlayCtx) {
      overlayCtx = overlayCanvasRef.getContext("2d");
    }
    if (!overlayCtx) return;

    // Lazy resize overlay canvas to match layer dimensions
    if (overlayCanvasRef.width !== layer.width || overlayCanvasRef.height !== layer.height) {
      overlayCanvasRef.width = layer.width;
      overlayCanvasRef.height = layer.height;
    }

    // Seed overlay with current layer image at start of a new stroke
    if (prevStrokePointCount === 0) {
      if (layer.imageBitmap) {
        overlayCtx.drawImage(layer.imageBitmap, 0, 0);
      } else {
        overlayCtx.clearRect(0, 0, layer.width, layer.height);
      }
      overlayCtx.globalAlpha = 1.0;
      overlayCtx.lineWidth = 20;
      overlayCtx.lineCap = "round";
      overlayCtx.lineJoin = "round";
      overlayCtx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
      overlayCtx.strokeStyle = isEraser ? "rgba(0,0,0,1.0)" : fgColor();
    }

    // Draw only the delta segment since the last call
    const startIdx = prevStrokePointCount > 0 ? prevStrokePointCount - 1 : 0;
    overlayCtx.beginPath();
    overlayCtx.moveTo(points[startIdx].x, points[startIdx].y);
    for (let i = Math.max(1, prevStrokePointCount); i < points.length; i++) {
      overlayCtx.lineTo(points[i].x, points[i].y);
    }
    overlayCtx.stroke();

    prevStrokePointCount = points.length;
  }

  async function commitBrushStroke(engine: DocumentEngine, layerId: string) {
    if (prevStrokePointCount === 0) return;
    if (!overlayCanvasRef) return;
    const w = overlayCanvasRef.width;
    const h = overlayCanvasRef.height;
    if (w === 0 || h === 0) return;
    if (!overlayCtx) {
      overlayCtx = overlayCanvasRef.getContext("2d");
    }
    if (!overlayCtx) return;

    // Sync snapshot — captures current overlay pixels before any async gap
    const snapshot = new OffscreenCanvas(w, h);
    const sCtx = snapshot.getContext("2d")!;
    sCtx.drawImage(overlayCanvasRef, 0, 0);

    try {
      const gen = ++strokeGen;
      const newBitmap = await createImageBitmap(snapshot);
      if (gen !== strokeGen) {
        newBitmap.close();
        return;
      }
      engine.setLayerImageBitmap(layerId, newBitmap);
      renderer.uploadImage(layerId, newBitmap);
      scheduler.requestRender();
      overlayCtx.clearRect(0, 0, w, h);
      prevStrokePointCount = 0;
    } catch (err) {
      console.error("Stroke commit failed:", err);
    }
  }

  return {
    onPaintStroke,
    commitBrushStroke,
    setOverlayCanvasRef: (el: HTMLCanvasElement | null) => {
      overlayCanvasRef = el;
      overlayCtx = el ? el.getContext("2d") : null;
      if (el) {
        el.width = docWidth();
        el.height = docHeight();
      }
    },
    getOverlayCanvasRef: () => overlayCanvasRef,
    clearPrevStrokePointCount: () => {
      prevStrokePointCount = 0;
    }
  };
}
