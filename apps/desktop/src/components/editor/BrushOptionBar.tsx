import { NumField } from "./primitives";
import { useEditor } from "./EditorContext";

export function BrushOptionBar() {
  const { activeTool } = useEditor();

  return (
    <>
      <div class="flex h-[26px] shrink-0 items-center gap-2.5 px-2.5">
        <span class="text-[12px] text-editor-text font-semibold uppercase text-editor-accent capitalize">{activeTool()} Options</span>
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <NumField label="Size" value="20 px" class="w-[86px]" />
        <NumField label="Hard" value="80%" class="w-[86px]" />
        <NumField label="Opac" value="100%" class="w-[86px]" />
      </div>
    </>
  );
}
