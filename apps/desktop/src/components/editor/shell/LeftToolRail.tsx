import { createSignal, For, onCleanup, onMount } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "../icons";
import { useEditor } from "./EditorContext";
import { cancelLayerTransformSession } from "../transformSession";
import type { ToolId } from "../tools/toolTypes";
import { Tooltip } from "../Tooltip";
import { useDialog } from "../dialogs/DialogProvider";
import { TOOL_ITEMS } from "../editorData";

const TOOL_SHORTCUTS: Record<ToolId, string> = {
  move: "V",
  selection: "M",
  crop: "C",
  eyedropper: "I",
  brush: "B",
  eraser: "E",
};

export function LeftToolRail(props: { disabled?: boolean }) {
  const { activeTool, setActiveTool, fgColor, setFgColor, bgColor, setBgColor, scheduler, workspace, layerTransformSession, setLayerTransformSession, colorPickerOpen, setColorPickerOpen, colorPickerTarget, setColorPickerTarget } = useEditor();
  const dialogs = useDialog();

  const cancelActiveTransformSession = () => {
    const engine = workspace.getActiveEngine();
    if (cancelLayerTransformSession(layerTransformSession(), engine)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
  };

  const handleToolChange = (id: ToolId) => {
    if (props.disabled) return;
    if (layerTransformSession() && id !== "move" && id !== "selection") {
      cancelActiveTransformSession();
    }
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

  const handleResetColors = () => {
    if (props.disabled) return;
    setFgColor("#E15A17");
    setBgColor("#FFFFFF");
    scheduler.requestRender();
  };

  const handleOpenColorPicker = async (type: "foreground" | "background") => {
    if (props.disabled) return;
    const initialColor = type === "foreground" ? fgColor() : bgColor();
    const title = type === "foreground" ? "Foreground Color" : "Background Color";
    setColorPickerOpen(true);
    setColorPickerTarget(type);
    const selectedColor = await dialogs.colorPicker({
      title,
      initialColor,
      target: type,
      onChange: (color) => {
        if (type === "foreground") {
          setFgColor(color);
        } else {
          setBgColor(color);
        }
        scheduler.requestRender();
      }
    });
    setColorPickerOpen(false);
    if (selectedColor === null) {
      // Revert back to the initial color if cancelled
      if (type === "foreground") {
        setFgColor(initialColor);
      } else {
        setBgColor(initialColor);
      }
      scheduler.requestRender();
    }
  };

  // Keyboard shortcut listener for X (swap) and D (reset)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (document.querySelector('[aria-modal="true"]')) return;
    if (props.disabled) return;
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

    if (e.key.toLowerCase() === "x") {
      const temp = fgColor();
      setFgColor(bgColor());
      setBgColor(temp);
      scheduler.requestRender();
    } else if (e.key.toLowerCase() === "d") {
      handleResetColors();
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
            <Tooltip content={tool.label} shortcut={TOOL_SHORTCUTS[tool.id]} placement="right">
              <button
                onClick={() => handleToolChange(tool.id)}
                class={clsx(
                  "flex size-9 shrink-0 items-center justify-center rounded-[5px] transition-all duration-100 relative",
                  activeTool() === tool.id
                    ? "bg-white/5 text-editor-text"
                    : "text-editor-icon hover:bg-white/5 hover:text-editor-text"
                )}
                aria-label={tool.label}
              >
                <Icon name={tool.icon} class="size-[18px]" strokeWidth={1.6} />
              </button>
            </Tooltip>
          );
        }}
      </For>

      <div class="mb-1 mt-auto h-px w-6 shrink-0 bg-editor-divider" />
      
      {/* Overlapping Color Swatches Container */}
      <div class="relative size-[38px] shrink-0 group my-2 select-none">
        {/* Background Swatch */}
        <Tooltip content="Background Color" placement="right">
          <div 
            onClick={() => handleOpenColorPicker("background")}
            class="absolute bottom-0 right-0 size-[28px] rounded-full border border-white/20 shadow-md cursor-pointer transition-transform duration-100 hover:scale-105"
            style={{ "background-color": bgColor() }}
          />
        </Tooltip>

        {/* Foreground Swatch */}
        <Tooltip content="Foreground Color" placement="right">
          <div 
            onClick={() => handleOpenColorPicker("foreground")}
            class="absolute top-0 left-0 size-[28px] rounded-full border border-white/30 outline outline-1 outline-black/40 shadow-md cursor-pointer z-10 transition-transform duration-100 hover:scale-105"
            style={{ "background-color": fgColor() }}
          />
        </Tooltip>

        {/* Diagonal Swap Micro-Arrow Trigger */}
        <Tooltip content="Swap Colors" shortcut="X" placement="right">
          <button
            onClick={handleSwapColors}
            class="absolute -top-1.5 -right-1.5 z-20 size-4 bg-editor-toolbar border border-editor-divider rounded-full flex items-center justify-center text-editor-icon hover:text-editor-text scale-0 group-hover:scale-100 transition-transform duration-150 shadow cursor-pointer"
            aria-label="Swap Colors"
          >
            <Icon name="rotate" class="size-2.5" />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
