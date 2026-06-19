import { Show, createSignal, onMount, onCleanup } from "solid-js";
import { useEditor } from "./EditorContext";
import { Icon } from "./icons";

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

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showResizeDialog()) {
        setShowResizeDialog(false);
      }
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  const handleWChange = (val: string) => {
    const nw = parseInt(val, 10);
    if (isNaN(nw) || nw < 1) return;
    setW(nw);
    if (aspectLocked()) {
      setH(Math.max(1, Math.round(nw / aspect())));
    }
  };

  const handleHChange = (val: string) => {
    const nh = parseInt(val, 10);
    if (isNaN(nh) || nh < 1) return;
    setH(nh);
    if (aspectLocked()) {
      setW(Math.max(1, Math.round(nh * aspect())));
    }
  };

  const handleApply = () => {
    const newW = w();
    const newH = h();
    if (newW < 1 || newH < 1) return;

    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    if (newW === docWidth() && newH === docHeight()) {
      setShowResizeDialog(false);
      return;
    }

    history.commit(engine.snapshot());
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
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
      >
        <div
          class="w-[320px] rounded-[8px] bg-editor-panel p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 class="mb-4 text-[14px] font-medium text-editor-text">Image Size</h2>

          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <label class="w-[52px] text-[12px] text-editor-text-dim">Width:</label>
              <input
                type="number"
                min={1}
                value={w()}
                onInput={(e) => handleWChange(e.currentTarget.value)}
                class="h-[26px] flex-1 rounded-[4px] border border-editor-field-border bg-editor-field px-2 text-[12px] text-editor-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span class="text-[11px] text-editor-text-dim">px</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                onClick={() => setAspectLocked(!aspectLocked())}
                class="flex size-[26px] items-center justify-center rounded-[4px] text-editor-text-dim hover:bg-editor-field-border hover:text-editor-text"
                title={aspectLocked() ? "Lock aspect ratio" : "Unlock aspect ratio"}
              >
                <Icon name={aspectLocked() ? "link" : "unlock"} class="size-3.5" strokeWidth={1.75} />
              </button>
            </div>

            <div class="flex items-center gap-2">
              <label class="w-[52px] text-[12px] text-editor-text-dim">Height:</label>
              <input
                type="number"
                min={1}
                value={h()}
                onInput={(e) => handleHChange(e.currentTarget.value)}
                class="h-[26px] flex-1 rounded-[4px] border border-editor-field-border bg-editor-field px-2 text-[12px] text-editor-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span class="text-[11px] text-editor-text-dim">px</span>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              class="flex h-[28px] items-center rounded-[4px] border border-editor-field-border bg-editor-field px-3 text-[12px] text-editor-text-dim hover:bg-editor-field-border hover:text-editor-text"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              class="flex h-[28px] items-center rounded-[4px] bg-editor-accent px-3 text-[12px] font-medium text-white hover:brightness-110"
            >
              Image Size
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
