export type ToolType = "move" | "selection" | "crop" | "eyedropper" | "brush" | "eraser";
import { getCursorForHandle } from "./transformGeometry";

export interface CursorContext {
  isSpacePressed: boolean;
  isPanning: boolean;
  activeTool: ToolType;
  isAltPressed: boolean;
  hoverHandle: string | null;
  isLayerLocked: boolean;
  eyedropperTarget: string | null;
  /** For rotation-aware cursor: the selected layer's current rotation */
  layerRotation?: number;
  /** For rotation-aware cursor: the selected layer's current scaleX */
  layerScaleX?: number;
  /** For rotation-aware cursor: the selected layer's current scaleY */
  layerScaleY?: number;
}

export function resolveCursor(ctx: CursorContext): string {
  if (ctx.eyedropperTarget) return "crosshair";
  if (ctx.isSpacePressed) return ctx.isPanning ? "grabbing" : "grab";
  if (ctx.isAltPressed && (ctx.activeTool === "brush" || ctx.activeTool === "eraser")) return "crosshair";
  if (ctx.activeTool === "move" && ctx.isLayerLocked) return "default";

  if (ctx.activeTool === "move" && ctx.hoverHandle && ctx.hoverHandle !== "move" && ctx.hoverHandle !== "rotate") {
    return getCursorForHandle(ctx.hoverHandle, ctx.layerRotation ?? 0, ctx.layerScaleX ?? 1, ctx.layerScaleY ?? 1);
  }

  if (ctx.activeTool === "move" && ctx.hoverHandle === "rotate") return "crosshair";
  if (ctx.activeTool === "move" && ctx.hoverHandle === "move") return "move";

  if (ctx.activeTool === "selection") return "crosshair";
  if (ctx.activeTool === "crop") return "crosshair";
  if (ctx.activeTool === "brush" || ctx.activeTool === "eraser") return "none";
  if (ctx.activeTool === "eyedropper") return "copy";
  return "default";
}
