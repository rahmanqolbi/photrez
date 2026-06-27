import { Show, createEffect, createSignal, on } from "solid-js";
import { Portal } from "solid-js/web";
import { useEditor } from "../shell/EditorContext";
import { Icon } from "../icons";
import { DesktopDialog, DesktopDialogButton, desktopDialogFieldClass } from "./DesktopDialog";
import { getEffectiveMaxDim } from "@/engine/types";
import { showToast } from "../Toast";

export function ResizeCanvasModal() {
  const {
    showResizeDialog,
    setShowResizeDialog,
    workspace,
    renderer,
    scheduler,
    docWidth,
    docHeight,
    viewportWidth,
    viewportHeight,
    syncViewport,
  } = useEditor();

  const [w, setW] = createSignal(800);
  const [h, setH] = createSignal(600);
  const [aspectLocked, setAspectLocked] = createSignal(true);
  const [aspect, setAspect] = createSignal(1);

  const openDialog = () => {
    const cw = docWidth();
    const ch = docHeight();
    setW(cw);
    setH(ch);
    setAspect(cw / ch);
    setAspectLocked(true);
  };

  createEffect(on(showResizeDialog, (visible) => {
    if (visible) openDialog();
  }));

  const handleWChange = (val: string) => {
    const nw = parseInt(val, 10);
    if (isNaN(nw) || nw < 1) return;
    const max = getEffectiveMaxDim();
    if (nw > max) {
      showToast(`Maximum dimension is ${max}px`, "warn");
      setW(max);
      if (aspectLocked()) setH(Math.max(1, Math.round(max / aspect())));
      return;
    }
    setW(nw);
    if (aspectLocked()) {
      setH(Math.max(1, Math.round(nw / aspect())));
    }
  };

  const handleHChange = (val: string) => {
    const nh = parseInt(val, 10);
    if (isNaN(nh) || nh < 1) return;
    const max = getEffectiveMaxDim();
    if (nh > max) {
      showToast(`Maximum dimension is ${max}px`, "warn");
      setH(max);
      if (aspectLocked()) setW(Math.max(1, Math.round(max * aspect())));
      return;
    }
    setH(nh);
    if (aspectLocked()) {
      setW(Math.max(1, Math.round(nh * aspect())));
    }
  };

  const handleApply = () => {
    const newW = w();
    const newH = h();
    if (newW < 1 || newH < 1) return;
    const max = getEffectiveMaxDim();
    if (newW > max || newH > max) {
      showToast(`Maximum dimension is ${max}px`, "error");
      return;
    }

    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    if (newW === docWidth() && newH === docHeight()) {
      setShowResizeDialog(false);
      return;
    }

    history.commit(engine.snapshot(), "Resize Canvas");
    engine.resizeCanvas(newW, newH);

    const dpr = window.devicePixelRatio || 1;
    renderer.resizeToViewport(viewportWidth(), viewportHeight(), dpr);

    for (const layer of engine.getLayers()) {
      if (layer.imageBitmap) {
        renderer.uploadImage(layer.id, layer.imageBitmap);
      }
    }

    scheduler.requestRender();
    syncViewport();
    setShowResizeDialog(false);
  };

  const handleCancel = () => {
    setShowResizeDialog(false);
  };

  return (
    <Show when={showResizeDialog()}>
      <Portal mount={document.body}>
        <DesktopDialog
          title="Resize Canvas"
          kind="resize-canvas"
          manageFocus
          onDismiss={handleCancel}
          onBackdropPointerDown={handleCancel}
          actions={<>
            <DesktopDialogButton onClick={handleCancel}>Cancel</DesktopDialogButton>
            <DesktopDialogButton variant="primary" onClick={handleApply}>Resize</DesktopDialogButton>
          </>}
        >
          <div class="flex flex-col gap-2.5">
            <p class="mb-1 text-[11px] text-editor-text-dim">
              Set the canvas dimensions. Existing layer content keeps its top-left position.
            </p>
            <div class="flex items-center gap-2">
              <label for="resize-canvas-width" class="w-[52px] text-[11px] font-medium text-editor-text-dim">Width</label>
              <input
                id="resize-canvas-width"
                type="number"
                min={1}
                value={w()}
                onInput={(e) => handleWChange(e.currentTarget.value)}
                data-dialog-initial-focus
                class={`${desktopDialogFieldClass} flex-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
              <span class="text-[11px] text-editor-text-dim">px</span>
            </div>

            <div class="flex h-6 items-center pl-[60px]">
              <button
                type="button"
                onClick={() => setAspectLocked(!aspectLocked())}
                aria-pressed={aspectLocked()}
                class={`flex h-6 items-center gap-1.5 rounded-[6px] px-1.5 text-[11px] outline-none transition-all duration-75 focus-visible:ring-1 focus-visible:ring-editor-accent/50 ${
                  aspectLocked()
                    ? "border border-editor-accent/40 bg-editor-accent/10 text-editor-accent shadow-[inset_0_1px_2px_rgba(225,90,23,0.15)]"
                    : "border border-transparent bg-transparent text-editor-text-dim hover:bg-white/[0.05] hover:text-editor-text"
                }`}
                title={aspectLocked() ? "Unlock aspect ratio" : "Lock aspect ratio"}
              >
                <Icon name={aspectLocked() ? "link" : "unlock"} class="size-3.5" strokeWidth={1.75} />
                Keep proportions
              </button>
            </div>

            <div class="flex items-center gap-2">
              <label for="resize-canvas-height" class="w-[52px] text-[11px] font-medium text-editor-text-dim">Height</label>
              <input
                id="resize-canvas-height"
                type="number"
                min={1}
                value={h()}
                onInput={(e) => handleHChange(e.currentTarget.value)}
                class={`${desktopDialogFieldClass} flex-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
              <span class="text-[11px] text-editor-text-dim">px</span>
            </div>
          </div>
        </DesktopDialog>
      </Portal>
    </Show>
  );
}
