import { createMemo, createSignal, createEffect, Show } from "solid-js";
import { screenToDocument } from "@/viewport/coords";
import { computeSnapAdjustment } from "@/viewport/smartGuides";
import type { SnapRect } from "@/viewport/smartGuides";
import { getLayerAabb } from "@/viewport/transformGeometry";
import { useEditor } from "./EditorContext";
import { useCanvasKeyboard } from "./useCanvasKeyboard";
import { useBrushOverlay } from "./useBrushOverlay";
import { usePanNavigation } from "./usePanNavigation";
import { useViewportRenderer } from "./useViewportRenderer";
import { useCanvasPointerTools } from "./useCanvasPointerTools";
import { useCanvasDerivedState } from "./useCanvasDerivedState";
import { SelectionTransformOverlay } from "./SelectionTransformOverlay";
import { HoverHighlight } from "./HoverHighlight";
import { SmartGuides } from "./SmartGuides";
import { BrushCursorOverlay } from "./BrushCursorOverlay";
import { CropOverlay } from "./CropOverlay";
import { ModernCropOverlay } from "./ModernCropOverlay";
import { TransformHud } from "./TransformHud";
import { BrushContextMenu } from "./BrushContextMenu";
import { getPasteboardClickAction } from "./pasteboardClickPolicy";
import { getDefaultModernCropFrame, getModernCropApplyRotation, getModernCropImagePivot, getProjectedCanvasSize, modernFrameToCropRect } from "@/viewport/modernCropGeometry";
import { fitCropRectToAspect } from "@/viewport/cropAutoFit";
import {
  clearCropPreview,
  applyCropPreview,
  hideCropPreview,
  hasCropReplacementDragDistance,
  createCropRectFromDocumentPoints
} from "./cropToolActions";

