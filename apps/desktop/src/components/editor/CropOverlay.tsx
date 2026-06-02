import { createSignal, createMemo, createEffect, onCleanup, Show, For } from "solid-js";
import type { CropRect } from "@/viewport/cropGeometry";
import { clampCropRect, applyCropResizeHandle, applyCropMove } from "@/viewport/cropGeometry";

interface CropOverlayProps {
  cropRect: CropRect | null;
  guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  cropMode: "free" | "ratio" | "size";
  cropAspect: { w: number; h: number } | null;
  onCropRectChange: (rect: CropRect) => void;
}

const HANDLE_TYPES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

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
  let groupRef: SVGGElement | undefined;

  const [activeHandle, setActiveHandle] = createSignal<string | null>(null);
  const [hoverHandle, setHoverHandle] = createSignal<string | null>(null);
  const [tooltip, setTooltip] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragState, setDragState] = createSignal<{
    handle: string;
    startRect: CropRect;
    startPointer: { x: number; y: number };
    pointerId: number;
  } | null>(null);

  let tooltipTimeoutId = 0;

  const hs = () => 8 / props.zoom;
  const hit = () => 16 / props.zoom;

  const handles = createMemo(() => {
    const rect = props.cropRect;
    if (!rect) return [];
    const { x, y, w, h } = rect;
    const H = hit();
    const _hs = hs();
    return HANDLE_TYPES.map((type) => {
      const cx = type.includes("w") ? x : type.includes("e") ? x + w : x + w / 2;
      const cy = type.includes("n") ? y : type.includes("s") ? y + h : y + h / 2;
      return { type, cx, cy, size: _hs, hitZone: H };
    });
  });

  const getSvgPoint = (clientX: number, clientY: number) => {
    const svg = groupRef?.closest("svg");
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return { x: (clientX - r.left) / props.zoom, y: (clientY - r.top) / props.zoom };
  };

  const handlePointerDown = (e: PointerEvent) => {
    const rect = props.cropRect;
    if (!rect) return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    if (!pt) return;

    for (const h of handles()) {
      const half = h.hitZone / 2;
      if (Math.abs(pt.x - h.cx) <= half && Math.abs(pt.y - h.cy) <= half) {
        const svg = groupRef?.closest("svg");
        if (svg) svg.setPointerCapture(e.pointerId);
        setDragState({
          handle: h.type,
          startRect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
          startPointer: { x: pt.x, y: pt.y },
          pointerId: e.pointerId,
        });
        setActiveHandle(h.type);
        return;
      }
    }

    if (pt.x >= rect.x && pt.x <= rect.x + rect.w && pt.y >= rect.y && pt.y <= rect.y + rect.h) {
      const svg = groupRef?.closest("svg");
      if (svg) svg.setPointerCapture(e.pointerId);
      setDragState({
        handle: "move",
        startRect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
        startPointer: { x: pt.x, y: pt.y },
        pointerId: e.pointerId,
      });
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    const drag = dragState();

    if (drag && e.pointerId === drag.pointerId) {
      const pt = getSvgPoint(e.clientX, e.clientY);
      if (!pt) return;
      const dx = pt.x - drag.startPointer.x;
      const dy = pt.y - drag.startPointer.y;
      let newRect: CropRect;

      if (drag.handle === "move") {
        newRect = applyCropMove(drag.startRect, dx, dy, props.canvasWidth, props.canvasHeight);
      } else {
        const aspect = props.cropMode === "ratio" && props.cropAspect ? props.cropAspect : null;
        newRect = applyCropResizeHandle(drag.startRect, drag.handle, dx, dy, aspect, e.shiftKey, e.altKey);
        newRect = clampCropRect(newRect, props.canvasWidth, props.canvasHeight);
      }

      props.onCropRectChange(newRect);

      if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
      tooltipTimeoutId = 0;
      setTooltip({ x: pt.x, y: pt.y, w: newRect.w, h: newRect.h });
    } else {
      const pt = getSvgPoint(e.clientX, e.clientY);
      if (!pt) return;
      let found: string | null = null;
      for (const h of handles()) {
        const half = h.hitZone / 2;
        if (Math.abs(pt.x - h.cx) <= half && Math.abs(pt.y - h.cy) <= half) {
          found = h.type;
          break;
        }
      }
      setHoverHandle(found);
    }
  };

  const clearDrag = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) return;
    const svg = groupRef?.closest("svg");
    if (svg) { try { svg.releasePointerCapture(e.pointerId); } catch {} }
    setDragState(null);
    setActiveHandle(null);
    if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
    tooltipTimeoutId = window.setTimeout(() => setTooltip(null), 1500);
  };

  createEffect(() => {
    const el = groupRef;
    if (!el) return;
    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", clearDrag);
    el.addEventListener("pointercancel", clearDrag);
    onCleanup(() => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", clearDrag);
      el.removeEventListener("pointercancel", clearDrag);
      if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
    });
  });

  return (
    <Show when={props.cropRect}>
      {(rect) => {
        const r = rect();
        const z = props.zoom;
        const hSize = hs();
        return (
          <g ref={groupRef} style={{ "pointer-events": "auto" }}>
            <defs>
              <mask id="crop-shield">
                <rect x={0} y={0} width={props.canvasWidth} height={props.canvasHeight} fill="white" />
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="black" />
              </mask>
            </defs>
            <rect
              x={0} y={0}
              width={props.canvasWidth}
              height={props.canvasHeight}
              fill="rgba(0,0,0,0.5)"
              mask="url(#crop-shield)"
              style={{ "pointer-events": "none" }}
            />
            <rect
              x={r.x} y={r.y} width={r.w} height={r.h}
              fill="none" stroke="white"
              stroke-width={1 / z}
              vector-effect="non-scaling-stroke"
              style={{ "pointer-events": "none" }}
            />
            <CornerBrackets x={r.x} y={r.y} w={r.w} h={r.h} zoom={z} />
            <Show when={props.guideMode === "thirds"}>
              <line x1={r.x + r.w / 3} y1={r.y} x2={r.x + r.w / 3} y2={r.y + r.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
              <line x1={r.x + 2 * r.w / 3} y1={r.y} x2={r.x + 2 * r.w / 3} y2={r.y + r.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
              <line x1={r.x} y1={r.y + r.h / 3} x2={r.x + r.w} y2={r.y + r.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
              <line x1={r.x} y1={r.y + 2 * r.h / 3} x2={r.x + r.w} y2={r.y + 2 * r.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
            </Show>
            <Show when={props.guideMode === "grid"}>
              <GridLines x={r.x} y={r.y} w={r.w} h={r.h} zoom={z} />
            </Show>
            <Show when={props.guideMode === "diagonal"}>
              <line x1={r.x} y1={r.y} x2={r.x + r.w} y2={r.y + r.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
              <line x1={r.x + r.w} y1={r.y} x2={r.x} y2={r.y + r.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
            </Show>
            <Show when={props.guideMode === "golden"}>
              <line x1={r.x + r.w * 0.382} y1={r.y} x2={r.x + r.w * 0.382} y2={r.y + r.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
              <line x1={r.x + r.w * 0.618} y1={r.y} x2={r.x + r.w * 0.618} y2={r.y + r.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
              <line x1={r.x} y1={r.y + r.h * 0.382} x2={r.x + r.w} y2={r.y + r.h * 0.382} stroke="rgba(255,255,255,0.35)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
              <line x1={r.x} y1={r.y + r.h * 0.618} x2={r.x + r.w} y2={r.y + r.h * 0.618} stroke="rgba(255,255,255,0.35)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
            </Show>
            <For each={handles()}>
              {(h) => {
                const fill = activeHandle() === h.type ? "#E15A17"
                  : hoverHandle() === h.type ? "#ccc"
                  : "white";
                return (
                  <rect
                    x={h.cx - h.size / 2}
                    y={h.cy - h.size / 2}
                    width={h.size}
                    height={h.size}
                    fill={fill}
                    stroke="#333"
                    stroke-width={1 / z}
                    vector-effect="non-scaling-stroke"
                    style={{ "pointer-events": "none" }}
                  />
                );
              }}
            </For>
            <Show when={tooltip()}>
              {(t) => (
                <g style={{ "pointer-events": "none" }}>
                  <rect x={t().x + 8} y={t().y - 22} width={110} height={18} rx={3} fill="rgba(0,0,0,0.75)" />
                  <text x={t().x + 14} y={t().y - 10} fill="white" font-size="11" font-family="monospace">
                    {Math.round(t().w)} × {Math.round(t().h)} px
                  </text>
                </g>
              )}
            </Show>
          </g>
        );
      }}
    </Show>
  );
}
