import { useEditor } from "./EditorContext";
import type { DocumentEngine } from "@/engine/document";
import type { CommandHistory } from "@/engine/history";
import { getPaintToolBlockReason, type PaintToolSettings } from "./brushToolState";
import { commitPaintBitmap } from "./paintCommitCommand";
import { mapPaintPointToLayerLocal, mapPaintStrokeToLayerLocal } from "./paintStrokeCoordinates";
import {
  getBrushDabSpacing,
  getBrushTip,
  interpolateDabs,
  stampBrushTipMaxAlpha,
  paintMaskToContext,
  getEffectiveFlowMultiplier,
} from "./brushTipMask";

interface PaintStrokeSession {
  layerId: string;
  isEraser: boolean;
  settingsKey: string;
  color: string;
  maskData: Uint8ClampedArray;
  maskWidth: number;
  maskHeight: number;
  lastPoint: { x: number; y: number } | null;
  spacingCarry: number;
  dabCount: number;
}

export function useBrushOverlay() {
  const { workspace, renderer, scheduler, fgColor, docWidth, docHeight } = useEditor();

  let overlayCanvasRef: HTMLCanvasElement | null = null;
  let overlayCtx: CanvasRenderingContext2D | null = null;
  let prevStrokePointCount = 0;
  let strokeGen = 0;

  let eraserPreviewCanvas: OffscreenCanvas | null = null;
  let eraserPreviewCtx: OffscreenCanvasRenderingContext2D | null = null;
  let paintSession: PaintStrokeSession | null = null;

  function getPaintSessionKey(settings: PaintToolSettings, color: string): string {
    return [
      Math.round(settings.size),
      Math.round(settings.hardness * 100),
      Math.round(settings.opacity * 100),
      Math.round(settings.flow * 100),
      color,
    ].join(":");
  }

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

    // Task 4: Hard brush path (hardness >= 1) remains path-based for performance and visual parity.
    if (settings.hardness >= 1) {
      const localPoints = mapPaintStrokeToLayerLocal(points, layer);

      if (isEraser && (!eraserPreviewCanvas || eraserPreviewCanvas.width !== layer.width || eraserPreviewCanvas.height !== layer.height)) {
        eraserPreviewCanvas = new OffscreenCanvas(layer.width, layer.height);
        eraserPreviewCtx = eraserPreviewCanvas.getContext("2d");
      }
      const activeCtx = isEraser ? eraserPreviewCtx : overlayCtx;
      if (!activeCtx) return;

      activeCtx.save();
      if (isEraser) {
        activeCtx.clearRect(0, 0, layer.width, layer.height);
        if (layer.imageBitmap) {
          activeCtx.drawImage(layer.imageBitmap, 0, 0);
        }
        activeCtx.globalCompositeOperation = "destination-out";
      } else {
        activeCtx.clearRect(0, 0, layer.width, layer.height);
        activeCtx.globalCompositeOperation = "source-over";
      }
      activeCtx.globalAlpha = settings.opacity * settings.flow;
      activeCtx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : fgColor();
      activeCtx.lineWidth = settings.size;
      activeCtx.lineCap = "round";
      activeCtx.lineJoin = "round";

      if (localPoints.length > 0) {
        activeCtx.beginPath();
        activeCtx.moveTo(localPoints[0].x, localPoints[0].y);
        for (let i = 1; i < localPoints.length; i++) {
          activeCtx.lineTo(localPoints[i].x, localPoints[i].y);
        }
        if (localPoints.length === 1) {
          activeCtx.fillStyle = isEraser ? "rgba(0,0,0,1)" : fgColor();
          activeCtx.beginPath();
          activeCtx.arc(localPoints[0].x, localPoints[0].y, settings.size / 2, 0, Math.PI * 2);
          activeCtx.fill();
        } else {
          activeCtx.stroke();
        }
      }
      activeCtx.restore();

      if (!isEraser && layer.lockTransparency && layer.imageBitmap) {
        overlayCtx.globalCompositeOperation = "destination-in";
        overlayCtx.drawImage(layer.imageBitmap, 0, 0);
        overlayCtx.globalCompositeOperation = "source-over";
      }

      if (isEraser) {
        uploadEraserPreview(activeEngine, activeId, layer.width, layer.height);
      }
      prevStrokePointCount = points.length;
      return;
    }

    // Soft brush path (hardness < 1) uses incremental PaintStrokeSession
    const settingsKey = getPaintSessionKey(settings, fgColor());
    const needsReset =
      !paintSession ||
      paintSession.layerId !== activeId ||
      paintSession.isEraser !== isEraser ||
      paintSession.settingsKey !== settingsKey ||
      paintSession.maskWidth !== layer.width ||
      paintSession.maskHeight !== layer.height ||
      prevStrokePointCount === 0;

    if (needsReset) {
      paintSession = {
        layerId: activeId,
        isEraser,
        settingsKey,
        color: fgColor(),
        maskData: new Uint8ClampedArray(layer.width * layer.height),
        maskWidth: layer.width,
        maskHeight: layer.height,
        lastPoint: null,
        spacingCarry: 0,
        dabCount: 0,
      };

      if (isEraser) {
        eraserPreviewCanvas = new OffscreenCanvas(layer.width, layer.height);
        eraserPreviewCtx = eraserPreviewCanvas.getContext("2d")!;
      }
    }

    if (!paintSession) return;

    const tip = getBrushTip({ size: settings.size, hardness: settings.hardness, curve: "soft" });
    const spacing = getBrushDabSpacing(settings.size, settings.hardness, settings.flow);
    const alphaScale = settings.opacity * settings.flow * getEffectiveFlowMultiplier(settings.hardness);

    const startIndex = needsReset ? 0 : prevStrokePointCount;
    for (let i = startIndex; i < points.length; i++) {
      const pt = points[i];
      const localPt = mapPaintPointToLayerLocal(pt, layer);

      if (!paintSession.lastPoint) {
        stampBrushTipMaxAlpha(paintSession.maskData, layer.width, layer.height, tip, localPt.x, localPt.y, alphaScale);
        paintSession.dabCount += 1;
      } else {
        const result = interpolateDabs(paintSession.lastPoint, localPt, spacing, paintSession.spacingCarry);
        paintSession.spacingCarry = result.carry;
        for (const dab of result.dabs) {
          stampBrushTipMaxAlpha(paintSession.maskData, layer.width, layer.height, tip, dab.x, dab.y, alphaScale);
          paintSession.dabCount += 1;
        }
      }
      paintSession.lastPoint = localPt;
    }

    if (isEraser) {
      if (eraserPreviewCtx) {
        eraserPreviewCtx.clearRect(0, 0, layer.width, layer.height);
        if (layer.imageBitmap) {
          eraserPreviewCtx.drawImage(layer.imageBitmap, 0, 0);
        }
        paintMaskToContext(eraserPreviewCtx, paintSession.maskData, layer.width, layer.height, "rgba(0,0,0,1)", true);
        uploadEraserPreview(activeEngine, activeId, layer.width, layer.height);
      }
    } else {
      overlayCtx.clearRect(0, 0, layer.width, layer.height);
      paintMaskToContext(overlayCtx, paintSession.maskData, layer.width, layer.height, paintSession.color, false);

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

  async function commitBrushStroke(engine: DocumentEngine, history: CommandHistory, layerId: string, isEraser: boolean) {
    if (prevStrokePointCount === 0) return;
    if (!overlayCanvasRef) return;
    const w = overlayCanvasRef.width;
    const h = overlayCanvasRef.height;
    if (w === 0 || h === 0) return;

    if (isEraser) {
      await commitEraserStroke(engine, history, layerId, w, h);
      return;
    }

    if (!overlayCtx) {
      overlayCtx = overlayCanvasRef.getContext("2d");
    }
    if (!overlayCtx) return;

    const layer = engine.getLayer(layerId);
    if (!layer) return;

    const snapshot = new OffscreenCanvas(w, h);
    const sCtx = snapshot.getContext("2d")!;
    if (layer.imageBitmap) {
      sCtx.drawImage(layer.imageBitmap, 0, 0);
    }
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
        paintSession = null;
        return;
      }
      commitPaintBitmap(
        { engine, history, uploader: renderer, requestRender: () => scheduler.requestRender() },
        { layerId, bitmap: newBitmap },
      );
      overlayCtx.clearRect(0, 0, w, h);
      prevStrokePointCount = 0;
      paintSession = null;
    } catch (err) {
      console.error("Stroke commit failed:", err);
      paintSession = null;
    }
  }

  async function commitEraserStroke(
    engine: DocumentEngine,
    history: CommandHistory,
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
        paintSession = null;
        return;
      }
      commitPaintBitmap(
        { engine, history, uploader: renderer, requestRender: () => scheduler.requestRender() },
        { layerId, bitmap: newBitmap },
      );
      overlayCtx?.clearRect(0, 0, w, h);
      prevStrokePointCount = 0;
      eraserPreviewCanvas = null;
      eraserPreviewCtx = null;
      paintSession = null;
    } catch (err) {
      console.error("Eraser commit failed:", err);
      paintSession = null;
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
      } else {
        paintSession = null;
      }
    },
    getOverlayCanvasRef: () => overlayCanvasRef,
    clearPrevStrokePointCount: () => {
      prevStrokePointCount = 0;
      eraserPreviewCanvas = null;
      eraserPreviewCtx = null;
      paintSession = null;
    },
  };
}
