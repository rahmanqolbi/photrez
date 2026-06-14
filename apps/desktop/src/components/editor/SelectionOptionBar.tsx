import { Show } from "solid-js";
import { useEditor } from "./EditorContext";
import { Divider } from "./OptionBarShared";
import { NumField, EditableNumField } from "./primitives";

export function SelectionOptionBar() {
  const {
    workspace,
    scheduler,
  } = useEditor();

  const engine = () => workspace.getActiveEngine();
  const selection = () => engine()?.getSelection() ?? null;

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
      engine()?.createSelection(s.x, s.y, s.width, s.height);
      scheduler.requestRender();
    }
  };

  return (
    <Show when={selection()}>
      {(sel) => (
        <>
          <span class="text-text-dim text-[11px] font-medium uppercase tracking-wide mr-1 shrink-0">
            Selection
          </span>

          <Divider />
          <EditableNumField label="X" value={Math.round(sel().x * 100) / 100} onSubmit={submitX} />
          <EditableNumField label="Y" value={Math.round(sel().y * 100) / 100} onSubmit={submitY} />
          <Divider />

          <EditableNumField label="W" value={Math.round(sel().width * 100) / 100} onSubmit={submitW} />
          <EditableNumField label="H" value={Math.round(sel().height * 100) / 100} onSubmit={submitH} />
          <Divider />

          <EditableNumField
            label="Angle"
            value={Math.round(sel().angle * 100) / 100}
            onSubmit={submitAngle}
          />
          <Divider />

          <div class="flex items-center gap-1">
            <button
              class="opt-icon-btn text-[11px] text-text-dim hover:text-text-primary"
              onClick={() => {
                engine()?.invertSelection();
                scheduler.requestRender();
              }}
            >
              Invert
            </button>
            <button
              class="opt-icon-btn text-[11px] text-text-dim hover:text-text-primary"
              onClick={() => {
                engine()?.clearSelection();
                scheduler.requestRender();
              }}
            >
              Deselect
            </button>
          </div>
        </>
      )}
    </Show>
  );
}
