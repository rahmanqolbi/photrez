import { createSignal, onCleanup, onMount } from "solid-js";
import { SelectionOperations } from "@/features/selection/SelectionOperations";
import { useEditor } from "../shell/EditorContext";
import { ContextMenu, type ContextMenuEntry } from "../ContextMenu";
import { dispatchEditorCommand } from "../useEditorCommands";

export function CanvasContextMenu() {
  const { activeDocumentId, activeTool, selection, workspace } = useEditor();
  const [menu, setMenu] = createSignal<{
    x: number;
    y: number;
    focusTarget: HTMLElement | null;
  } | null>(null);

  const close = () => setMenu(null);

  const hasCopyableSelection = () => {
    const engine = workspace.getActiveEngine();
    const activeId = engine?.getActiveLayerId();
    return Boolean(selection() && activeId && engine?.getLayerImageBitmap(activeId));
  };

  const run = (command: Parameters<typeof dispatchEditorCommand>[0]) => () => {
    dispatchEditorCommand(command);
  };

  const items = (): ContextMenuEntry[] => [
    { kind: "item", label: "Cut", shortcut: "Ctrl+X", disabled: !hasCopyableSelection(), onSelect: run("edit.cut") },
    { kind: "item", label: "Copy", shortcut: "Ctrl+C", disabled: !hasCopyableSelection(), onSelect: run("edit.copy") },
    { kind: "item", label: "Paste", shortcut: "Ctrl+V", disabled: !SelectionOperations.hasClipboard(), onSelect: run("edit.paste") },
    { kind: "separator" },
    { kind: "item", label: "Select All", shortcut: "Ctrl+A", onSelect: run("edit.select-all") },
    { kind: "item", label: "Deselect", shortcut: "Ctrl+D", disabled: selection() === null, onSelect: run("edit.deselect") },
    { kind: "item", label: "Invert Selection", shortcut: "Ctrl+Shift+I", onSelect: run("edit.invert-selection") },
    { kind: "separator" },
    { kind: "item", label: "Actual Size", shortcut: "Ctrl+1", onSelect: run("view.actual-size") },
    { kind: "item", label: "Fit Canvas", shortcut: "Ctrl+0", onSelect: run("view.fit-canvas") },
    { kind: "item", label: "Zoom to Selection", shortcut: "Ctrl+Alt+0", disabled: selection() === null, onSelect: run("view.zoom-to-selection") },
  ];

  onMount(() => {
    const container = document.getElementById("canvas-container");
    if (!container) return;
    const handleContextMenu = (event: MouseEvent) => {
      if (
        !activeDocumentId()
        || activeTool() === "brush"
        || activeTool() === "eraser"
      ) return;
      event.preventDefault();
      setMenu({
        x: event.clientX,
        y: event.clientY,
        focusTarget: event.target instanceof HTMLElement ? event.target : container,
      });
    };
    container.addEventListener("contextmenu", handleContextMenu);
    onCleanup(() => container.removeEventListener("contextmenu", handleContextMenu));
  });

  return (
    <ContextMenu
      open={menu() !== null}
      x={menu()?.x ?? 0}
      y={menu()?.y ?? 0}
      ariaLabel="Canvas actions"
      items={items()}
      restoreFocusTo={menu()?.focusTarget}
      onClose={close}
      testId="canvas-context-menu"
    />
  );
}
