import type { DocumentEngine } from "../engine/document";
import type { CommandHistory } from "../engine/history";
import type { SnapLine, SnapRect, SnapResult } from "./smartGuides";
import type { PaintToolSettings } from "@/components/editor/brushToolState";
import { getLayerAabb } from "./transformGeometry";

export type ToolType = "move" | "selection" | "crop" | "eyedropper" | "brush" | "eraser";

export interface ToolContext {
  fgColor: string;
  bgColor: string;
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  selectedLayerId: string | null;
  isAltPressed: boolean;
  isShiftPressed?: boolean;

  // Transient interactive state
  isDragging: boolean;
  dragStart: { x: number; y: number };
  dragCurrent: { x: number; y: number };
  strokePoints: { x: number; y: number }[];
  dragTool: ToolType | null;
  
  // Custom updates
  setFgColor?: (c: string) => void;
  setBgColor?: (c: string) => void;
  onSelectionCreated?: (x: number, y: number, w: number, h: number) => void;
  onCropCreated?: (x: number, y: number, w: number, h: number) => void;
  paintSettings: PaintToolSettings;
  onPaintStroke?: (
    points: { x: number; y: number }[],
    isEraser: boolean,
    settings: PaintToolSettings,
  ) => void;
  onHoverHandle?: (handle: string | null) => void;
  onComputeSnap?: (rect: SnapRect) => SnapResult;
  onSnapLines?: (lines: SnapLine[]) => void;

  // Selection move support
  selectionBounds?: { x: number; y: number; width: number; height: number } | null;
  onSelectionMoved?: (x: number, y: number) => void;
  onSelectionRotated?: (angle: number) => void;
  onRotateStart?: (centerX: number, centerY: number) => void;
  dragMode?: "draw" | "move-selection" | "rotate-selection" | null;
  rotateCenter?: { x: number; y: number };
  rotateStartAngle?: number;
  selectionAngle?: number;
}

export function handlePointerDown(
  tool: ToolType,
  docX: number,
  docY: number,
  engine: DocumentEngine,
  history: CommandHistory,
  requestRender: () => void,
  context: ToolContext
): void {
  context.dragTool = tool;
  context.isDragging = true;
  context.dragStart = { x: docX, y: docY };
  context.dragCurrent = { x: docX, y: docY };

  if (tool === "selection") {
    const bounds = context.selectionBounds;
    if (bounds && isPointInSelection(docX, docY, bounds)) {
      context.dragMode = "move-selection";
      context.dragStart = { x: docX - bounds.x, y: docY - bounds.y };
    } else {
      context.dragMode = "draw";
      context.onSelectionCreated?.(docX, docY, 0, 0);
    }
  } else if (tool === "crop") {
    context.onCropCreated?.(docX, docY, 0, 0);
  } else if (tool === "brush" || tool === "eraser") {
    if (!context.strokePoints || context.strokePoints.length === 0) {
      context.strokePoints = [{ x: docX, y: docY }];
    }
    context.onPaintStroke?.([...context.strokePoints], tool === "eraser", context.paintSettings);
  } else if (tool === "eyedropper") {
    const color = engine.samplePixel(docX, docY);
    const hex = rgbToHex(color[0], color[1], color[2]);
    context.setFgColor?.(hex);
  } else if (tool === "move" && context.selectedLayerId) {
    const layer = engine.getLayer(context.selectedLayerId);
    if (layer && !layer.locked) {
      // Commit state snapshot BEFORE translate moves
      history.commit(engine.snapshot());
      context.dragStart = { x: docX - layer.transform.x, y: docY - layer.transform.y };
    }
  }
  requestRender();
}

