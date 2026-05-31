import { For, onMount, onCleanup } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { TOOL_ITEMS } from "./editorData";
import { useEditor } from "./EditorContext";

export function LeftToolRail(props: { disabled?: boolean }) {
  const { activeTool, setActiveTool, fgColor, setFgColor, bgColor, setBgColor, scheduler } = useEditor();

  const handleToolChange = (id: string) => {
    if (props.disabled) return;
    setActiveTool(id);
    scheduler.requestRender();
  };

  const handleSwapColors = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.disabled) return;
    const temp = fgColor();
    setFgColor(bgColor());
    setBgColor(temp);
    scheduler.requestRender();
  };

  // Keyboard shortcut listener for X (swap) and D (reset)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.disabled) return;
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

    if (e.key.toLowerCase() === "x") {
      const temp = fgColor();
      setFgColor(bgColor());
      setBgColor(temp);
      scheduler.requestRender();
    } else if (e.key.toLowerCase() === "d") {
      setFgColor("#E15A17");
      setBgColor("#FFFFFF");
      scheduler.requestRender();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  return (
    <aside class={clsx(
      "flex w-[52px] shrink-0 flex-col items-center gap-0.5 overflow-y-auto bg-editor-toolbar py-2",
      props.disabled && "opacity-50 pointer-events-none grayscale"
    )}>
      <For each={TOOL_ITEMS}>
        {(tool) => {
          return (
            <button
              onClick={() => handleToolChange(tool.id)}
              class={clsx(
                "flex size-9 shrink-0 items-center justify-center rounded-[5px] transition-all duration-100 relative",
                activeTool() === tool.id
                  ? "bg-white/[0.08] text-editor-text"
                  : "text-editor-icon hover:bg-white/5 hover:text-editor-text"
              )}
              aria-label={tool.label}
              title={tool.label}
            >
              <Icon name={tool.icon} class="size-[18px]" strokeWidth={1.6} />
            </button>
          );
        }}
      </For>

      <div class="mb-1 mt-auto h-px w-6 shrink-0 bg-editor-divider" />
      
      {/* Overlapping Color Swatches Container */}
      <div class="relative size-[38px] shrink-0 group my-2">
        {/* Background Swatch with Native Color Input */}
        <div 
          class="absolute bottom-0 right-0 size-[28px] rounded-full border border-white/20 shadow-md cursor-pointer overflow-hidden transition-transform duration-100 hover:scale-105"
          style={{ "background-color": bgColor() }}
        >
          <input
            type="color"
            value={bgColor()}
            onInput={(e) => {
              setBgColor(e.currentTarget.value);
              scheduler.requestRender();
            }}
            class="opacity-0 absolute inset-0 cursor-pointer"
          />
        </div>

        {/* Foreground Swatch with Native Color Input */}
        <div 
          class="absolute top-0 left-0 size-[28px] rounded-full border border-black/30 shadow-md cursor-pointer overflow-hidden transition-transform duration-100 hover:scale-105"
          style={{ "background-color": fgColor() }}
        >
          <input
            type="color"
            value={fgColor()}
            onInput={(e) => {
              setFgColor(e.currentTarget.value);
              scheduler.requestRender();
            }}
            class="opacity-0 absolute inset-0 cursor-pointer"
          />
        </div>

        {/* Diagonal Swap Micro-Arrow Trigger */}
        <button
          onClick={handleSwapColors}
          class="absolute -top-1.5 -right-1.5 size-4 bg-editor-toolbar border border-editor-divider rounded-full flex items-center justify-center text-editor-icon hover:text-editor-text scale-0 group-hover:scale-100 transition-transform duration-150 shadow"
          title="Swap Colors (X)"
        >
          <Icon name="rotate" class="size-2.5" />
        </button>
      </div>

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
