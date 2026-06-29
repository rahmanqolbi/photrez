import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import { useEditor } from "../shell/EditorContext";
import { encodeComposite } from "../exportDocument";
import { printDocument } from "../printDocument";
import { DesktopDialog, DesktopDialogButton } from "./DesktopDialog";

export function PrintDialog() {
  const {
    showPrintDialog,
    setShowPrintDialog,
    workspace,
    docWidth,
    docHeight,
  } = useEditor();

  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);
  const [printing, setPrinting] = createSignal(false);

  // Encode preview when dialog opens
  onMount(() => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    (async () => {
      try {
        // Use a small preview (JPEG for speed)
        const bytes = await encodeComposite(engine, "jpeg", 60);
        const blob = new Blob([bytes as BlobPart], { type: "image/jpeg" });
        setPreviewUrl(URL.createObjectURL(blob));
      } catch {
        // Preview is optional — silent fail
      }
    })();
  });

  onCleanup(() => {
    const url = previewUrl();
    if (url) URL.revokeObjectURL(url);
  });

  const handlePrint = async () => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    setPrinting(true);
    try {
      await printDocument(engine);
    } finally {
      setPrinting(false);
      setShowPrintDialog(false);
    }
  };

  const activeDoc = () => workspace.getActiveSession();
  const docName = () => activeDoc()?.displayName || "Untitled";

  return (
    <Show when={showPrintDialog()}>
      <Portal mount={document.body}>
        <DesktopDialog
          title="Print"
          kind="print"
          manageFocus
          dismissible={!printing()}
          onDismiss={() => setShowPrintDialog(false)}
          onBackdropPointerDown={() => { if (!printing()) setShowPrintDialog(false); }}
          actions={<>
            <DesktopDialogButton onClick={() => setShowPrintDialog(false)} disabled={printing()}>
              Cancel
            </DesktopDialogButton>
            <DesktopDialogButton variant="primary" onClick={handlePrint} disabled={printing()}>
              <Show when={printing()}>
                <span aria-hidden="true" class="mr-1.5 inline-block size-3 animate-spin rounded-full border-2 border-editor-bg/30 border-t-editor-bg" />
              </Show>
              {printing() ? "Preparing..." : "Print"}
            </DesktopDialogButton>
          </>}
        >
          <div class="flex flex-col gap-4">
            {/* Document info */}
            <div class="flex items-center gap-3 rounded-[6px] border border-editor-divider bg-editor-field p-2.5">
              <div class="min-w-0 flex-1">
                <div class="truncate text-[12px] font-semibold text-editor-text leading-tight" title={docName()}>
                  {docName()}
                </div>
                <div class="truncate text-[11px] text-editor-text-dim leading-snug mt-0.5">
                  {docWidth()} × {docHeight()} px
                </div>
              </div>
            </div>

            {/* Preview */}
            <Show when={previewUrl()}>
              <div class="flex items-center justify-center rounded-[6px] border border-editor-divider bg-editor-canvas p-2">
                <img
                  src={previewUrl()!}
                  alt="Print preview"
                  class="max-h-[240px] max-w-full rounded-[4px] object-contain shadow-sm"
                />
              </div>
            </Show>
          </div>
        </DesktopDialog>
      </Portal>
    </Show>
  );
}
