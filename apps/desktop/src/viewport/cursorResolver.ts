import type { ToolId } from "@/components/editor/tools/toolTypes";
import { getCursorForHandle } from "./transformGeometry";
import { getRotateCursorByPos, getRotateCursorForHandle } from "./cursorRotate";

export type ToolType = ToolId;

export interface CursorContext {
  isSpacePressed: boolean;
  isPanning: boolean;
  activeTool: ToolType;
  isAltPressed: boolean;
  hoverHandle: string | null;
  isLayerLocked: boolean;
  eyedropperTarget: string | null;
  /** When a non-modal color picker is open, canvas clicks sample color. */
  colorPickerOpen?: boolean;
  /** For rotation-aware cursor: the selected layer's current rotation */
  layerRotation?: number;
  /** For rotation-aware cursor: the selected layer's current scaleX */
  layerScaleX?: number;
  /** For rotation-aware cursor: the selected layer's current scaleY */
  layerScaleY?: number;
  /** Current mouse position (screen-space) for dynamic rotate cursor */
  hoverPos?: { x: number; y: number } | null;
  /** Layer bounding box (document-space) for dynamic rotate cursor */
  layerBoundingBox?: { x: number; y: number; w: number; h: number } | null;
}

export function resolveCursor(ctx: CursorContext): string {
  if (ctx.eyedropperTarget) return "crosshair";
  if (ctx.colorPickerOpen) return "crosshair";
  if (ctx.isSpacePressed) return ctx.isPanning ? "grabbing" : "grab";
  if (ctx.isAltPressed && (ctx.activeTool === "brush" || ctx.activeTool === "eraser")) return "copy";
  if (ctx.activeTool === "move" && ctx.isLayerLocked) return "default";

  if (ctx.activeTool === "move" && ctx.hoverHandle && ctx.hoverHandle !== "move" && !ctx.hoverHandle.startsWith("rotate")) {
    return getCursorForHandle(ctx.hoverHandle, ctx.layerRotation ?? 0, ctx.layerScaleX ?? 1, ctx.layerScaleY ?? 1);
  }

  if (ctx.activeTool === "move" && ctx.hoverHandle && ctx.hoverHandle.startsWith("rotate")) {
    if (ctx.hoverPos && ctx.layerBoundingBox) {
      return getRotateCursorByPos(ctx.hoverPos, ctx.layerBoundingBox);
    }
    return getRotateCursorForHandle(
      "se",
      ctx.layerRotation ?? 0,
      ctx.layerScaleX ?? 1,
      ctx.layerScaleY ?? 1
    );
  }
  if (ctx.activeTool === "move" && ctx.hoverHandle === "move") return "move";

  if (ctx.activeTool === "selection") return "crosshair";

  if (ctx.activeTool === "crop" && ctx.hoverHandle && ctx.hoverHandle !== "move") {
    return getCursorForHandle(ctx.hoverHandle, 0, 1, 1);
  }
  if (ctx.activeTool === "crop" && ctx.hoverHandle === "move") return "move";
  if (ctx.activeTool === "crop") return "crosshair";
  if (ctx.activeTool === "brush" || ctx.activeTool === "eraser") return "none";
  if (ctx.activeTool === "eyedropper") return "crosshair";
  return "default";
}
