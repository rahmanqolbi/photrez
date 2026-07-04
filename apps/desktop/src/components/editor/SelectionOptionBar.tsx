import { Show } from "solid-js";
import { useEditor } from "./shell/EditorContext";
import { EditableNumField } from "./primitives";
import { ToolPill, MoreDropdown, Divider, ToggleBtn } from "./shell/OptionBarShared";
import { Tooltip } from "./Tooltip";
import { Icon } from "./icons";
import { SelectionOperations } from "@/features/selection/SelectionOperations";

export function SelectionOptionBar() {
  const {
    workspace,
    renderer,
    scheduler,
    selection: selectionSignal,
    activeTool,
    selectionEditMode,
    setSelectionEditMode,
  } = useEditor();

  const engine = () => workspace.getActiveEngine();
  const historyGetter = () => workspace.getActiveHistory();
  const selection = () => selectionSignal() ?? engine()?.getSelection() ?? null;
  const hasSelection = () => selection() !== null;

  const uploadActiveLayerBitmap = () => {
    const e = engine();
    if (!e) return;
    const activeId = e.getActiveLayerId();
    if (!activeId) return;
    const layer = e.getLayer(activeId);
    if (layer?.imageBitmap) {
      renderer.uploadImage(layer.id, layer.imageBitmap);
    }
  };

  const submitW = (n: number) => {
    const s = selection();
    if (s && !isNaN(n) && n > 0) {
      engine()?.createSelection(s.x, s.y, n, s.height);
      scheduler.requestRender();
    }
  };

  const submitH = (n: number) => {
    const s = selection();
    if (s && !isNaN(n) && n > 0) {
      engine()?.createSelection(s.x, s.y, s.width, n);
      scheduler.requestRender();
    }
  };

  const submitX = (n: number) => {
    const s = selection();
    if (s && !isNaN(n)) {
      engine()?.createSelection(n, s.y, s.width, s.height);
      scheduler.requestRender();
    }
  };

  const submitY = (n: number) => {
    const s = selection();
    if (s && !isNaN(n)) {
      engine()?.createSelection(s.x, n, s.width, s.height);
      scheduler.requestRender();
    }
  };

  const submitAngle = (n: number) => {
    const s = selection();
    if (s && !isNaN(n)) {
      engine()?.createSelection(s.x, s.y, s.width, s.height, n);
      scheduler.requestRender();
    }
  };

  const handleInvert = () => {
    engine()?.invertSelection();
    setSelectionEditMode(false);
    scheduler.requestRender();
  };

  const handleDeselect = () => {
    engine()?.clearSelection();
    setSelectionEditMode(false);
    scheduler.requestRender();
  };

  const handleCut = () => {
    const e = engine();
    const h = historyGetter();
    if (e?.getSelection() && h) {
      // Commit pre-action snapshot so the cut is undoable AND redoable.
      h.commit(e.snapshot(), "Cut");
      SelectionOperations.cutSelection(e);
      uploadActiveLayerBitmap();
      scheduler.requestRender();
    }
  };

  const handleCopy = () => {
    const e = engine();
    if (e?.getSelection()) {
      SelectionOperations.copySelection(e);
    }
  };

  const handlePaste = () => {
    const e = engine();
    const h = historyGetter();
    if (e && h) {
      // Commit pre-action snapshot so the new layer is undoable/redoable.
      h.commit(e.snapshot(), "Paste");
      SelectionOperations.pasteSelection(e);
      uploadActiveLayerBitmap();
      scheduler.requestRender();
    }
  };

  const handleDelete = () => {
    const e = engine();
    const h = historyGetter();
    if (e?.getSelection() && h) {
      // Commit pre-action snapshot so the deletion is undoable/redoable.
      h.commit(e.snapshot(), "Delete Pixels");
      SelectionOperations.deleteSelection(e);
      uploadActiveLayerBitmap();
      scheduler.requestRender();
    }
  };

  return (
    <>
      <ToolPill icon="rectangle" label="Selection" />

      <Divider />

      <Show when={hasSelection()}>
        <div class="flex shrink-0 items-center gap-1">
          <EditableNumField
            label="X"
            labelClass="@max-[900px]:hidden"
            value={selection()?.x ?? 0}
            onSubmit={submitX}
            class="w-[62px]"
          />
          <EditableNumField
            label="Y"
            labelClass="@max-[900px]:hidden"
            value={selection()?.y ?? 0}
            onSubmit={submitY}
            class="w-[62px]"
          />
        </div>

        <Divider />

        <div class="flex shrink-0 items-center gap-1">
          <EditableNumField
            label="W"
            labelClass="@max-[900px]:hidden"
            value={selection()?.width ?? 0}
            onSubmit={submitW}
            class="w-[62px]"
          />
          <EditableNumField
            label="H"
            labelClass="@max-[900px]:hidden"
            value={selection()?.height ?? 0}
            onSubmit={submitH}
            class="w-[62px]"
          />
        </div>

        <Divider />

        <EditableNumField
          label="R"
          labelClass="@max-[900px]:hidden"
          value={selection()?.angle ?? 0}
          suffix="°"
          onSubmit={submitAngle}
          class="w-[58px]"
        />
      </Show>

      <Show when={!hasSelection()}>
        <span class="text-[11px] text-editor-text-dim @max-[900px]:hidden">
          Drag on canvas to create a selection
        </span>
      </Show>

      {/* Main Bar Controls (hidden on narrow container) */}
      <div class="hidden @min-[880px]:flex items-center gap-1.5 shrink-0">
        <Show when={hasSelection()}>
          <Divider />
          <Tooltip content="Show resize/rotate handles" shortcut="Ctrl+T">
            <ToggleBtn
              active={selectionEditMode()}
              onChange={setSelectionEditMode}
              icon="maximize"
              label="Transform"
              labelClass="@max-[900px]:hidden"
            />
          </Tooltip>

          <Divider />

          <Tooltip content="Cut Selection" shortcut="Ctrl+X">
            <button
              onClick={handleCut}
              class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
            >
              <Icon name="slice" class="size-3" strokeWidth={1.5} />
              Cut
            </button>
          </Tooltip>

          <Tooltip content="Copy Selection" shortcut="Ctrl+C">
            <button
              onClick={handleCopy}
              class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
            >
              <Icon name="copy" class="size-3" strokeWidth={1.5} />
              Copy
            </button>
          </Tooltip>

          <Tooltip content="Paste" shortcut="Ctrl+V">
            <button
              onClick={handlePaste}
              class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
            >
              <Icon name="square-dashed" class="size-3" strokeWidth={1.5} />
              Paste
            </button>
          </Tooltip>

          <Divider />

          <Tooltip content="Invert Selection" shortcut="Ctrl+I">
            <button
              onClick={handleInvert}
              class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
            >
              <Icon name="flip-h" class="size-3" strokeWidth={1.5} />
              Invert
            </button>
          </Tooltip>

          <Tooltip content="Delete Selection Pixels" shortcut="Del">
            <button
              onClick={handleDelete}
              class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
            >
              <Icon name="trash" class="size-3" strokeWidth={1.5} />
              Delete
            </button>
          </Tooltip>

          <Tooltip content="Deselect" shortcut="Esc">
            <button
              onClick={handleDeselect}
              class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
            >
              <Icon name="x" class="size-3" strokeWidth={1.5} />
              Deselect
            </button>
          </Tooltip>
        </Show>
      </div>

      {/* Overflow dropdown for narrow container */}
      <MoreDropdown>
        <Show when={hasSelection()}>
          <div class="flex flex-col gap-1.5">
            <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Position</span>
            <div class="grid grid-cols-2 gap-1.5">
              <EditableNumField label="X" value={selection()?.x ?? 0} onSubmit={submitX} class="w-full" />
              <EditableNumField label="Y" value={selection()?.y ?? 0} onSubmit={submitY} class="w-full" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Size</span>
            <div class="grid grid-cols-2 gap-1.5">
              <EditableNumField label="W" value={selection()?.width ?? 0} onSubmit={submitW} class="w-full" />
              <EditableNumField label="H" value={selection()?.height ?? 0} onSubmit={submitH} class="w-full" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Rotation</span>
            <EditableNumField
              label="R"
              value={selection()?.angle ?? 0}
              suffix="°"
              onSubmit={submitAngle}
              class="w-full"
            />
          </div>

          <div class="h-px bg-editor-divider my-1" />

          <div class="grid grid-cols-2 gap-1.5">
            <Tooltip content="Cut Selection" shortcut="Ctrl+X">
              <button
                onClick={handleCut}
                class="flex h-[24px] items-center justify-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-editor-field/85 transition-colors"
              >
                <Icon name="slice" class="size-3" strokeWidth={1.5} />
                Cut
              </button>
            </Tooltip>
            <Tooltip content="Copy Selection" shortcut="Ctrl+C">
              <button
                onClick={handleCopy}
                class="flex h-[24px] items-center justify-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-editor-field/85 transition-colors"
              >
                <Icon name="copy" class="size-3" strokeWidth={1.5} />
                Copy
              </button>
            </Tooltip>
            <Tooltip content="Paste" shortcut="Ctrl+V">
              <button
                onClick={handlePaste}
                class="flex h-[24px] items-center justify-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-editor-field/85 transition-colors"
              >
                <Icon name="square-dashed" class="size-3" strokeWidth={1.5} />
                Paste
              </button>
            </Tooltip>
            <Tooltip content="Invert Selection" shortcut="Ctrl+I">
              <button
                onClick={handleInvert}
                class="flex h-[24px] items-center justify-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-editor-field/85 transition-colors"
              >
                <Icon name="flip-h" class="size-3" strokeWidth={1.5} />
                Invert
              </button>
            </Tooltip>
            <Tooltip content="Delete Selection Pixels" shortcut="Del">
              <button
                onClick={handleDelete}
                class="flex h-[24px] items-center justify-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-editor-field/85 transition-colors"
              >
                <Icon name="trash" class="size-3" strokeWidth={1.5} />
                Delete
              </button>
            </Tooltip>
            <Tooltip content="Deselect" shortcut="Esc">
              <button
                onClick={handleDeselect}
                class="flex h-[24px] items-center justify-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-editor-field/85 transition-colors"
              >
                <Icon name="x" class="size-3" strokeWidth={1.5} />
                Deselect
              </button>
            </Tooltip>
          </div>
        </Show>

        <Show when={!hasSelection()}>
          <span class="text-[11px] text-editor-text-dim">
            Drag on canvas to create a selection
          </span>
        </Show>
      </MoreDropdown>
    </>
  );
}
