export type ToolType = "move" | "selection" | "crop" | "eyedropper" | "brush" | "eraser";

export interface CursorContext {
  isSpacePressed: boolean;
  isPanning: boolean;
  activeTool: ToolType;
  isAltPressed: boolean;
  hoverHandle: string | null;
  isLayerLocked: boolean;
  eyedropperTarget: string | null;
}

const handleCursorMap: Record<string, string> = {
  tl: "nwse-resize",
  tr: "nwse-resize",
  bl: "nesw-resize",
  br: "nesw-resize",
  t: "ns-resize",
  b: "ns-resize",
  l: "ew-resize",
  r: "ew-resize",
};

export function resolveCursor(ctx: CursorContext): string {
  // 1. Eyedropper target set → crosshair
  if (ctx.eyedropperTarget) {
    return "crosshair";
  }

  // 2. Space pressed → grab or grabbing
  if (ctx.isSpacePressed) {
    return ctx.isPanning ? "grabbing" : "grab";
  }

  // 3. Alt pressed + brush/eraser → crosshair (eyedropper mode)
  if (ctx.isAltPressed && (ctx.activeTool === "brush" || ctx.activeTool === "eraser")) {
    return "crosshair";
  }

  // 4. Move tool + locked layer → default
  if (ctx.activeTool === "move" && ctx.isLayerLocked) {
    return "default";
  }

  // 6. Move tool + hoverHandle === "move" → move
  if (ctx.activeTool === "move" && ctx.hoverHandle === "move") {
    return "move";
  }

  // 7. Move tool + hoverHandle → resize cursor from map
  if (ctx.activeTool === "move" && ctx.hoverHandle) {
    return handleCursorMap[ctx.hoverHandle] || "default";
  }

  // 8. Selection tool → crosshair
  if (ctx.activeTool === "selection") {
    return "crosshair";
  }

  // 9. Crop tool → crosshair
  if (ctx.activeTool === "crop") {
    return "crosshair";
  }

  // 10. Brush/eraser tool → none
  if (ctx.activeTool === "brush" || ctx.activeTool === "eraser") {
    return "none";
  }

  // 11. Eyedropper tool → copy
  if (ctx.activeTool === "eyedropper") {
    return "copy";
  }

  // 12. Default → default
  return "default";
}