export function CanvasViewport() {
  const {
    workspace,
    renderer,
    activeTool,
    activeDocumentId,
    zoom,
    pan,
    viewportWidth,
    viewportHeight,
    docWidth,
    docHeight,
    bgColor,
    setHoverHandle,
    syncViewport,
    moveSnapEnabled,
    cropRect, setCropRect,
    cropInteractionMode, setCropInteractionMode,
    cropMode,
    cropGuideMode,
    cropAspect,
    cropRotation, setCropRotation,
    modernCropFrame, setModernCropFrame,
    modernCropImageTransform, setModernCropImageTransform,
    resetModernCrop,
    commitModernCropState,
    hiddenCropPreview, setHiddenCropPreview,
    cropDeletePixels,
    cropFillEnabled,
    cropFillSource,
    cropFillCustomColor,
    cropSizeTarget,
    setCropAspect,
    setCropMode,
    setCropSizeTarget,
    clearCropStacks,
    setActiveTool,
    setSelectedLayerId,
    layerTransformSession,
    scheduler,
  } = useEditor();

  const {
    onPaintStroke,
    commitBrushStroke,
    setOverlayCanvasRef,
    getOverlayCanvasRef,
  } = useBrushOverlay();

  let canvasContainerRef!: HTMLDivElement;
  let canvasRef!: HTMLCanvasElement;
  let lastModernCropSessionKey: string | null = null;

  const {
    isSpacePressed,
    setIsSpacePressed,
    isPanning,
    setIsPanning,
    stopMomentum,
    handleWheel,
    onViewportPointerDown,
    onViewportPointerMove,
    onViewportPointerUp,
    onViewportPointerCancel,
    onViewportLostPointerCapture,
  } = usePanNavigation({
    getCanvasContainerRef: () => canvasContainerRef,
    fitToScreenAndRender: () => fitToScreenAndRender(),
  });

  // Alt key state for eyedropper shortcut (Alt+Brush/Eraser)
  const [isAltPressed, setIsAltPressed] = createSignal(false);

  // Active crop handle drag state
  const [isCropDragging, setIsCropDragging] = createSignal(false);

  const [pendingPasteboardCropGesture, setPendingPasteboardCropGesture] =
    createSignal<{
      pointerId: number;
      startClient: { clientX: number; clientY: number };
      startDocument: { x: number; y: number };
      replacementStarted: boolean;
    } | null>(null);

  const modernImageTransformStyle = createMemo(() => {
    const frame = modernCropFrame();
    const transform = modernCropImageTransform();
    if (!frame) {
      return `translate3d(${pan().x + transform.offsetX}px, ${pan().y + transform.offsetY}px, 0) scale(${zoom() * transform.scale})`;
    }

    const pivot = getModernCropImagePivot({
      frame,
      viewport: {
        width: viewportWidth(),
        height: viewportHeight(),
        panX: pan().x,
        panY: pan().y,
        zoom: zoom(),
      },
      transform,
    });

    return [
      `translate3d(${pivot.screen.x}px, ${pivot.screen.y}px, 0)`,
      `rotate(${transform.rotation}deg)`,
      `scale(${zoom() * transform.scale})`,
      `translate3d(${-pivot.document.x}px, ${-pivot.document.y}px, 0)`,
    ].join(" ");
  });

  const resolvedCropFillColor = createMemo(() => (
    cropFillSource() === "background" ? bgColor() : cropFillCustomColor()
  ));

  const classicCropFillPreviewStyle = createMemo(() => {
    const rect = cropRect();
    if (!rect) return {};
    return {
      position: "absolute" as const,
      left: `${pan().x + rect.x * zoom()}px`,
      top: `${pan().y + rect.y * zoom()}px`,
      width: `${rect.w * zoom()}px`,
      height: `${rect.h * zoom()}px`,
      "background-color": resolvedCropFillColor(),
      transform: `rotate(${cropRotation()}deg)`,
      "transform-origin": "center",
      "pointer-events": "none" as const,
    };
  });

  const modernCropFillPreviewStyle = createMemo(() => {
    const frame = modernCropFrame();
    if (!frame) return {};
    return {
      position: "absolute" as const,
      left: `${(viewportWidth() - frame.w) / 2}px`,
      top: `${(viewportHeight() - frame.h) / 2}px`,
      width: `${frame.w}px`,
      height: `${frame.h}px`,
      "background-color": resolvedCropFillColor(),
      "pointer-events": "none" as const,
    };
  });

  const screenToDocumentPoint = (e: PointerEvent) => {
    const rect = canvasContainerRef?.getBoundingClientRect();
    const engine = workspace.getActiveEngine();
    if (!rect || !engine) return { x: e.clientX, y: e.clientY };
    return screenToDocument(e.clientX, e.clientY, rect, engine.getViewport());
  };

  const {
    isFitTransition,
    fitToScreenAndRender,
  } = useViewportRenderer({
    getCanvasContainerRef: () => canvasContainerRef,
    getCanvasRef: () => canvasRef,
    getOverlayCanvasRef: () => getOverlayCanvasRef() || undefined,
  });

  const {
    cropDragPreview,
    snapLines,
    setSnapLines,
    selectionBox,
    setSelectionBoxSignal,
    hudInfo,
    setHudInfo,
    handleDoubleClick,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onCanvasPointerCancel,
    onCanvasLostPointerCapture,
  } = useCanvasPointerTools({
    getCanvasContainerRef: () => canvasContainerRef,
    getCanvasRef: () => canvasRef,
    isSpacePressed,
    isPanning,
    isAltPressed,
    stopMomentum,
    fitToScreenAndRender,
    commitBrushStroke,
    onPaintStroke,
  });

  const {
    cropSnapTargets,
  } = useCanvasDerivedState({
    getCanvasContainerRef: () => canvasContainerRef,
    getCanvasRef: () => canvasRef,
    isSpacePressed,
    isPanning,
    isAltPressed,
  });

  // Reset Classic crop state when switching documents to prevent stale
  // cropRect/cropRotation from leaking across documents with different dimensions.
  let prevDocIdForCropReset: string | null = null;
  createEffect(() => {
    const docId = activeDocumentId();
    if (prevDocIdForCropReset !== null && prevDocIdForCropReset !== docId) {
      setCropRect(null);
      setCropRotation(0);
      setCropMode("free");
      setCropAspect(null);
      setCropSizeTarget(null);
      setHiddenCropPreview(null);
      clearCropStacks();
    }
    prevDocIdForCropReset = docId;
  });

  // Modern crop keeps the frame in viewport coordinates, independent of cropRect.
  createEffect(() => {
    if (activeTool() !== "crop" || cropInteractionMode() !== "modern") {
      if (lastModernCropSessionKey !== null) {
        resetModernCrop();
      }
      lastModernCropSessionKey = null;
      return;
    }

    // Build aspect from current mode so frame stays in sync with option bar
    const mode = cropMode();
    const ratioAspect = cropAspect();
    const sizeTarget = cropSizeTarget();
    const aspect = mode === "ratio" && ratioAspect
      ? ratioAspect
      : mode === "size" && sizeTarget && sizeTarget.w > 0 && sizeTarget.h > 0
        ? { w: sizeTarget.w, h: sizeTarget.h }
        : null;

    const aspectKey = aspect ? `${aspect.w}x${aspect.h}` : "";
    const sessionKey = `${activeDocumentId() ?? "none"}:${viewportWidth()}x${viewportHeight()}:${zoom()}:${mode}:${aspectKey}`;
    if (lastModernCropSessionKey !== sessionKey) {
      lastModernCropSessionKey = sessionKey;
      setModernCropFrame(getDefaultModernCropFrame({
        viewportWidth: viewportWidth(),
        viewportHeight: viewportHeight(),
        docWidth: docWidth(),
        docHeight: docHeight(),
        zoom: zoom(),
        scale: modernCropImageTransform().scale,
        aspect,
      }));
    }
  });

  // Classic crop: initialize preview on entry when mode is constrained
  createEffect(() => {
    if (activeTool() !== "crop" || cropInteractionMode() !== "classic") return;

    const mode = cropMode();
    if (mode === "free") return;
    if (cropRect() !== null || hiddenCropPreview() !== null) return;

    const docW = docWidth();
    const docH = docHeight();
    if (docW <= 0 || docH <= 0) return;

    if (mode === "ratio") {
      const a = cropAspect();
      if (a) {
        setCropRect(fitCropRectToAspect(a, docW, docH, cropRotation()));
      }
    } else if (mode === "size") {
      const t = cropSizeTarget();
      if (t && t.w > 0 && t.h > 0) {
        setCropRect(fitCropRectToAspect(t, docW, docH, cropRotation()));
      }
    }
  });

  // Alt key and shortcuts Setup
  useCanvasKeyboard({
    isSpacePressed,
    setIsSpacePressed,
    isAltPressed,
    setIsAltPressed,
    isPanning,
    setIsPanning,
    stopMomentum,
    fitToScreenAndRender,
    syncViewport,
    getCanvasContainerRef: () => canvasContainerRef,
  });


  const isPasteboardPointerDown = (e: PointerEvent) => {
    return e.target === canvasContainerRef;
  };

  const handlePasteboardPointerDown = (e: PointerEvent) => {
    if (!isPasteboardPointerDown(e)) return;
    if (e.button !== 0) return;

    if (activeTool() === "crop") {
      if (isSpacePressed() || isPanning()) return;
      if (cropInteractionMode() === "modern") return;

      const startDocument = screenToDocumentPoint(e);
      setPendingPasteboardCropGesture({
        pointerId: e.pointerId,
        startClient: { clientX: e.clientX, clientY: e.clientY },
        startDocument,
        replacementStarted: false,
      });
      (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const engine = workspace.getActiveEngine();
    const action = getPasteboardClickAction({
      hasDocument: Boolean(engine),
      activeTool: activeTool(),
      isNavigationMode: isSpacePressed() || isPanning(),
      hasLayerTransformSession: Boolean(layerTransformSession()),
      hasCropRect: Boolean(cropRect()),
      hasSelectionPreview: Boolean(selectionBox()),
    });

    if (action === "noop") return;

    e.preventDefault();
    e.stopPropagation();

    if (action === "clear-active-layer" && engine) {
      engine.setActiveLayer(null);
      setSelectedLayerId(null);
      setHoverHandle(null);
      setSnapLines([]);
      setHudInfo(null);
      scheduler.requestRender();
      return;
    }

    if (action === "clear-selection-preview") {
      setSelectionBoxSignal(null);
      setSnapLines([]);
      setHudInfo(null);
      scheduler.requestRender();
      return;
    }
  };

  const handlePasteboardPointerMove = (e: PointerEvent) => {
    const pending = pendingPasteboardCropGesture();
    if (pending && e.pointerId === pending.pointerId) {
      if (!hasCropReplacementDragDistance(pending.startClient, e)) {
        return;
      }

      const nextRect = createCropRectFromDocumentPoints(
        pending.startDocument,
        screenToDocumentPoint(e),
      );
      if (!nextRect) {
        return;
      }

      setHiddenCropPreview(null);
      setCropRotation(0);
      setCropRect(nextRect);
      setPendingPasteboardCropGesture({ ...pending, replacementStarted: true });
      e.preventDefault();
    }
  };

  const handlePasteboardPointerUp = (e: PointerEvent) => {
    const pending = pendingPasteboardCropGesture();
    if (pending && e.pointerId === pending.pointerId) {
      setPendingPasteboardCropGesture(null);
      try {
        (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
      } catch {}

      if (!pending.replacementStarted && !hasCropReplacementDragDistance(pending.startClient, e)) {
        hideCropPreview({
          cropRect,
          cropRotation,
          hiddenCropPreview,
          setCropRect,
          setCropRotation,
          setHiddenCropPreview,
        });
        setHoverHandle(null);
        setSnapLines([]);
        setHudInfo(null);
        scheduler.requestRender();
      }

      e.preventDefault();
    }
  };

  const handlePasteboardPointerCancel = (e: PointerEvent) => {
    const pending = pendingPasteboardCropGesture();
    if (pending && e.pointerId === pending.pointerId) {
      setPendingPasteboardCropGesture(null);
    }
  };

  return (
    <div
      ref={canvasContainerRef}
      id="canvas-container"
      data-viewport-container
      class="flex-1 relative overflow-hidden bg-editor-canvas"
      onWheel={handleWheel}
      onDblClick={handleDoubleClick}
      onPointerDown={(e) => {
        if (isSpacePressed() || isPanning()) {
          onViewportPointerDown(e);
          return;
        }
        handlePasteboardPointerDown(e);
        if (!e.defaultPrevented) onViewportPointerDown(e);
      }}
      onPointerMove={(e) => {
        if (isPanning()) {
          onViewportPointerMove(e);
          return;
        }
        handlePasteboardPointerMove(e);
        if (!e.defaultPrevented) onViewportPointerMove(e);
      }}
      onPointerUp={(e) => {
        if (isPanning()) {
          onViewportPointerUp(e);
          return;
        }
        handlePasteboardPointerUp(e);
        if (!e.defaultPrevented) onViewportPointerUp(e);
      }}
      onPointerCancel={(e) => {
        handlePasteboardPointerCancel(e);
        onViewportPointerCancel(e);
      }}
      onLostPointerCapture={onViewportLostPointerCapture}
    >
      {/* CSS Transform container — GPU-accelerated pan/zoom */}
      <Show when={workspace.getActiveEngine()}>
        {/* WebGL Canvas — outside transform div for 1:1 pixel mapping.
            The canvas pixel buffer is Math.round(docWidth * zoom * dpr) but the
            CSS box inside a scale(zoom) parent would be docWidth before transform.
            This creates a downscale then upscale cycle — bilinear filtering bleeds
            transparent pixels from outside the canvas onto edge pixels, causing the
            "visible thin gap" at high zoom. By placing the canvas outside, its CSS
            dimensions exactly match its pixel buffer (at dpr=1), eliminating the
            filtering artifact. */}
        <Show when={activeTool() === "crop" && cropFillEnabled() && cropInteractionMode() === "classic" && cropRect()}>
          <div
            data-crop-fill-preview="classic"
            style={classicCropFillPreviewStyle()}
          />
        </Show>
        <Show when={activeTool() === "crop" && cropFillEnabled() && cropInteractionMode() === "modern" && modernCropFrame()}>
          <div
            data-crop-fill-preview="modern"
            style={modernCropFillPreviewStyle()}
          />
        </Show>
        <canvas
          ref={canvasRef}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerCancel}
          onLostPointerCapture={onCanvasLostPointerCapture}
          style={{
            position: "absolute",
            left: cropInteractionMode() === "modern" && activeTool() === "crop" ? "0px" : `${pan().x}px`,
            top: cropInteractionMode() === "modern" && activeTool() === "crop" ? "0px" : `${pan().y}px`,
            width: cropInteractionMode() === "modern" && activeTool() === "crop"
              ? `${docWidth()}px`
              : `${Math.round(docWidth() * zoom())}px`,
            height: cropInteractionMode() === "modern" && activeTool() === "crop"
              ? `${docHeight()}px`
              : `${Math.round(docHeight() * zoom())}px`,
            transform: cropInteractionMode() === "modern" && activeTool() === "crop"
              ? modernImageTransformStyle()
              : undefined,
            "transform-origin": "0 0",
            "image-rendering": "auto",
            transition: isPanning() || isFitTransition() || isCropDragging()
              ? "none"
              : cropInteractionMode() === "modern" && activeTool() === "crop"
                ? "transform 0.15s cubic-bezier(0.2, 0, 0, 1)"
                : "left 0.15s cubic-bezier(0.2, 0, 0, 1), top 0.15s cubic-bezier(0.2, 0, 0, 1)",
          }}
        />
        <div
          style={{
            transform: cropInteractionMode() === "modern" && activeTool() === "crop"
              ? modernImageTransformStyle()
              : `translate3d(${pan().x}px, ${pan().y}px, 0) scale(${zoom()})`,
            "transform-origin": "0 0",
            transition: isPanning() || isFitTransition() || isCropDragging() ? "none" : "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
            "will-change": isPanning() || isCropDragging() ? "transform" : "auto",
            position: "absolute",
            width: `${docWidth()}px`,
            height: `${docHeight()}px`,
            "pointer-events": "none",
          }}
        >

          {/* Overlay canvas — sync 2D brush preview, no createImageBitmap per move */}
          <canvas
            ref={setOverlayCanvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              "pointer-events": "none",
            }}
          />

          {/* Artboard border & shadow */}
          <div
            class="absolute inset-0 pointer-events-none border border-white/10"
            style={{
              "box-shadow": "0 0 0 1px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(0, 0, 0, 0.7)",
            }}
          />

          {/* SVG Overlay Layer in document space */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              "pointer-events": "none",
            }}
          >
            {/* Selection marquee — document-space coordinates */}
            <Show when={selectionBox()}>
              {(box) => (
                <rect
                  x={box().x}
                  y={box().y}
                  width={box().w}
                  height={box().h}
                  fill="none"
                  stroke="#E15A17"
                  stroke-width={1 / zoom()}
                  stroke-dasharray="4 4"
                  class="animate-dash"
                  style={{ "pointer-events": "none" }}
                />
              )}
            </Show>
            <HoverHighlight />
            <SmartGuides lines={snapLines()} />
            <BrushCursorOverlay />
            <Show when={hudInfo()}>
              {(h) => (
                <TransformHud
                  mode={h().mode}
                  clientX={h().clientX}
                  clientY={h().clientY}
                  zoom={zoom()}
                  deltaX={h().deltaX}
                  deltaY={h().deltaY}
                  width={h().width}
                  height={h().height}
                  scalePercent={h().scalePercent}
                  angle={h().angle}
                  snapActive={h().snapActive}
                />
              )}
            </Show>
          </svg>

          {/* SelectionTransformOverlay — document-space coordinates */}
          <Show when={activeTool() === "move"}>
            <SelectionTransformOverlay
              isNavigationMode={isSpacePressed() || isPanning()}
              onHudUpdate={setHudInfo}
              onComputeSnap={(rect) => {
                const engine = workspace.getActiveEngine();
                if (!engine) return { dx: 0, dy: 0, lines: [] };
                const movingId = engine.getActiveLayerId();
                const docW = engine.getWidth();
                const docH = engine.getHeight();
                const layerTargets: SnapRect[] = engine.getLayers()
                  .filter((l) => l.visible && l.id !== movingId)
                  .map((l) => {
                    const aabb = getLayerAabb(l.transform, l.width, l.height);
                    return { x: aabb.x, y: aabb.y, w: aabb.width, h: aabb.height };
                  });
                const snapTargets: SnapRect[] = [
                  { x: 0, y: 0, w: docW, h: docH, snapThreshold: 12, snapPriority: 3 },
                  { x: docW / 2, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
                  { x: -Infinity, y: docH / 2, w: Infinity, h: 0, snapThreshold: 6, snapPriority: 2 },
                  ...layerTargets,
                ];
                const result = computeSnapAdjustment(rect, snapTargets);
                setSnapLines(result.lines);
                return result;
              }}
              onSnapClear={() => setSnapLines([])}
              onScreenToDoc={(cx, cy) => {
                const rect = canvasContainerRef?.getBoundingClientRect();
                const engine = workspace.getActiveEngine();
                if (!rect || !engine) return { x: cx / zoom(), y: cy / zoom() };
                return screenToDocument(cx, cy, rect, engine.getViewport());
              }}
              snapActive={snapLines().length > 0}
            />
          </Show>

          {/* Classic Crop Overlay — document-space crop rect with pointer capture */}
          <Show when={activeTool() === "crop" && cropInteractionMode() === "classic" && cropRect()}>
            <CropOverlay
              isNavigationMode={isSpacePressed() || isPanning()}
              cropRect={cropRect()}
              guideMode={cropGuideMode()}
              canvasWidth={docWidth()}
              canvasHeight={docHeight()}
              zoom={zoom()}
              cropMode={cropMode()}
              cropAspect={cropAspect()}
              cropRotation={cropRotation()}
              deleteCropped={cropDeletePixels()}
              onCropRectChange={(rect) => setCropRect(rect)}
              onCropRotationChange={setCropRotation}
              onHoverHandleChange={setHoverHandle}
              snapTargets={cropSnapTargets()}
              snapEnabled={moveSnapEnabled()}
              onSnapLines={setSnapLines}
              onDragStateChange={setIsCropDragging}
              hiddenCropPreview={hiddenCropPreview()}
              onHiddenCropPreviewChange={setHiddenCropPreview}
                  onApplyCrop={() => {
                    applyCropPreview({
                      workspace,
                      renderer,
                      cropRect: cropRect(),
                      cropMode: cropMode(),
                      cropSizeTarget: cropSizeTarget(),
                      cropDeletePixels: cropDeletePixels(),
                      cropFillColor: cropFillEnabled() ? resolvedCropFillColor() : null,
                      cropRotation: cropRotation(),
                      scheduler,
                      setCropRect,
                      setCropRotation,
                      setHiddenCropPreview,
                      setActiveTool,
                      setSelectedLayerId,
                      recenterViewport: () => fitToScreenAndRender(),
                    });
                  }}
            />
          </Show>
        </div>
        <Show when={activeTool() === "crop" && cropInteractionMode() === "modern" && modernCropFrame()}>
          {(frame) => {
            const sa = () => cropMode() === "size" && cropSizeTarget() ? cropSizeTarget() : null;
            const ea = () => cropMode() === "ratio" ? cropAspect() : sa();
            return (
            <ModernCropOverlay
              isNavigationMode={isSpacePressed() || isPanning()}
              frame={frame()}
              imageTransform={modernCropImageTransform()}
              viewportWidth={viewportWidth()}
              viewportHeight={viewportHeight()}
              projectedWidth={docWidth() * zoom() * (modernCropImageTransform().scale ?? 1)}
              projectedHeight={docHeight() * zoom() * (modernCropImageTransform().scale ?? 1)}
              cropMode={cropMode()}
              cropAspect={ea()}
              guideMode={cropGuideMode()}
              onFrameChange={setModernCropFrame}
              onImageTransformChange={setModernCropImageTransform}
              onHoverHandleChange={setHoverHandle}
              onDragStateChange={setIsCropDragging}
              onModernCropCommit={() => commitModernCropState()}
              onApplyCrop={() => {
                const f = modernCropFrame();
                if (!f) return;
                const rect = modernFrameToCropRect({
                  frame: f,
                  viewport: {
                    width: viewportWidth(),
                    height: viewportHeight(),
                    panX: pan().x,
                    panY: pan().y,
                    zoom: zoom(),
                  },
                  transform: modernCropImageTransform(),
                });
                applyCropPreview({
                  workspace, renderer,
                  cropRect: rect,
                  cropMode: cropMode(),
                  cropSizeTarget: cropSizeTarget(),
                  cropDeletePixels: cropDeletePixels(),
                  cropFillColor: cropFillEnabled() ? resolvedCropFillColor() : null,
                  cropRotation: getModernCropApplyRotation(modernCropImageTransform().rotation),
                  scheduler,
                  setCropRect, setCropRotation, setHiddenCropPreview, setActiveTool,
                  setSelectedLayerId,
                  recenterViewport: () => fitToScreenAndRender(),
                });
                resetModernCrop();
              }}
            />);
          }}
        </Show>

        {/* Crop drag preview — screen-space selection rectangle */}
        <Show when={cropDragPreview()}>
          {(box) => (
            <div data-crop-drag-preview="" style={{
              position: "absolute",
              left: `${box().x}px`,
              top: `${box().y}px`,
              width: `${box().w}px`,
              height: `${box().h}px`,
              outline: "1.5px dashed #E15A17",
              "pointer-events": "none",
              "z-index": 45,
            }} />
          )}
        </Show>
      </Show>
      <BrushContextMenu />
    </div>
  );
}
