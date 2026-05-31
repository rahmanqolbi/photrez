import type { DocumentEngine } from "../engine/document";
import type { CommandHistory } from "../engine/history";

export type ToolType = "move" | "selection" | "crop" | "eyedropper" | "brush" | "eraser";

export interface ToolContext {
  fgColor: string;
  bgColor: string;
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  selectedLayerId: string | null;

  // Transient interactive state
  isDragging: boolean;
  dragStart: { x: number; y: number };
  dragCurrent: { x: number; y: number };
  strokePoints: { x: number; y: number }[];
  
  // Custom updates
  setFgColor?: (c: string) => void;
  setBgColor?: (c: string) => void;
  onSelectionCreated?: (x: number, y: number, w: number, h: number) => void;
  onCropCreated?: (x: number, y: number, w: number, h: number) => void;
  onPaintStroke?: (points: { x: number; y: number }[], isEraser: boolean) => void;
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
  context.isDragging = true;
  context.dragStart = { x: docX, y: docY };
  context.dragCurrent = { x: docX, y: docY };

  if (tool === "selection") {
    // Start rectangular selection marquee
    context.onSelectionCreated?.(docX, docY, 0, 0);
  } else if (tool === "crop") {
    context.onCropCreated?.(docX, docY, 0, 0);
  } else if (tool === "brush" || tool === "eraser") {
    history.commit(engine.snapshot());
    context.strokePoints = [{ x: docX, y: docY }];
    context.onPaintStroke?.([...context.strokePoints], tool === "eraser");
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
  tool: ToolType,
  docX: number,
  docY: number,
  engine: DocumentEngine,
  requestRender: () => void,
  context: ToolContext
): void {
  if (!context.isDragging) return;
  context.dragCurrent = { x: docX, y: docY };

  if (tool === "selection") {
    const x = Math.min(context.dragStart.x, docX);
    const y = Math.min(context.dragStart.y, docY);
    const w = Math.abs(context.dragStart.x - docX);
    const h = Math.abs(context.dragStart.y - docY);
    context.onSelectionCreated?.(x, y, w, h);
  } else if (tool === "crop") {
    const x = Math.min(context.dragStart.x, docX);
    const y = Math.min(context.dragStart.y, docY);
    const w = Math.abs(context.dragStart.x - docX);
    const h = Math.abs(context.dragStart.y - docY);
    context.onCropCreated?.(x, y, w, h);
  } else if (tool === "brush" || tool === "eraser") {
    context.strokePoints.push({ x: docX, y: docY });
    context.onPaintStroke?.([...context.strokePoints], tool === "eraser");
  } else if (tool === "eyedropper") {
    const color = engine.samplePixel(docX, docY);
    const hex = rgbToHex(color[0], color[1], color[2]);
    context.setFgColor?.(hex);
  } else if (tool === "move" && context.selectedLayerId) {
    const layer = engine.getLayer(context.selectedLayerId);
    if (layer && !layer.locked) {
      const newX = docX - context.dragStart.x;
      const newY = docY - context.dragStart.y;
      engine.moveLayer(context.selectedLayerId, newX, newY);
    }
  }
  requestRender();
}

export function handlePointerUp(
  tool: ToolType,
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

  if (tool === "selection") {
    const x = Math.min(context.dragStart.x, docX);
    const y = Math.min(context.dragStart.y, docY);
    const w = Math.abs(context.dragStart.x - docX);
    const h = Math.abs(context.dragStart.y - docY);
    if (w > 2 && h > 2) {
      engine.createSelection(x, y, w, h);
    } else {
      engine.clearSelection();
    }
  } else if (tool === "brush" || tool === "eraser") {
    if (context.selectedLayerId && context.strokePoints.length > 0) {
      context.onPaintStroke?.([...context.strokePoints], tool === "eraser");
    }
    context.strokePoints = [];
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
