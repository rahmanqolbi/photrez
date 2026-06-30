import { lazy, Show, Suspense } from "solid-js";
import { useEditor } from "./EditorContext";

const MoveOptionBar = lazy(() => import("../MoveOptionBar").then(m => ({ default: m.MoveOptionBar })));
const CropOptionBar = lazy(() => import("../CropOptionBar").then(m => ({ default: m.CropOptionBar })));
const BrushOptionBar = lazy(() => import("../BrushOptionBar").then(m => ({ default: m.BrushOptionBar })));
const TransformOptionBar = lazy(() => import("../TransformOptionBar").then(m => ({ default: m.TransformOptionBar })));
const SelectionOptionBar = lazy(() => import("../SelectionOptionBar").then(m => ({ default: m.SelectionOptionBar })));

export function OptionBar() {
  const { activeTool, layerTransformSession } = useEditor();

  return (
    <div class="@container flex h-[44px] shrink-0 items-center gap-1.5 border-b border-editor-divider bg-editor-toolbar px-3">
      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  );
}
