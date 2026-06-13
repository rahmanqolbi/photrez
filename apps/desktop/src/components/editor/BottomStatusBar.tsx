import { Show } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { useEditor } from "./EditorContext";
import { getPaintToolBlockReason } from "./brushToolState";

const TOOL_DESCRIPTIONS: Record<string, string> = {
  move: "Drag to move layer. Hold Shift for constrained movement.",
  selection: "Click and drag to create rectangular selection.",
  crop: "Click and drag to define crop area. Enter to apply, Esc to cancel.",
  eyedropper: "Click to sample color from canvas.",
  brush: "Click and drag to paint. Hold Alt for eyedropper.",
  eraser: "Click and drag to erase. Hold Alt for eyedropper.",
};

export function BottomStatusBar() {
  const { workspace, activeTool, zoom, docWidth, docHeight, layers, activeLayerId, selectedLayerId, activeDocumentId, layerTransformSession } = useEditor();

  const activeLayerName = () => {
    const activeId = activeTool() === "move" ? selectedLayerId() : activeLayerId();
    if (!activeId) return "No active layer";
    return layers().find(l => l.id === activeId)?.name || "Layer";
  };

  const getToolDisplayName = () => {
    const tool = activeTool();
    switch (tool) {
      case "move": return "Move Tool";
      case "selection": return "Selection Tool";
      case "crop": return "Crop Tool";
      case "eyedropper": return "Eyedropper Tool";
      case "brush": return "Brush Tool";
      case "eraser": return "Eraser Tool";
      default: return "Select Tool";
    }
  };

  const activeLayer = () => layers().find((layer) => layer.id === activeLayerId()) ?? null;

  const paintBlockReason = () => {
    const tool = activeTool();
    if (tool !== "brush" && tool !== "eraser") return null;
    return getPaintToolBlockReason(activeLayer(), tool === "eraser");
  };

  const statusText = () => {
    const session = layerTransformSession();
    if (session) return "Transform preview active. Edit values above, Enter to apply, Esc to cancel.";
    const blocked = paintBlockReason();
    if (blocked) return blocked;
    return TOOL_DESCRIPTIONS[activeTool()] || "";
  };

  return (
    <footer class="flex h-[32px] shrink-0 items-center justify-between gap-4 overflow-x-auto border-t border-editor-divider bg-editor-topbar px-4 text-[12px] text-editor-text-dim">
      <div class="flex shrink-0 items-center gap-5">
        <Show
          when={activeDocumentId()}
          fallback={<span class="text-editor-text/60">No image open</span>}
        >
          <span class="text-editor-text/80">
            {docWidth()} x {docHeight()} px
          </span>
          <span class="border-l border-editor-divider pl-4 flex items-center gap-2">
            <span class="text-editor-text/80">{Math.round(zoom() * 100)}%</span>
          </span>
          <span class="border-l border-editor-divider pl-4">
            RGB/8
          </span>
          <span class="border-l border-editor-divider pl-4 hidden sm:inline">
            sRGB IEC61966-2.1
          </span>
        </Show>
      </div>

      <div class="hidden shrink-0 items-center gap-7 md:flex">
        <Show
          when={activeDocumentId()}
          fallback={<span class="text-editor-text/60">No selection</span>}
        >
          <span>
            Active: <strong class="text-editor-text">{getToolDisplayName()}</strong>
          </span>
          <span class="border-l border-editor-divider pl-4">
            <span class="text-editor-text/60">{statusText()}</span>
          </span>
          <span class="border-l border-editor-divider pl-4">
            Selected Layer: <strong class="text-editor-text">{activeLayerName()}</strong>
          </span>
        </Show>
      </div>


      <div class={clsx("flex shrink-0 items-center gap-5", !activeDocumentId() && "opacity-50 pointer-events-none")}>
        <button class="flex items-center gap-1 hover:text-editor-text">
          <Icon name="camera" class="size-3.5" strokeWidth={1.75} />
          <span>Snapshots</span>
        </button>
        <button class="flex items-center gap-1 hover:text-editor-text">
          <Icon name="history" class="size-3.5" strokeWidth={1.75} />
          <span>History</span>
        </button>
        <button class="flex items-center gap-1 hover:text-editor-text">
          <Icon name="box" class="size-3.5" strokeWidth={1.75} />
          <span>Assets</span>
        </button>
      </div>
    </footer>
  );
}
