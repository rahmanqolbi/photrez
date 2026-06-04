import { Show } from "solid-js";
import { useEditor } from "./EditorContext";
import { MoveOptionBar } from "./MoveOptionBar";
import { CropOptionBar } from "./CropOptionBar";
import { BrushOptionBar } from "./BrushOptionBar";

export function OptionBar() {
  const { activeTool } = useEditor();

  return (
    <div class="flex h-[44px] shrink-0 items-center gap-1.5 overflow-x-auto border-b border-editor-divider bg-editor-toolbar px-3">
      <Show when={activeTool() === "move" || activeTool() === "selection"}>
        <MoveOptionBar />
      </Show>

      <Show when={activeTool() === "crop"}>
        <CropOptionBar />
      </Show>

      <Show when={activeTool() === "brush" || activeTool() === "eraser"}>
        <BrushOptionBar />
      </Show>
    </div>
  );
}
