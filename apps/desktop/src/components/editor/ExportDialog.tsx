import { Show, createSignal, createMemo, onMount, onCleanup } from "solid-js";
import { useEditor } from "./EditorContext";
import { exportActiveDocument } from "./exportDocument";

type ExportFormat = "png" | "jpeg" | "webp";

const FORMATS: { id: ExportFormat; label: string; extensions: string[] }[] = [
  { id: "png", label: "PNG", extensions: ["png"] },
  { id: "jpeg", label: "JPEG", extensions: ["jpg", "jpeg"] },
  { id: "webp", label: "WebP", extensions: ["webp"] },
];

export function ExportDialog() {
  const {
    showExportDialog,
    setShowExportDialog,
    workspace,
    scheduler,
    syncViewport,
  } = useEditor();

  const [format, setFormat] = createSignal<ExportFormat>("png");
  const [quality, setQuality] = createSignal(90);
  const [exporting, setExporting] = createSignal(false);
  const [donePath, setDonePath] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const hasQuality = () => format() !== "png";

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showExportDialog()) {
        setShowExportDialog(false);
      }
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  const handleExport = async () => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;

    const session = workspace.getActiveSession();
    const name = session?.displayName || "Untitled";

    setExporting(true);
    setError(null);
    setDonePath(null);

    try {
      const path = await exportActiveDocument(engine, name, format(), quality());
      if (path) {
        setDonePath(path);
        scheduler.requestRender();
        syncViewport();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    setShowExportDialog(false);
    setDonePath(null);
    setError(null);
  };

  return (
    <Show when={showExportDialog()}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div
          class="w-[320px] rounded-[8px] bg-editor-panel p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 class="mb-4 text-[14px] font-medium text-editor-text">Export</h2>

          <Show when={donePath()}>
            <div class="mb-4 rounded-[4px] bg-green-900/20 px-3 py-2 text-[12px] text-green-400">
              Saved: {donePath()?.split(/[/\\]/).pop()}
            </div>
          </Show>

          <Show when={error()}>
            <div class="mb-4 rounded-[4px] bg-red-900/20 px-3 py-2 text-[12px] text-red-400">
              {error()}
            </div>
          </Show>

          <div class="flex flex-col gap-3">
            <div>
              <label class="mb-1 block text-[12px] text-editor-text-dim">Format</label>
              <div class="flex gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    onClick={() => setFormat(f.id)}
                    class={`flex h-[28px] flex-1 items-center justify-center rounded-[4px] text-[12px] font-medium transition-colors ${
                      format() === f.id
                        ? "bg-editor-accent text-white"
                        : "border border-editor-field-border bg-editor-field text-editor-text-dim hover:border-editor-accent"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <Show when={hasQuality()}>
              <div>
                <label class="mb-1 block text-[12px] text-editor-text-dim">
                  Quality: {quality()}%
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={quality()}
                  onInput={(e) => setQuality(parseInt(e.currentTarget.value, 10))}
                  class="h-1 w-full appearance-none rounded-full bg-editor-field-border accent-editor-accent"
                />
              </div>
            </Show>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={exporting()}
              class="flex h-[28px] items-center rounded-[4px] border border-editor-field-border bg-editor-field px-3 text-[12px] text-editor-text-dim hover:bg-editor-field-border hover:text-editor-text disabled:opacity-40"
            >
              {donePath() ? "Close" : "Cancel"}
            </button>
            <Show when={!donePath()}>
              <button
                onClick={handleExport}
                disabled={exporting()}
                class="flex h-[28px] items-center gap-1.5 rounded-[4px] bg-editor-accent px-3 text-[12px] font-medium text-white hover:brightness-110 disabled:opacity-50"
              >
                <Show when={exporting()}>
                  <span class="inline-block size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </Show>
                {exporting() ? "Exporting..." : "Export"}
              </button>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
