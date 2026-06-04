import { For, createSignal, onMount, onCleanup } from "solid-js";
import { Icon } from "./icons";
import { MENU_ITEMS } from "./editorData";
import { runTauriWindowAction } from "@/lib/desktop";
import { useEditor } from "./EditorContext";
import { showOpenImageDialog, readFileBytes } from "@/tauri/native";
import { WorkspaceManager } from "@/engine/workspace";

type AppTitleBarProps = {
  isRightDockOpen: boolean;
  onToggleRightDock: () => void;
};

export function AppTitleBar(props: AppTitleBarProps) {
  const { workspace, renderer, scheduler, activeDocumentId, documents, activeTool, undoLastCrop, canCropUndo, redoCrop, canCropRedo, setCropRect, setCropRotation } = useEditor();

  const activeDocName = () => {
    const id = activeDocumentId();
    if (!id) return "No Document Open";
    return documents().find((d) => d.id === id)?.displayName || "Untitled";
  };

  const handleUndo = () => {
    // Crop mode: use crop undo stack instead of document undo
    if (activeTool() === "crop" && canCropUndo()) {
      const state = undoLastCrop();
      if (state) {
        setCropRect(state.rect);
        setCropRotation(state.rotation);
        return;
      }
    }
    // Fall through to document undo for non-crop or empty crop stack
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (engine && history && history.canUndo()) {
      const prev = history.undo(engine.snapshot());
      if (prev) {
        engine.restore(prev);
        // Sync texture handles
        for (const layer of engine.getLayers()) {
          if (layer.imageBitmap) {
            renderer.uploadImage(layer.id, layer.imageBitmap);
          }
        }
        scheduler.requestRender();
      }
    }
  };

  const handleRedo = () => {
    // Crop mode: use crop redo stack instead of document redo
    if (activeTool() === "crop" && canCropRedo()) {
      const state = redoCrop();
      if (state) {
        setCropRect(state.rect);
        setCropRotation(state.rotation);
        return;
      }
    }
    // Fall through to document redo for non-crop or empty crop stack
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (engine && history && history.canRedo()) {
      const next = history.redo(engine.snapshot());
      if (next) {
        engine.restore(next);
        for (const layer of engine.getLayers()) {
          if (layer.imageBitmap) {
            renderer.uploadImage(layer.id, layer.imageBitmap);
          }
        }
        scheduler.requestRender();
      }
    }
  };

  const handleOpenImage = async () => {
    try {
      const paths = await showOpenImageDialog();
      if (!paths || paths.length === 0) return;

      for (const path of paths) {
        if (workspace.isFull()) break;

        const bytes = await readFileBytes(path);
        const blob = new Blob([bytes as any]);
        const bitmap = await createImageBitmap(blob);

        const id = `doc-${crypto.randomUUID()}`;
        const name = path.split(/[/\\]/).pop() || "Image";
        const session = WorkspaceManager.createDocumentFromImage(id, name, bitmap);
        
        workspace.addDocument(session);

        const bgLayerId = session.engine.getLayers()[0].id;
        renderer.uploadImage(bgLayerId, bitmap);
        scheduler.requestRender();
      }
    } catch (e) {
      console.error("Failed to open image:", e);
    }
  };

  const handleMenuClick = (item: string) => {
    if (item === "File") {
      handleOpenImage();
    }
  };

  // Bind Ctrl+Z and Ctrl+Y shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

    if (e.ctrlKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      handleUndo();
    } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
      e.preventDefault();
      handleRedo();
    } else if (e.ctrlKey && e.key.toLowerCase() === "o") {
      e.preventDefault();
      handleOpenImage();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  return (
    <header class="relative flex h-[46px] shrink-0 items-center border-b border-editor-divider bg-editor-topbar select-none">
      <div class="flex min-w-0 items-center gap-2 self-stretch">
        <div
          class="flex h-full shrink-0 items-center pl-3 pr-2"
          data-tauri-drag-region
          onDblClick={() => runTauriWindowAction("toggleMaximize")}
        >
          <div class="flex size-[30px] items-center justify-center rounded-[6px] bg-editor-brand">
            <span class="text-[13px] font-bold lowercase tracking-tight text-white">pz</span>
          </div>
        </div>

        <nav class="hidden items-center gap-0.5 md:flex">
          <For each={MENU_ITEMS}>
            {(item) => (
              <button
                onClick={() => handleMenuClick(item)}
                class="flex h-[26px] items-center justify-center rounded-[4px] px-2.5 text-[12.5px] tracking-wide text-editor-text/85 transition-colors hover:bg-white/[0.045] hover:text-editor-text"
              >
                {item}
              </button>
            )}
          </For>
        </nav>
      </div>

      <div
        class="flex min-w-4 flex-1 items-center justify-center self-stretch"
        data-tauri-drag-region
        onDblClick={() => runTauriWindowAction("toggleMaximize")}
      >
        <div class="pointer-events-none flex items-center gap-1.5 opacity-90">
          <span class="text-[12px] font-medium tracking-wide text-editor-text">
            {activeDocName()}
          </span>
          <span class="text-[12px] text-editor-text-dim">—</span>
          <span class="text-[12px] tracking-wide text-editor-text-dim">photrez</span>
        </div>
      </div>

      {/* Window Controls */}
      <div class="flex shrink-0 items-center">
        <div class="mr-3 flex items-center gap-0.5 text-editor-icon">
          <button
            onClick={handleUndo}
            class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text"
            aria-label="Undo"
          >
            <Icon name="undo" class="size-[16px]" strokeWidth={1.75} />
          </button>
          <button
            onClick={handleRedo}
            class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text"
            aria-label="Redo"
          >
            <Icon name="redo" class="size-[16px]" strokeWidth={1.75} />
          </button>
          <div class="mx-1 h-3.5 w-px bg-editor-divider" />
          <button
            class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text xl:hidden"
            aria-label={props.isRightDockOpen ? "Hide side panels" : "Show side panels"}
            onClick={props.onToggleRightDock}
          >
            <Icon
              name={props.isRightDockOpen ? "panel-right-close" : "panel-right-open"}
              class="size-[16px]"
              strokeWidth={1.75}
            />
          </button>
        </div>

        <div class="flex items-center pr-1 text-editor-icon">
          <button
            class="flex h-[46px] w-11 items-center justify-center hover:bg-white/[0.055] hover:text-editor-text"
            onClick={() => runTauriWindowAction("minimize")}
          >
            <Icon name="minus" class="size-[15px]" strokeWidth={1.75} />
          </button>
          <button
            class="flex h-[46px] w-11 items-center justify-center hover:bg-white/[0.055] hover:text-editor-text"
            onClick={() => runTauriWindowAction("toggleMaximize")}
          >
            <Icon name="square" class="size-[12px]" strokeWidth={1.75} />
          </button>
          <button
            class="flex h-[46px] w-11 items-center justify-center hover:bg-red-500/85 hover:text-white"
            onClick={() => runTauriWindowAction("close")}
          >
            <Icon name="x" class="size-[16px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
