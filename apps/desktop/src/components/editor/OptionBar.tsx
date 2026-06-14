import { Show } from "solid-js";
import { useEditor } from "./EditorContext";
import { MoveOptionBar } from "./MoveOptionBar";
import { CropOptionBar } from "./CropOptionBar";
import { BrushOptionBar } from "./BrushOptionBar";
import { TransformOptionBar } from "./TransformOptionBar";
import { SelectionOptionBar } from "./SelectionOptionBar";

export function OptionBar() {
  const { activeTool, layerTransformSession } = useEditor();

  return (
    <div class="@container flex h-[44px] shrink-0 items-center gap-1.5 border-b border-editor-divider bg-editor-toolbar px-3">
      <Show
        when={layerTransformSession()}
        fallback={
          <>
            <Show when={activeTool() === "selection"}>
              <SelectionOptionBar />
            </Show>

            <Show when={activeTool() === "move"}>
              <MoveOptionBar />
            </Show>

            <Show when={activeTool() === "crop"}>
              <CropOptionBar />
            </Show>

            <Show when={activeTool() === "brush" || activeTool() === "eraser"}>
              <BrushOptionBar />
            </Show>
          </>
        }
      >
        <TransformOptionBar />
      </Show>
    </div>
  );
}
