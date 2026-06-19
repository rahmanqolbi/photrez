import type { ToolId } from "./toolTypes";

export type PasteboardClickAction =
  | "noop"
  | "clear-active-layer"
  | "clear-selection-preview"
  | "clear-crop-preview";

export interface PasteboardClickContext {
  hasDocument: boolean;
  activeTool: ToolId;
  isNavigationMode: boolean;
  hasLayerTransformSession: boolean;
  hasCropRect: boolean;
  hasSelectionPreview: boolean;
}

export function getPasteboardClickAction(ctx: PasteboardClickContext): PasteboardClickAction {
  if (!ctx.hasDocument) return "noop";
  if (ctx.isNavigationMode) return "noop";
  if (ctx.hasLayerTransformSession) return "noop";
  if (ctx.activeTool === "crop" && ctx.hasCropRect) return "clear-crop-preview";
  if (ctx.activeTool === "selection" && ctx.hasSelectionPreview) return "clear-selection-preview";
  if (ctx.activeTool === "move") return "clear-active-layer";
  return "noop";
}
