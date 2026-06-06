import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
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
import { createCropRectFromDocumentPoints } from "./cropToolActions";
import type { CropPreview } from "./cropState";

interface UseCropOverlayDragParams {
  isNavigationMode: () => boolean;
  cropRect: () => CropRect | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  cropMode: "free" | "ratio" | "size";
  cropAspect: { w: number; h: number } | null;
  cropRotation?: () => number | undefined;
  onCropRectChange: (rect: CropRect) => void;
  onCropRotationChange?: (angle: number) => void;
  onHoverHandleChange?: (handle: string | null) => void;
  snapTargets?: CropSnapTargets;
  snapEnabled?: boolean;
  onSnapLines?: (lines: SnapLine[]) => void;
  onRotationStart?: () => void;
  onRotationCommit?: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
  getSvgRef: () => SVGSVGElement | undefined;
  onHiddenCropPreviewChange?: (preview: CropPreview | null) => void;
}

export function useCropOverlayDrag(params: UseCropOverlayDragParams) {
  let sdk: any;
  try {
    sdk = useEditor();
  } catch (e) {
    sdk = {
      pan: () => ({ x: 0, y: 0 }),
      hoverPos: () => null,
      setHoverPos: () => {},
      commitCropState: () => {},
    };
  }
  const { pan, hoverPos, setHoverPos, commitCropState } = sdk;

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

  const cropRotationValue = () => params.cropRotation?.() ?? 0;

  const setHover = (handle: string | null) => {
    setHoverHandle(handle);
    params.onHoverHandleChange?.(handle);
  };

  const getSvgPoint = (clientX: number, clientY: number) => {
    const svg = params.getSvgRef();
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return { x: (clientX - r.left) / params.zoom, y: (clientY - r.top) / params.zoom };
  };

  const rotateCursor = createMemo(() => {
    const hp = hoverPos();
    const drag = dragState();
    const rect = params.cropRect();
    if (!rect) return "crosshair";
    if (!hp) {
      if (drag?.handle.startsWith("rotate")) return "grabbing";
      return "crosshair";
    }
    const z = params.zoom;
    const p = pan();
    const bb = {
      x: rect.x * z + p.x,
      y: rect.y * z + p.y,
      w: rect.w * z,
      h: rect.h * z,
    };
    return getRotateCursorByPos(hp, bb);
  });

  const resolvedCursor = createMemo(() => {
    const handle = hoverHandle();
    const drag = dragState();
    if (params.isNavigationMode()) return drag ? "grabbing" : "grab";
    if (drag?.handle.startsWith("rotate")) return rotateCursor();
    if (!handle) return "crosshair";
    if (handle.startsWith("rotate")) return rotateCursor();
    if (handle === "move") return "move";
    return getCursorForHandle(handle, 0, 1, 1);
  });

  const startDrag = (e: PointerEvent, handle: string) => {
    if (params.isNavigationMode()) return;
    const rect = params.cropRect();
    const svg = params.getSvgRef();
    if (!rect || !svg) return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    if (!pt) return;

    svg.setPointerCapture(e.pointerId);

    if (handle.startsWith("rotate")) {
      setDragState({
        handle,
        startRect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
        startPointer: { x: pt.x, y: pt.y },
        pointerId: e.pointerId,
        startRotation: params.cropRotation?.(),
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPan: pan ? { x: pan().x, y: pan().y } : undefined,
      });
      params.onRotationStart?.();
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
    params.onDragStateChange?.(true);
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
      params.onCropRotationChange?.(deg);
      setHoverPos({ x: e.clientX, y: e.clientY });

      if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
      tooltipTimeoutId = 0;
      setTooltip({ x: pt.x, y: pt.y, w: drag.startRect.w, h: drag.startRect.h });
      return;
    }

    // Calculate delta using client screen coordinates to prevent feedback loop during viewport panning
    const dxScreen = e.clientX - drag.startClientX;
    const dyScreen = e.clientY - drag.startClientY;
    const dx = dxScreen / params.zoom;
    const dy = dyScreen / params.zoom;
    let newRect: CropRect;

    const docW = params.canvasWidth;
    const docH = params.canvasHeight;

    if (drag.handle === "new") {
      const replacement = createCropRectFromDocumentPoints(drag.startPointer, pt);
      if (replacement) {
        newRect = replacement;
      } else {
        newRect = { x: drag.startPointer.x, y: drag.startPointer.y, w: 0, h: 0 };
      }
    } else if (drag.handle === "move") {
      newRect = applyCropMove(drag.startRect, dx, dy, docW, docH);
    } else {
      const constraint = params.cropMode;
      const aspect = constraint === "ratio" && params.cropAspect ? params.cropAspect : null;
      newRect = applyCropResizeHandle(drag.startRect, drag.handle, dx, dy, {
        constraint,
        aspect,
        shift: e.shiftKey,
        alt: e.altKey,
      });
      newRect = constrainCropRectToDocument(newRect, docW, docH);
    }

    if (params.snapEnabled !== false && params.snapTargets && !e.altKey) {
      const threshold = 12 / params.zoom;
      const snapped = snapCropRect(newRect, drag.handle, params.snapTargets, threshold);
      newRect = constrainCropRectToDocument(snapped.rect, docW, docH);
      params.onSnapLines?.(snapped.lines);
    } else {
      params.onSnapLines?.([]);
    }

    params.onCropRectChange(newRect);

    if (drag.handle === "move") {
      const oldCX = drag.startRect.x + drag.startRect.w / 2;
      const oldCY = drag.startRect.y + drag.startRect.h / 2;
      const newCX = newRect.x + newRect.w / 2;
      const newCY = newRect.y + newRect.h / 2;
      const actualDx = newCX - oldCX;
      const actualDy = newCY - oldCY;

      const engine = sdk.workspace?.getActiveEngine();
      if (engine && drag.startPan) {
        engine.setViewport({
          panX: drag.startPan.x - actualDx * params.zoom,
          panY: drag.startPan.y - actualDy * params.zoom,
        });
        sdk.syncViewport?.();
        sdk.scheduler?.requestRender();
      }

      if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
      tooltipTimeoutId = 0;
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
    const svg = params.getSvgRef();
    if (svg) { try { svg.releasePointerCapture(e.pointerId); } catch {} }

    if (drag.handle.startsWith("rotate")) {
      params.onRotationCommit?.();
    } else if (drag.handle === "new") {
      const finalRect = params.cropRect();
      if (finalRect && (finalRect.w < 5 || finalRect.h < 5)) {
        params.onCropRectChange(drag.startRect);
        params.onCropRotationChange?.(drag.startRotation ?? 0);
      }
    }

    if (drag.handle !== "new") {
      const finalRect = params.cropRect();
      const hasChange = finalRect &&
        (finalRect.x !== drag.startRect.x ||
         finalRect.y !== drag.startRect.y ||
         finalRect.w !== drag.startRect.w ||
         finalRect.h !== drag.startRect.h ||
         (drag.handle.startsWith("rotate") && (params.cropRotation?.() ?? 0) !== drag.startRotation));
      if (hasChange) {
        commitCropState(
          { x: drag.startRect.x, y: drag.startRect.y, w: drag.startRect.w, h: drag.startRect.h },
          drag.startRotation ?? params.cropRotation?.() ?? 0
        );
      }
    }

    setDragState(null);
    setActiveHandle(null);
    params.onSnapLines?.([]);
    params.onDragStateChange?.(false);
    if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
    tooltipTimeoutId = window.setTimeout(() => setTooltip(null), 1500);
  };

  const handleLostPointerCapture = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) return;

    if (drag.handle.startsWith("rotate")) {
      params.onRotationCommit?.();
    }

    setDragState(null);
    setActiveHandle(null);
    params.onSnapLines?.([]);
    params.onDragStateChange?.(false);
  };

  const clearHover = () => {
    if (!dragState()) {
      setHover(null);
      setHoverPos(null);
    }
  };

  const handleSvgPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (params.isNavigationMode()) return;
    const target = e.target as SVGElement;
    const svg = params.getSvgRef();
    if (target === svg || target.getAttribute("mask") || target.style.pointerEvents === "none" || target.style.cursor === "crosshair") {
      const pt = getSvgPoint(e.clientX, e.clientY);
      if (!pt || !svg) return;

      e.preventDefault();
      svg.setPointerCapture(e.pointerId);

      const previousRect = params.cropRect();
      const initialRect = { x: pt.x, y: pt.y, w: 0, h: 0 };
      params.onCropRectChange(initialRect);
      const prevRotation = params.cropRotation?.() ?? 0;
      params.onCropRotationChange?.(0);
      params.onHiddenCropPreviewChange?.(null);

      setDragState({
        handle: "new",
        startRect: previousRect ? { x: previousRect.x, y: previousRect.y, w: previousRect.w, h: previousRect.h } : initialRect,
        startRotation: prevRotation,
        startPointer: { x: pt.x, y: pt.y },
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
      });

      params.onDragStateChange?.(true);
    }
  };

  onCleanup(() => {
    if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
  });

  return {
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
    hoverPos,
    setHoverPos,
  };
}
