import { createMemo, Show } from "solid-js";
import type { CropRect } from "@/viewport/cropGeometry";
import type { CropSnapTargets } from "@/viewport/cropSnap";
import type { SnapLine } from "@/viewport/smartGuides";
import { getRotateBandPath, ROTATE_BAND_PX, ROTATE_CORNER_EXTRA } from "@/viewport/rotateBand";
import { useCropOverlayDrag } from "./useCropOverlayDrag";
import { CropOverlayGuides } from "./CropOverlayGuides";
import { CropOverlayHandles } from "./CropOverlayHandles";
import { CropOverlayTooltip } from "./CropOverlayTooltip";
import type { CropPreview } from "./cropState";

interface CropOverlayProps {
  isNavigationMode?: boolean;
  cropRect: CropRect | null;
  guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  cropMode: "free" | "ratio" | "size";
  cropAspect: { w: number; h: number } | null;
  cropRotation?: number;
  deleteCropped?: boolean;
  onCropRectChange: (rect: CropRect) => void;
  onCropRotationChange?: (angle: number) => void;
  onHoverHandleChange?: (handle: string | null) => void;
  snapTargets?: CropSnapTargets;
  snapEnabled?: boolean;
  onSnapLines?: (lines: SnapLine[]) => void;
  onRotationStart?: () => void;
  onRotationCommit?: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onApplyCrop?: () => void;
  hiddenCropPreview?: CropPreview | null;
  onHiddenCropPreviewChange?: (preview: CropPreview | null) => void;
}

const HANDLE_TYPES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

const HANDLE_SIZE = 8;
const HANDLE_HIT = 20;

