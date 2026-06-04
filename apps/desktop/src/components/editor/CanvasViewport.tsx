import { createSignal, Show } from "solid-js";
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
import { CropModeIndicator } from "./CropModeIndicator";
import { TransformHud } from "./TransformHud";

export function CanvasViewport() {
  const {
    workspace,
    activeTool,
    zoom,
    pan,
    docWidth,
    docHeight,
    setHoverHandle,
    syncViewport,
    moveSnapEnabled,
    cropRect, setCropRect,
    cropMode,
    cropGuideMode,
    cropAspect,
    cropRotation, setCropRotation,
  } = useEditor();

  const {
    onPaintStroke,
    commitBrushStroke,
    setOverlayCanvasRef,
    getOverlayCanvasRef,
  } = useBrushOverlay();

  let canvasContainerRef!: HTMLDivElement;
  let canvasRef!: HTMLCanvasElement;

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
  } = usePanNavigation({
    getCanvasContainerRef: () => canvasContainerRef,
    fitToScreenAndRender: () => fitToScreenAndRender(),
  });

  // Alt key state for eyedropper shortcut (Alt+Brush/Eraser)
  const [isAltPressed, setIsAltPressed] = createSignal(false);

  // Active crop handle drag state
  const [isCropDragging, setIsCropDragging] = createSignal(false);

  const {
    isFitTransition,
    fitToScreenAndRender,
  } = useViewportRenderer({
    getCanvasContainerRef: () => canvasContainerRef,
    getCanvasRef: () => canvasRef,
    getOverlayCanvasRef: () => getOverlayCanvasRef() || undefined,
  });

  const {
    snapLines,
    setSnapLines,
    selectionBox,
    hudInfo,
    setHudInfo,
    handleDoubleClick,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
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


  return (
    <div
      ref={canvasContainerRef}
      id="canvas-container"
      data-viewport-container
      class="flex-1 relative overflow-hidden bg-editor-canvas"
      onWheel={handleWheel}
      onDblClick={handleDoubleClick}
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
    >
      {/* CSS Transform container — GPU-accelerated pan/zoom */}
      <Show when={workspace.getActiveEngine()}>
        <div
          style={{
            transform: `translate3d(${pan().x}px, ${pan().y}px, 0) scale(${zoom()})`,
            "transform-origin": "0 0",
            transition: isPanning() || isFitTransition() || isCropDragging() ? "none" : "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
            "will-change": isPanning() || isCropDragging() ? "transform" : "auto",
            position: "absolute",
            width: `${docWidth()}px`,
            height: `${docHeight()}px`,
          }}
        >
          {/* WebGL Canvas — fills document space */}
          <canvas
            ref={canvasRef}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              transform: activeTool() === "crop" && cropRect() && cropRotation() !== 0 ? `rotate(${-cropRotation()}deg)` : "none",
              "transform-origin": activeTool() === "crop" && cropRect() ? `${cropRect()!.x + cropRect()!.w / 2}px ${cropRect()!.y + cropRect()!.h / 2}px` : "center center",
            }}
          />

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
              transform: activeTool() === "crop" && cropRect() && cropRotation() !== 0 ? `rotate(${-cropRotation()}deg)` : "none",
              "transform-origin": activeTool() === "crop" && cropRect() ? `${cropRect()!.x + cropRect()!.w / 2}px ${cropRect()!.y + cropRect()!.h / 2}px` : "center center",
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

          {/* Crop Overlay — self-contained SVG with pointer capture */}
          <Show when={activeTool() === "crop" && cropRect()}>
            <CropOverlay
              cropRect={cropRect()}
              guideMode={cropGuideMode()}
              canvasWidth={docWidth()}
              canvasHeight={docHeight()}
              zoom={zoom()}
              cropMode={cropMode()}
              cropAspect={cropAspect()}
              cropRotation={cropRotation()}
              onCropRectChange={(rect) => setCropRect(rect)}
              onCropRotationChange={setCropRotation}
              onHoverHandleChange={setHoverHandle}
              snapTargets={cropSnapTargets()}
              snapEnabled={moveSnapEnabled()}
              onSnapLines={setSnapLines}
              onDragStateChange={setIsCropDragging}
            />
          </Show>
        </div>

        {/* Crop mode indicator bar — placed outside pan/zoom div so it stays fixed on screen */}
        <CropModeIndicator isActive={activeTool() === "crop"} />
      </Show>
    </div>
  );
}
