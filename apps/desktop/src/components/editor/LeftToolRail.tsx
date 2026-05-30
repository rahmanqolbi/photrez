import { For } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { TOOL_ITEMS } from "./editorData";

export function LeftToolRail() {
  return (
    <aside class="flex w-[52px] shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-editor-divider bg-editor-toolbar py-2">
      <For each={TOOL_ITEMS}>
        {(tool) => (
          <button
            class={clsx(
              "flex size-9 shrink-0 items-center justify-center rounded-[5px] hover:bg-white/5",
              tool.active ? "text-editor-text" : "text-editor-icon",
            )}
            aria-label={tool.label}
            title={tool.label}
          >
            <Icon name={tool.icon} class="size-[18px]" strokeWidth={1.6} />
          </button>
        )}
      </For>
      <div class="mb-1 mt-auto h-px w-6 shrink-0 bg-editor-divider" />
      <button
        class="flex size-9 shrink-0 items-center justify-center rounded-[5px] hover:bg-white/5"
        aria-label="Colors"
        title="Colors"
      >
        <div class="relative size-[36px]">
          {/* Background Color */}
          <div 
            class="absolute bottom-0 right-0 size-[35px] rounded-full bg-black border border-white/20"
            style={{ "clip-path": "polygon(100% 100%, 100% 0, 0 100%)" }}
          />
          {/* Foreground Color */}
          <div 
            class="absolute top-0 left-0 size-[35px] rounded-full bg-[#E8E8E8] border border-black/30 shadow-sm"
            style={{ "clip-path": "polygon(0 0, 100% 0, 0 100%)" }}
          />
        </div>
      </button>
      <button
        class="flex size-9 shrink-0 items-center justify-center rounded-[5px] text-editor-icon hover:bg-white/5"
        aria-label="More tools"
        title="More tools"
      >
        <Icon name="more" class="size-[18px]" strokeWidth={1.6} />
      </button>
    </aside>
  );
}