export function CropOverlay(props: CropOverlayProps) {
  let svgRef: SVGSVGElement | undefined;

  const navMode = () => props.isNavigationMode ?? false;

  const {
    activeHandle,
    hoverHandle,
    tooltip,
    dragState,
    resolvedCursor,
    startDrag,
    handlePointerMove,
    clearDrag,
    handleLostPointerCapture,
    clearHover,
    handleSvgPointerDown,
    setHover,
    cropRotationValue,
    setHoverPos,
  } = useCropOverlayDrag({
    isNavigationMode: navMode,
    cropRect: () => props.cropRect,
    canvasWidth: props.canvasWidth,
    canvasHeight: props.canvasHeight,
    zoom: props.zoom,
    cropMode: props.cropMode,
    cropAspect: props.cropAspect,
    cropRotation: () => props.cropRotation,
    onCropRectChange: props.onCropRectChange,
    onCropRotationChange: props.onCropRotationChange,
    onHoverHandleChange: props.onHoverHandleChange,
    snapTargets: props.snapTargets,
    snapEnabled: props.snapEnabled,
    onSnapLines: props.onSnapLines,
    onRotationStart: props.onRotationStart,
    onRotationCommit: props.onRotationCommit,
    onDragStateChange: props.onDragStateChange,
    getSvgRef: () => svgRef,
    onHiddenCropPreviewChange: props.onHiddenCropPreviewChange,
  });

  const cropRectCenter = createMemo(() => {
    const rect = props.cropRect;
    if (!rect) return { x: 0, y: 0 };
    return {
      x: rect.x + rect.w / 2,
      y: rect.y + rect.h / 2,
    };
  });

  const hs = () => HANDLE_SIZE / props.zoom;
  const ht = () => HANDLE_HIT / props.zoom;

  const handles = createMemo(() => {
    const rect = props.cropRect;
    if (!rect) return [];
    const { x, y, w, h } = rect;
    const _hs = hs();
    return HANDLE_TYPES.map((type) => {
      const cx = type.includes("w") ? x : type.includes("e") ? x + w : x + w / 2;
      const cy = type.includes("n") ? y : type.includes("s") ? y + h : y + h / 2;
      return { type, cx, cy, size: _hs };
    });
  });

  return (
    <Show when={props.cropRect}>
      <svg
        ref={svgRef}
        data-crop-overlay
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          "pointer-events": navMode() ? "none" : "auto",
          "z-index": 35,
        }}
        style:cursor={resolvedCursor()}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearDrag}
        onPointerCancel={clearDrag}
        onLostPointerCapture={handleLostPointerCapture}
        onPointerLeave={clearHover}
      >
        <defs>
          <mask id="crop-shield">
            <rect
              x={-props.canvasWidth}
              y={-props.canvasHeight}
              width={props.canvasWidth * 3}
              height={props.canvasHeight * 3}
              fill="white"
            />
            <rect
              x={props.cropRect!.x}
              y={props.cropRect!.y}
              width={props.cropRect!.w}
              height={props.cropRect!.h}
              fill="black"
              transform={cropRotationValue() !== 0 ? `rotate(${cropRotationValue()} ${cropRectCenter().x} ${cropRectCenter().y})` : undefined}
            />
          </mask>
        </defs>
        <rect
          x={-props.canvasWidth}
          y={-props.canvasHeight}
          width={props.canvasWidth * 3}
          height={props.canvasHeight * 3}
          fill={props.deleteCropped ? "#161618" : "rgba(0,0,0,0.5)"}
          fill-opacity={props.deleteCropped ? 0.98 : 1}
          mask="url(#crop-shield)"
          style={{ "pointer-events": "none" }}
        />
        <g transform={cropRotationValue() !== 0 ? `rotate(${cropRotationValue()} ${cropRectCenter().x} ${cropRectCenter().y})` : undefined}>
          <rect
            x={props.cropRect!.x} y={props.cropRect!.y} width={props.cropRect!.w} height={props.cropRect!.h}
            fill="none" stroke="white"
            stroke-width={1 / props.zoom}
            vector-effect="non-scaling-stroke"
            style={{ "pointer-events": "none" }}
          />
          <CropOverlayGuides
            x={props.cropRect!.x}
            y={props.cropRect!.y}
            w={props.cropRect!.w}
            h={props.cropRect!.h}
            zoom={props.zoom}
            guideMode={props.guideMode}
          />
          {/* 360° rotate band — behind move zone and handles */}
          <path
            d={getRotateBandPath(
              props.cropRect!.x,
              props.cropRect!.y,
              props.cropRect!.w,
              props.cropRect!.h,
              ROTATE_BAND_PX / props.zoom,
              ROTATE_CORNER_EXTRA / props.zoom,
            )}
            fill="transparent"
            fill-rule="evenodd"
            data-crop-rotate-band
            style={{ "pointer-events": navMode() ? "none" : "all" }}
            onPointerDown={(e) => startDrag(e, "rotate")}
            onPointerEnter={(e) => {
              setHover("rotate");
              setHoverPos({ x: e.clientX, y: e.clientY });
            }}
            onPointerMove={(e) => {
              if (hoverHandle() === "rotate" || dragState()?.handle.startsWith("rotate")) {
                setHoverPos({ x: e.clientX, y: e.clientY });
              }
            }}
            onPointerLeave={() => {
              if (!dragState()) {
                setHover(null);
                setHoverPos(null);
              }
            }}
          />
          {/* Move hit zone */}
          <rect
            x={props.cropRect!.x}
            y={props.cropRect!.y}
            width={props.cropRect!.w}
            height={props.cropRect!.h}
            fill="transparent"
            data-crop-move
            style={{ cursor: "move", "pointer-events": navMode() ? "none" : "all" }}
            onPointerDown={(e) => startDrag(e, "move")}
            onPointerEnter={() => setHover("move")}
            onPointerLeave={() => { if (!dragState()) setHover(null); }}
            onDblClick={(e) => {
              e.stopPropagation();
              props.onApplyCrop?.();
            }}
          />
          <CropOverlayHandles
            isNavigationMode={navMode()}
            handles={handles()}
            zoom={props.zoom}
            hitSize={ht()}
            activeHandle={activeHandle()}
            hoverHandle={hoverHandle()}
            isDragging={!!dragState()}
            startDrag={startDrag}
            setHover={setHover}
            setHoverPos={setHoverPos}
            cropRotation={cropRotationValue()}
          />
        </g>

        <Show when={tooltip()}>
          {(t) => (
            <CropOverlayTooltip
              x={t().x}
              y={t().y}
              w={t().w}
              h={t().h}
              zoom={props.zoom}
              cropRotation={props.cropRotation ?? 0}
              isRotate={!!dragState()?.handle.startsWith("rotate")}
            />
          )}
        </Show>
      </svg>
    </Show>
  );
}
