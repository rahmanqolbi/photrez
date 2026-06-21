import { For, Show, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { useEditor } from "./EditorContext";
import { exportActiveDocument } from "./exportDocument";
import { DesktopDialog, DesktopDialogButton } from "./DesktopDialog";

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
      <Portal mount={document.body}>
        <DesktopDialog
          title="Export Image"
          kind="export"
          manageFocus
          dismissible={!exporting()}
          onDismiss={handleClose}
          onBackdropPointerDown={() => { if (!exporting()) handleClose(); }}
          actions={<>
            <DesktopDialogButton onClick={handleClose} disabled={exporting()}>
              {donePath() ? "Close" : "Cancel"}
            </DesktopDialogButton>
            <Show when={!donePath()}>
              <DesktopDialogButton variant="primary" onClick={handleExport} disabled={exporting()}>
                <Show when={exporting()}>
                  <span aria-hidden="true" class="mr-1.5 inline-block size-3 animate-spin rounded-full border-2 border-editor-bg/30 border-t-editor-bg" />
                </Show>
                {exporting() ? "Exporting..." : "Export"}
              </DesktopDialogButton>
            </Show>
          </>}
        >
          <Show when={donePath()}>
            <div role="status" class="mb-3 rounded-[6px] border border-success/30 bg-success/10 px-2.5 py-2 text-[11px] text-success">
              Saved: {donePath()?.split(/[/\\]/).pop()}
            </div>
          </Show>

          <Show when={error()}>
            <div role="alert" class="mb-3 rounded-[6px] border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">
              {error()}
            </div>
          </Show>

          <div class="flex flex-col gap-3.5">
            <div>
              <div id="export-format-label" class="mb-1.5 text-[11px] font-medium text-editor-text-dim">Format</div>
              <div class="flex h-8 rounded-[6px] bg-editor-canvas p-[3px] border border-editor-field-border/60">
                <For each={FORMATS}>{(f, index) => (
                  <button
                    type="button"
                    aria-pressed={format() === f.id}
                    aria-describedby="export-format-label"
                    data-dialog-initial-focus={index() === 0 ? "" : undefined}
                    onClick={() => setFormat(f.id)}
                    class={`flex h-full flex-1 items-center justify-center rounded-[4px] text-[11px] font-medium outline-none transition-all duration-75 focus-visible:ring-1 focus-visible:ring-editor-accent/50 ${
                      format() === f.id
                        ? "bg-editor-panel text-editor-accent font-semibold border border-editor-field-border/40 shadow-sm"
                        : "border border-transparent bg-transparent text-editor-text-dim hover:text-editor-text"
                    }`}
                  >
                    {f.label}
                  </button>
                )}</For>
              </div>
            </div>

            <Show when={hasQuality()}>
              <div>
                <div class="mb-1.5 flex items-center justify-between text-[11px] text-editor-text-dim">
                  <label for="export-quality" class="font-medium">Quality</label>
                  <output for="export-quality" class="font-mono tabular-nums text-editor-text">{quality()}%</output>
                </div>
                <input
                  id="export-quality"
                  type="range"
                  min={1}
                  max={100}
                  value={quality()}
                  onInput={(e) => setQuality(parseInt(e.currentTarget.value, 10))}
                  class="h-4 w-full appearance-none bg-transparent accent-editor-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-editor-accent"
                />
              </div>
            </Show>
          </div>
        </DesktopDialog>
      </Portal>
    </Show>
  );
}
