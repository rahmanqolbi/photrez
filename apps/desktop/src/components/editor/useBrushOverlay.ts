import { useEditor } from "./EditorContext";
import type { DocumentEngine } from "@/engine/document";
import { getPaintToolBlockReason, type PaintToolSettings } from "./brushToolState";
import { renderPaintStrokeToContext } from "./paintStrokeRenderer";
import { documentToLayerLocal } from "@/viewport/transformGeometry";

export function useBrushOverlay() {
  const { workspace, renderer, scheduler, fgColor, docWidth, docHeight } = useEditor();

  let overlayCanvasRef: HTMLCanvasElement | null = null;
  let overlayCtx: CanvasRenderingContext2D | null = null;
  let prevStrokePointCount = 0;
  let strokeGen = 0;

  let eraserPreviewCanvas: OffscreenCanvas | null = null;
  let eraserPreviewCtx: OffscreenCanvasRenderingContext2D | null = null;

  function onPaintStroke(
    points: { x: number; y: number }[],
    isEraser: boolean,
    settings: PaintToolSettings,
  ) {
    const activeEngine = workspace.getActiveEngine();
    if (!activeEngine) return;
    const activeId = activeEngine.getActiveLayerId();
    if (!activeId) return;

    const layer = activeEngine.getLayer(activeId);
    if (!layer) return;

    const blockedReason = getPaintToolBlockReason(layer, isEraser);
    if (blockedReason) return;

    if (!overlayCanvasRef) return;
    if (!overlayCtx) {
      overlayCtx = overlayCanvasRef.getContext("2d");
    }
    if (!overlayCtx) return;

    if (overlayCanvasRef.width !== layer.width || overlayCanvasRef.height !== layer.height) {
      overlayCanvasRef.width = layer.width;
      overlayCanvasRef.height = layer.height;
    }

    const localPoints = points.map(p => documentToLayerLocal(
      p.x, p.y, layer.transform, layer.width, layer.height,
    ));

    if (prevStrokePointCount === 0) {
      if (isEraser) {
        overlayCtx.clearRect(0, 0, layer.width, layer.height);
        overlayCanvasRef.style.background = "";

        eraserPreviewCanvas = new OffscreenCanvas(layer.width, layer.height);
        eraserPreviewCtx = eraserPreviewCanvas.getContext("2d")!;
        if (layer.imageBitmap) {
          eraserPreviewCtx.drawImage(layer.imageBitmap, 0, 0);
        }
      } else {
        overlayCtx.clearRect(0, 0, layer.width, layer.height);
        overlayCanvasRef.style.background = "";
        if (layer.imageBitmap) {
          overlayCtx.drawImage(layer.imageBitmap, 0, 0);
        }
      }
    }

    const startIdx = prevStrokePointCount > 0 ? prevStrokePointCount - 1 : 0;
    const deltaPoints = localPoints.slice(startIdx);

    if (isEraser) {
      if (deltaPoints.length > 0 && eraserPreviewCtx) {
        renderPaintStrokeToContext(
          eraserPreviewCtx as any as CanvasRenderingContext2D,
          deltaPoints,
          settings,
          "rgba(0,0,0,1)",
          true,
        );
        uploadEraserPreview(activeEngine, activeId, layer.width, layer.height);
      }
    } else {
      renderPaintStrokeToContext(
        overlayCtx,
        deltaPoints.length > 0 ? deltaPoints : localPoints,
        settings,
        fgColor(),
        false,
      );

      if (layer.lockTransparency && layer.imageBitmap) {
        overlayCtx.globalCompositeOperation = "destination-in";
        overlayCtx.drawImage(layer.imageBitmap, 0, 0);
        overlayCtx.globalCompositeOperation = "source-over";
      }
    }

    prevStrokePointCount = points.length;
  }

  let previewGen = 0;

  async function uploadEraserPreview(
    engine: DocumentEngine,
    layerId: string,
    w: number,
    h: number,
  ) {
    if (!eraserPreviewCanvas) return;
    const gen = ++previewGen;

    try {
      const bitmap = await createImageBitmap(eraserPreviewCanvas);
      if (gen !== previewGen) {
        bitmap.close();
        return;
      }
      const currentEngine = workspace.getActiveEngine();
      if (currentEngine !== engine || !currentEngine.getLayer(layerId)) {
        bitmap.close();
        return;
      }
      renderer.uploadImage(layerId, bitmap);
      scheduler.requestRender();
    } catch (err) {
      console.error("Eraser preview upload failed:", err);
    }
  }

  async function commitBrushStroke(engine: DocumentEngine, layerId: string, isEraser: boolean) {
    if (prevStrokePointCount === 0) return;
    if (!overlayCanvasRef) return;
    const w = overlayCanvasRef.width;
    const h = overlayCanvasRef.height;
    if (w === 0 || h === 0) return;

    if (isEraser) {
      await commitEraserStroke(engine, layerId, w, h);
      return;
    }

    if (!overlayCtx) {
      overlayCtx = overlayCanvasRef.getContext("2d");
    }
    if (!overlayCtx) return;

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
      const currentEngine = workspace.getActiveEngine();
      if (currentEngine !== engine || !currentEngine.getLayer(layerId)) {
        newBitmap.close();
        overlayCtx.clearRect(0, 0, w, h);
        prevStrokePointCount = 0;
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

  async function commitEraserStroke(
    engine: DocumentEngine,
    layerId: string,
    w: number,
    h: number,
  ) {
    if (!eraserPreviewCanvas) return;

    try {
      const gen = ++strokeGen;
      const newBitmap = await createImageBitmap(eraserPreviewCanvas);
      if (gen !== strokeGen) {
        newBitmap.close();
        return;
      }
      const currentEngine = workspace.getActiveEngine();
      if (currentEngine !== engine || !currentEngine.getLayer(layerId)) {
        newBitmap.close();
        overlayCtx?.clearRect(0, 0, w, h);
        prevStrokePointCount = 0;
        return;
      }
      engine.setLayerImageBitmap(layerId, newBitmap);
      renderer.uploadImage(layerId, newBitmap);
      scheduler.requestRender();
      overlayCtx?.clearRect(0, 0, w, h);
      prevStrokePointCount = 0;
      eraserPreviewCanvas = null;
      eraserPreviewCtx = null;
    } catch (err) {
      console.error("Eraser commit failed:", err);
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
      eraserPreviewCanvas = null;
      eraserPreviewCtx = null;
    },
  };
}