export function handlePointerMove(
  _tool: ToolType,
  docX: number,
  docY: number,
  engine: DocumentEngine,
  requestRender: () => void,
  context: ToolContext
): void {
  if (!context.isDragging) return;
  context.dragCurrent = { x: docX, y: docY };

  const tool = context.dragTool ?? _tool;
  if (tool === "selection") {
    if (context.dragMode === "move-selection") {
      const newX = docX - context.dragStart.x;
      const newY = docY - context.dragStart.y;
      context.onSelectionMoved?.(newX, newY);
    } else if (context.dragMode === "rotate-selection" && context.rotateCenter) {
      const cx = context.rotateCenter.x;
      const cy = context.rotateCenter.y;
      const startAngle = context.rotateStartAngle ?? 0;
      const currentAngle = Math.atan2(docY - cy, docX - cx) * (180 / Math.PI);
      let newAngle = currentAngle - startAngle;
      if (context.isShiftPressed) {
        newAngle = Math.round(newAngle / 15) * 15;
      }
      newAngle = ((newAngle % 360) + 360) % 360;
      if (newAngle > 180) newAngle -= 360;
      context.onSelectionRotated?.(newAngle);
    } else {
      const centerX = context.dragStart.x;
      const centerY = context.dragStart.y;
      const dx = docX - centerX;
      const dy = docY - centerY;

      let w = Math.abs(dx);
      let h = Math.abs(dy);

      if (context.isShiftPressed) {
        const side = Math.max(w, h);
        w = side;
        h = side;
      }

      if (context.isAltPressed) {
        w *= 2;
        h *= 2;
      }

      let x: number;
      let y: number;

      if (context.isAltPressed) {
        x = centerX - w / 2;
        y = centerY - h / 2;
      } else {
        x = Math.min(centerX, docX);
        y = Math.min(centerY, docY);
      }

      context.onSelectionCreated?.(x, y, w, h);
    }
  } else if (tool === "crop") {
    const x = Math.min(context.dragStart.x, docX);
    const y = Math.min(context.dragStart.y, docY);
    const w = Math.abs(context.dragStart.x - docX);
    const h = Math.abs(context.dragStart.y - docY);
    context.onCropCreated?.(x, y, w, h);
  } else if (tool === "brush" || tool === "eraser") {
    context.strokePoints.push({ x: docX, y: docY });
    context.onPaintStroke?.([...context.strokePoints], tool === "eraser", context.paintSettings);
  } else if (tool === "eyedropper") {
    const color = engine.samplePixel(docX, docY);
    const hex = rgbToHex(color[0], color[1], color[2]);
    context.setFgColor?.(hex);
  } else if (tool === "move" && context.selectedLayerId) {
    const layer = engine.getLayer(context.selectedLayerId);
    if (layer && !layer.locked) {
      const newX = docX - context.dragStart.x;
      const newY = docY - context.dragStart.y;
      let nextX = newX;
      let nextY = newY;
      if (!context.isAltPressed && context.onComputeSnap) {
        const baseAabb = getLayerAabb(layer.transform, layer.width, layer.height);
        const snap = context.onComputeSnap({
          x: baseAabb.x + (newX - layer.transform.x),
          y: baseAabb.y + (newY - layer.transform.y),
          w: baseAabb.width,
          h: baseAabb.height,
        });
        nextX += snap.dx;
        nextY += snap.dy;
        context.onSnapLines?.(snap.lines);
      } else {
        context.onSnapLines?.([]);
      }
      engine.moveLayer(context.selectedLayerId, nextX, nextY);
    }
  }
  requestRender();
}

export function handlePointerUp(
  _tool: ToolType,
  docX: number,
  docY: number,
  engine: DocumentEngine,
  history: CommandHistory,
  requestRender: () => void,
  context: ToolContext
): void {
  if (!context.isDragging) return;
  context.isDragging = false;
  context.dragCurrent = { x: docX, y: docY };

  const tool = context.dragTool ?? _tool;
  if (tool === "selection") {
    if (context.dragMode === "move-selection") {
      const newX = docX - context.dragStart.x;
      const newY = docY - context.dragStart.y;
      context.onSelectionMoved?.(newX, newY);
    } else if (context.dragMode === "rotate-selection") {
      // Rotation is already applied live via onSelectionRotated in move handler
    } else {
      const centerX = context.dragStart.x;
      const centerY = context.dragStart.y;
      const dx = docX - centerX;
      const dy = docY - centerY;

      let w = Math.abs(dx);
      let h = Math.abs(dy);

      if (context.isShiftPressed) {
        const side = Math.max(w, h);
        w = side;
        h = side;
      }

      if (context.isAltPressed) {
        w *= 2;
        h *= 2;
      }

      let x: number;
      let y: number;

      if (context.isAltPressed) {
        x = centerX - w / 2;
        y = centerY - h / 2;
      } else {
        x = Math.min(centerX, docX);
        y = Math.min(centerY, docY);
      }

      if (w > 2 && h > 2) {
        engine.createSelection(x, y, w, h);
      } else {
        engine.clearSelection();
      }
    }
    context.dragMode = null;
  } else if (tool === "brush" || tool === "eraser") {
    if (context.selectedLayerId && context.strokePoints.length > 0) {
      context.onPaintStroke?.([...context.strokePoints], tool === "eraser", context.paintSettings);
    }
    context.strokePoints = [];
  } else if (tool === "crop") {
    const x = Math.min(context.dragStart.x, docX);
    const y = Math.min(context.dragStart.y, docY);
    const w = Math.abs(context.dragStart.x - docX);
    const h = Math.abs(context.dragStart.y - docY);
    if (w > 2 && h > 2) {
      context.onCropCreated?.(x, y, w, h);
    }
  } else if (tool === "move") {
    context.onSnapLines?.([]);
  }
  requestRender();
}

// Hex converter helper
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, c)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

export function isPointInSelection(
  px: number,
  py: number,
  bounds: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    px >= bounds.x &&
    px <= bounds.x + bounds.width &&
    py >= bounds.y &&
    py <= bounds.y + bounds.height
  );
}
