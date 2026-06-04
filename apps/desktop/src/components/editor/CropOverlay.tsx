import { createSignal, createMemo, Show, For } from "solid-js";
import type { CropRect } from "@/viewport/cropGeometry";
import {
  constrainCropRectToDocument,
  applyCropResizeHandle,
  applyCropMove,
} from "@/viewport/cropGeometry";
import { getCursorForHandle, normalizeRotation } from "@/viewport/transformGeometry";
import { getRotateCursorByPos } from "@/viewport/cursorRotate";
import { useEditor } from "./EditorContext";
import { snapCropRect, type CropSnapTargets } from "@/viewport/cropSnap";
import type { SnapLine } from "@/viewport/smartGuides";

interface CropOverlayProps {
  cropRect: CropRect | null;
  guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  cropMode: "free" | "ratio" | "size";
  cropAspect: { w: number; h: number } | null;
  cropRotation?: number;
  onCropRectChange: (rect: CropRect) => void;
  onCropRotationChange?: (angle: number) => void;
  onHoverHandleChange?: (handle: string | null) => void;
  snapTargets?: CropSnapTargets;
  snapEnabled?: boolean;
  onSnapLines?: (lines: SnapLine[]) => void;
  onRotationStart?: () => void;
  onRotationCommit?: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

const HANDLE_TYPES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

const HANDLE_SIZE = 8;
/** Screen-space hit target ~10px per side at any zoom (matches SelectionTransformOverlay). */
const HANDLE_HIT = 20;
const ROTATE_OUTER = 44;

const BRACKET_LENGTH = 12;

function CornerBrackets(props: { x: number; y: number; w: number; h: number; zoom: number }) {
  const z = props.zoom;
  const L = BRACKET_LENGTH / z;
  return (
    <>
      <path d={`M ${props.x - L} ${props.y} L ${props.x} ${props.y} L ${props.x} ${props.y - L}`} fill="none" stroke="white" stroke-width={1.5 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      <path d={`M ${props.x + props.w + L} ${props.y} L ${props.x + props.w} ${props.y} L ${props.x + props.w} ${props.y - L}`} fill="none" stroke="white" stroke-width={1.5 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      <path d={`M ${props.x - L} ${props.y + props.h} L ${props.x} ${props.y + props.h} L ${props.x} ${props.y + props.h + L}`} fill="none" stroke="white" stroke-width={1.5 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      <path d={`M ${props.x + props.w + L} ${props.y + props.h} L ${props.x + props.w} ${props.y + props.h} L ${props.x + props.w} ${props.y + props.h + L}`} fill="none" stroke="white" stroke-width={1.5 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
    </>
  );
}

function GridLines(props: { x: number; y: number; w: number; h: number; zoom: number }) {
  const n = () => Math.max(1, Math.ceil(Math.sqrt(props.w * props.h) / 64));
  const z = props.zoom;
  return (
    <For each={Array.from({ length: n() - 1 }, (_, i) => i + 1)}>
      {(i) => (
        <>
          <line x1={props.x + (props.w * i) / n()} y1={props.y} x2={props.x + (props.w * i) / n()} y2={props.y + props.h} stroke="rgba(255,255,255,0.2)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.x} y1={props.y + (props.h * i) / n()} x2={props.x + props.w} y2={props.y + (props.h * i) / n()} stroke="rgba(255,255,255,0.2)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        </>
      )}
    </For>
  );
}

export function CropOverlay(props: CropOverlayProps) {
  let sdk: any;
  try {
    sdk = useEditor();
  } catch (e) {
    sdk = {
      pan: () => ({ x: 0, y: 0 }),
      hoverPos: () => null,
      setHoverPos: () => {},
      commitCropState: () => {}
    };
  }
  const { pan, hoverPos, setHoverPos, commitCropState } = sdk;
  let svgRef: SVGSVGElement | undefined;

  const [activeHandle, setActiveHandle] = createSignal<string | null>(null);
  const [hoverHandle, setHoverHandle] = createSignal<string | null>(null);
  const [tooltip, setTooltip] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragState, setDragState] = createSignal<{
    handle: string;
    startRect: CropRect;
    startPointer: { x: number; y: number };
    pointerId: number;
    startRotation?: number;
    startClientX: number;
    startClientY: number;
    startPan?: { x: number; y: number };
  } | null>(null);

  let tooltipTimeoutId = 0;

  const hs = () => HANDLE_SIZE / props.zoom;
  const ht = () => HANDLE_HIT / props.zoom;
  const ro = () => ROTATE_OUTER / props.zoom;

  const cropRotationValue = () => props.cropRotation ?? 0;
  const cropRectCenter = createMemo(() => {
    const rect = props.cropRect;
    if (!rect) return { x: 0, y: 0 };
    return {
      x: rect.x + rect.w / 2,
      y: rect.y + rect.h / 2,
    };
  });

  const setHover = (handle: string | null) => {
    setHoverHandle(handle);
    props.onHoverHandleChange?.(handle);
  };

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

  const getSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return { x: (clientX - r.left) / props.zoom, y: (clientY - r.top) / props.zoom };
  };

  const rotateCursor = createMemo(() => {
    const hp = hoverPos();
    const drag = dragState();
    if (!props.cropRect) return "crosshair";
    if (!hp) {
      if (drag?.handle.startsWith("rotate")) return "grabbing";
      return "crosshair";
    }
    const z = props.zoom;
    const p = pan();
    const bb = {
      x: props.cropRect.x * z + p.x,
      y: props.cropRect.y * z + p.y,
      w: props.cropRect.w * z,
      h: props.cropRect.h * z,
    };
    return getRotateCursorByPos(hp, bb);
  });

  const resolvedCursor = createMemo(() => {
    const handle = hoverHandle();
    const drag = dragState();
    if (drag?.handle.startsWith("rotate")) return rotateCursor();
    if (!handle) return "crosshair";
    if (handle.startsWith("rotate")) return rotateCursor();
    if (handle === "move") return "move";
    return getCursorForHandle(handle, 0, 1, 1);
  });

  const startDrag = (e: PointerEvent, handle: string) => {
    const rect = props.cropRect;
    if (!rect || !svgRef) return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    if (!pt) return;

    svgRef.setPointerCapture(e.pointerId);

    if (handle.startsWith("rotate")) {
      setDragState({
        handle,
        startRect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
        startPointer: { x: pt.x, y: pt.y },
        pointerId: e.pointerId,
        startRotation: props.cropRotation,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPan: pan ? { x: pan().x, y: pan().y } : undefined,
      });
      props.onRotationStart?.();
    } else {
      setDragState({
        handle,
        startRect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
        startPointer: { x: pt.x, y: pt.y },
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPan: pan ? { x: pan().x, y: pan().y } : undefined,
      });
      if (handle !== "move") setActiveHandle(handle);
    }
    props.onDragStateChange?.(true);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) {
      if (!drag && hoverHandle()?.startsWith("rotate")) {
        setHoverPos({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    const pt = getSvgPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (drag.handle.startsWith("rotate")) {
      const cx = drag.startRect.x + drag.startRect.w / 2;
      const cy = drag.startRect.y + drag.startRect.h / 2;
      const startAngle = Math.atan2(drag.startPointer.y - cy, drag.startPointer.x - cx);
      const currentAngle = Math.atan2(pt.y - cy, pt.x - cx);
      let deg = (drag.startRotation ?? 0) + (currentAngle - startAngle) * (180 / Math.PI);

      if (e.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      deg = normalizeRotation(deg);
      props.onCropRotationChange?.(deg);
      setHoverPos({ x: e.clientX, y: e.clientY });

      if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
      tooltipTimeoutId = 0;
      setTooltip({ x: pt.x, y: pt.y, w: drag.startRect.w, h: drag.startRect.h });
      return;
    }

    // Calculate delta using client screen coordinates to prevent feedback loop during viewport panning
    const dxScreen = e.clientX - drag.startClientX;
    const dyScreen = e.clientY - drag.startClientY;
    const dx = dxScreen / props.zoom;
    const dy = dyScreen / props.zoom;
    let newRect: CropRect;

    const docW = props.canvasWidth;
    const docH = props.canvasHeight;

    if (drag.handle === "new") {
      // Calculate drawn rectangle
      const startPt = drag.startPointer;
      let w = Math.abs(pt.x - startPt.x);
      let h = Math.abs(pt.y - startPt.y);

      // Resolve aspect ratio constraint
      const constraint = props.cropMode;
      const aspect = constraint === "ratio" && props.cropAspect ? props.cropAspect : (constraint === "size" && props.cropAspect ? props.cropAspect : null);
      
      const shouldKeepAspect = e.shiftKey || aspect !== null;
      if (shouldKeepAspect) {
        const ratio = aspect ? (aspect.w / aspect.h) : 1;
        if (w / h > ratio) {
          h = w / ratio;
        } else {
          w = h * ratio;
        }
      }

      let x = pt.x < startPt.x ? startPt.x - w : startPt.x;
      let y = pt.y < startPt.y ? startPt.y - h : startPt.y;

      if (e.altKey) {
        // Grow from center
        x = startPt.x - w;
        y = startPt.y - h;
        w = w * 2;
        h = h * 2;
      }

      newRect = constrainCropRectToDocument({ x, y, w, h }, docW, docH);
    } else if (drag.handle === "move") {
      newRect = applyCropMove(drag.startRect, dx, dy, docW, docH);
    } else {
      const constraint = props.cropMode;
      const aspect = constraint === "ratio" && props.cropAspect ? props.cropAspect : null;
      newRect = applyCropResizeHandle(drag.startRect, drag.handle, dx, dy, {
        constraint,
        aspect,
        shift: e.shiftKey,
        alt: e.altKey,
      });
      newRect = constrainCropRectToDocument(newRect, docW, docH);
    }

    if (props.snapEnabled !== false && props.snapTargets && !e.altKey) {
      const threshold = 12 / props.zoom;
      const snapped = snapCropRect(newRect, drag.handle, props.snapTargets, threshold);
      newRect = constrainCropRectToDocument(snapped.rect, docW, docH);
      props.onSnapLines?.(snapped.lines);
    } else {
      props.onSnapLines?.([]);
    }

    props.onCropRectChange(newRect);

    // Pan the viewport in the opposite direction to keep the crop box visually stationary or centered (skip for new draws)
    if (drag.handle !== "new") {
      const oldCX = drag.startRect.x + drag.startRect.w / 2;
      const oldCY = drag.startRect.y + drag.startRect.h / 2;
      const newCX = newRect.x + newRect.w / 2;
      const newCY = newRect.y + newRect.h / 2;
      const actualDx = newCX - oldCX;
      const actualDy = newCY - oldCY;

      const engine = sdk.workspace?.getActiveEngine();
      if (engine && drag.startPan) {
        engine.setViewport({
          panX: drag.startPan.x - actualDx * props.zoom,
          panY: drag.startPan.y - actualDy * props.zoom,
        });
        sdk.syncViewport?.();
        sdk.scheduler?.requestRender();
      }

      if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
      tooltipTimeoutId = 0;
      // Offset the tooltip coordinate because the SVG element has panned
      setTooltip({
        x: pt.x + actualDx,
        y: pt.y + actualDy,
        w: newRect.w,
        h: newRect.h
      });
    } else {
      if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
      tooltipTimeoutId = 0;
      setTooltip({
        x: pt.x,
        y: pt.y,
        w: newRect.w,
        h: newRect.h
      });
    }
  };

  const clearDrag = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (svgRef) { try { svgRef.releasePointerCapture(e.pointerId); } catch {} }

    if (drag.handle.startsWith("rotate")) {
      props.onRotationCommit?.();
    } else if (drag.handle === "new") {
      // If the drawn rect is too small (e.g. accidental click), revert or keep default
      const finalRect = props.cropRect;
      if (finalRect && (finalRect.w < 5 || finalRect.h < 5)) {
        props.onCropRectChange(drag.startRect);
      }
    }

    // Save pre-drag crop state for undo/redo when crop rect changed
    if (drag.handle !== "new") {
      const finalRect = props.cropRect;
      const hasChange = finalRect &&
        (finalRect.x !== drag.startRect.x ||
         finalRect.y !== drag.startRect.y ||
         finalRect.w !== drag.startRect.w ||
         finalRect.h !== drag.startRect.h ||
         (drag.handle.startsWith("rotate") && props.cropRotation !== drag.startRotation));
      if (hasChange) {
        commitCropState(
          { x: drag.startRect.x, y: drag.startRect.y, w: drag.startRect.w, h: drag.startRect.h },
          drag.startRotation ?? props.cropRotation ?? 0
        );
      }
    }

    setDragState(null);
    setActiveHandle(null);
    props.onSnapLines?.([]);
    props.onDragStateChange?.(false);
    if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
    tooltipTimeoutId = window.setTimeout(() => setTooltip(null), 1500);
  };

  const handleLostPointerCapture = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) return;

    if (drag.handle.startsWith("rotate")) {
      props.onRotationCommit?.();
    }

    setDragState(null);
    setActiveHandle(null);
    props.onSnapLines?.([]);
    props.onDragStateChange?.(false);
  };

  const clearHover = () => {
    if (!dragState()) {
      setHover(null);
      setHoverPos(null);
    }
  };

  const handleSvgPointerDown = (e: PointerEvent) => {
    // If clicking outside any specific handle/move area, start drawing a new crop box
    if (e.button !== 0) return; // Left click only
    const target = e.target as SVGElement;
    if (target === svgRef || target.getAttribute("mask") || target.style.pointerEvents === "none" || target.style.cursor === "crosshair") {
      const pt = getSvgPoint(e.clientX, e.clientY);
      if (!pt || !svgRef) return;

      e.preventDefault();
      svgRef.setPointerCapture(e.pointerId);

      const previousRect = props.cropRect;
      const initialRect = { x: pt.x, y: pt.y, w: 0, h: 0 };
      props.onCropRectChange(initialRect);

      setDragState({
        handle: "new",
        startRect: previousRect ? { x: previousRect.x, y: previousRect.y, w: previousRect.w, h: previousRect.h } : initialRect,
        startPointer: { x: pt.x, y: pt.y },
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
      });

      props.onDragStateChange?.(true);
    }
  };

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
          "pointer-events": "auto",
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
              x={0} y={0}
              width={props.canvasWidth}
              height={props.canvasHeight}
              fill="white"
              transform={cropRotationValue() !== 0 ? `rotate(${-cropRotationValue()} ${cropRectCenter().x} ${cropRectCenter().y})` : undefined}
            />
            <rect x={props.cropRect!.x} y={props.cropRect!.y} width={props.cropRect!.w} height={props.cropRect!.h} fill="black" />
          </mask>
        </defs>
        <rect
          x={-props.canvasWidth}
          y={-props.canvasHeight}
          width={props.canvasWidth * 3}
          height={props.canvasHeight * 3}
          fill="rgba(0,0,0,0.5)"
          mask="url(#crop-shield)"
          style={{ "pointer-events": "none" }}
        />
        <rect
          x={props.cropRect!.x} y={props.cropRect!.y} width={props.cropRect!.w} height={props.cropRect!.h}
          fill="none" stroke="white"
          stroke-width={1 / props.zoom}
          vector-effect="non-scaling-stroke"
          style={{ "pointer-events": "none" }}
        />
        <CornerBrackets x={props.cropRect!.x} y={props.cropRect!.y} w={props.cropRect!.w} h={props.cropRect!.h} zoom={props.zoom} />
        <Show when={props.guideMode === "thirds"}>
          <line x1={props.cropRect!.x + props.cropRect!.w / 3} y1={props.cropRect!.y} x2={props.cropRect!.x + props.cropRect!.w / 3} y2={props.cropRect!.y + props.cropRect!.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.cropRect!.x + 2 * props.cropRect!.w / 3} y1={props.cropRect!.y} x2={props.cropRect!.x + 2 * props.cropRect!.w / 3} y2={props.cropRect!.y + props.cropRect!.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.cropRect!.x} y1={props.cropRect!.y + props.cropRect!.h / 3} x2={props.cropRect!.x + props.cropRect!.w} y2={props.cropRect!.y + props.cropRect!.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.cropRect!.x} y1={props.cropRect!.y + 2 * props.cropRect!.h / 3} x2={props.cropRect!.x + props.cropRect!.w} y2={props.cropRect!.y + 2 * props.cropRect!.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        </Show>
        <Show when={props.guideMode === "grid"}>
          <GridLines x={props.cropRect!.x} y={props.cropRect!.y} w={props.cropRect!.w} h={props.cropRect!.h} zoom={props.zoom} />
        </Show>
        <Show when={props.guideMode === "diagonal"}>
          <line x1={props.cropRect!.x} y1={props.cropRect!.y} x2={props.cropRect!.x + props.cropRect!.w} y2={props.cropRect!.y + props.cropRect!.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.cropRect!.x + props.cropRect!.w} y1={props.cropRect!.y} x2={props.cropRect!.x} y2={props.cropRect!.y + props.cropRect!.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        </Show>
        <Show when={props.guideMode === "golden"}>
          <line x1={props.cropRect!.x + props.cropRect!.w * 0.382} y1={props.cropRect!.y} x2={props.cropRect!.x + props.cropRect!.w * 0.382} y2={props.cropRect!.y + props.cropRect!.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.cropRect!.x + props.cropRect!.w * 0.618} y1={props.cropRect!.y} x2={props.cropRect!.x + props.cropRect!.w * 0.618} y2={props.cropRect!.y + props.cropRect!.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.cropRect!.x} y1={props.cropRect!.y + props.cropRect!.h * 0.382} x2={props.cropRect!.x + props.cropRect!.w} y2={props.cropRect!.y + props.cropRect!.h * 0.382} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.cropRect!.x} y1={props.cropRect!.y + props.cropRect!.h * 0.618} x2={props.cropRect!.x + props.cropRect!.w} y2={props.cropRect!.y + props.cropRect!.h * 0.618} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        </Show>

        {/* Move hit zone — below handles so corners/edges win */}
        <rect
          x={props.cropRect!.x}
          y={props.cropRect!.y}
          width={props.cropRect!.w}
          height={props.cropRect!.h}
          fill="transparent"
          data-crop-move
          style={{ cursor: "move", "pointer-events": "all" }}
          onPointerDown={(e) => startDrag(e, "move")}
          onPointerEnter={() => setHover("move")}
          onPointerLeave={() => { if (!dragState()) setHover(null); }}
        />

        <For each={handles()}>
          {(h) => {
            const hitSize = ht();
            const cursor = getCursorForHandle(h.type, 0, 1, 1);
            return (
              <g>
                {/* Corner rotate zone ring (only for corners) */}
                <Show when={["nw", "ne", "se", "sw"].includes(h.type)}>
                  <path
                    d={`M ${h.cx} ${h.cy - ro()} 
                        A ${ro()} ${ro()} 0 1 1 ${h.cx} ${h.cy + ro()} 
                        A ${ro()} ${ro()} 0 1 1 ${h.cx} ${h.cy - ro()} Z
                        M ${h.cx} ${h.cy - ht()} 
                        A ${ht()} ${ht()} 0 1 0 ${h.cx} ${h.cy + ht()} 
                        A ${ht()} ${ht()} 0 1 0 ${h.cx} ${h.cy - ht()} Z`}
                    fill="transparent"
                    fill-rule="evenodd"
                    style={{ "pointer-events": "all" }}
                    onPointerDown={(e) => startDrag(e, `rotate-${h.type}`)}
                    onPointerEnter={(e) => {
                      setHover(`rotate-${h.type}`);
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onPointerLeave={() => {
                      if (dragState()) return;
                      setHover(null);
                      setHoverPos(null);
                    }}
                  />
                </Show>
                <rect
                  x={h.cx - hitSize / 2}
                  y={h.cy - hitSize / 2}
                  width={hitSize}
                  height={hitSize}
                  fill="transparent"
                  data-crop-handle={h.type}
                  style={{ cursor, "pointer-events": "all" }}
                  onPointerDown={(e) => startDrag(e, h.type)}
                  onPointerEnter={() => setHover(h.type)}
                  onPointerLeave={() => { if (!dragState()) setHover(null); }}
                />
                <rect
                  x={h.cx - h.size / 2}
                  y={h.cy - h.size / 2}
                  width={h.size}
                  height={h.size}
                  fill={activeHandle() === h.type ? "#E15A17"
                    : hoverHandle() === h.type ? "#ccc"
                    : "white"}
                  stroke="#333"
                  stroke-width={1 / props.zoom}
                  vector-effect="non-scaling-stroke"
                  style={{ "pointer-events": "none" }}
                />
              </g>
            );
          }}
        </For>

        <Show when={tooltip()}>
          {(t) => (
            <g
              transform={`translate(${t().x} ${t().y}) scale(${1 / props.zoom})`}
              style={{ "pointer-events": "none" }}
            >
              <rect
                x={12}
                y={-24}
                width={dragState()?.handle.startsWith("rotate") ? 70 : 120}
                height={22}
                rx={4}
                fill="rgba(20,20,20,0.9)"
                stroke="rgba(255,255,255,0.15)"
                stroke-width={1}
              />
              <text
                x={20}
                y={-9}
                fill="#E15A17"
                font-size="11"
                font-weight="bold"
                font-family="monospace"
                style={{ "user-select": "none" }}
              >
                {dragState()?.handle.startsWith("rotate")
                  ? `${(props.cropRotation ?? 0).toFixed(1)}°`
                  : `${Math.round(t().w)} × ${Math.round(t().h)} px`}
              </text>
            </g>
          )}
        </Show>
      </svg>
    </Show>
  );
}
