import { For } from "solid-js";
import { Icon } from "../icons";
import { useEditor } from "./EditorContext";
import { WorkspaceManager } from "@/engine/workspace";
import { MAX_OPEN_DOCUMENTS } from "@/engine/types";
import { showToast } from "../Toast";

const CANVAS_PRESETS = [
  { label: "Small", width: 800, height: 600 },
  { label: "Wide", width: 1600, height: 1000 },
  { label: "HD", width: 1920, height: 1080 },
] as const;

export function EmptyWorkspace() {
  const { openImage, workspace, scheduler } = useEditor();

  const createCanvas = (width: number, height: number) => {
    // toast instead of a silent throw from workspace.addDocument.
    // The other entry points (crossDocLayerOps, editorOpenImage)
    // already check isFull() before adding; this was the missing one.
    if (workspace.isFull()) {
      showToast(`Workspace full — close a document first (max ${MAX_OPEN_DOCUMENTS})`, "error");
      return;
    }
    const id = `doc-${crypto.randomUUID()}`;
    const session = WorkspaceManager.createBlankDocument(id, `Untitled ${width}x${height}`, width, height);
    workspace.addDocument(session);
    scheduler.requestRender();
  };

  return (
    <div class="flex flex-1 items-center justify-center bg-editor-canvas p-6">
      <section
        aria-label="Start workspace"
        class="flex w-full max-w-[520px] flex-col rounded-[6px] border border-editor-divider bg-editor-panel text-editor-text shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
      >
        <div class="border-b border-editor-divider px-5 py-4">
          <div class="flex items-center gap-3">
            <div class="flex size-9 items-center justify-center rounded-[4px] bg-editor-field text-editor-text-dim">
              <Icon name="image-plus" class="size-5" strokeWidth={1.5} />
            </div>
            <div class="min-w-0">
              <h2 class="text-[14px] font-semibold text-editor-text">Start a Photrez document</h2>
              <p class="mt-0.5 text-[12px] text-editor-text-dim">Open an image, drop one into the workspace, or create a blank canvas.</p>
            </div>
          </div>
        </div>

        <div class="grid gap-3 px-5 py-5">
          <button
            type="button"
            onClick={openImage}
            class="flex h-9 w-full items-center justify-center gap-2 rounded-[4px] bg-editor-accent px-3 text-[13px] font-medium text-white transition-colors hover:bg-editor-accent/90 focus-visible:outline focus-visible:outline-1 focus-visible:outline-editor-accent"
          >
            <Icon name="folder-plus" class="size-4" strokeWidth={1.75} />
            Open Image
          </button>
          <button
            type="button"
            onClick={() => createCanvas(1600, 1000)}
            class="flex h-9 w-full items-center justify-center gap-2 rounded-[4px] border border-editor-field-border bg-editor-field px-3 text-[13px] font-medium text-editor-text transition-colors hover:bg-white/[0.045] focus-visible:outline focus-visible:outline-1 focus-visible:outline-editor-accent"
          >
            <Icon name="plus" class="size-4" strokeWidth={1.75} />
            New Canvas
          </button>
        </div>

        <div class="border-t border-editor-divider px-5 py-4">
          <div class="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-editor-text-dim">Blank presets</div>
          <div class="grid grid-cols-3 gap-2">
            <For each={CANVAS_PRESETS}>
              {(preset) => (
                <button
                  type="button"
                  onClick={() => createCanvas(preset.width, preset.height)}
                  class="flex min-h-[54px] flex-col justify-center rounded-[4px] border border-editor-divider bg-transparent px-3 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-1 focus-visible:outline-editor-accent"
                >
                  <span class="text-[12px] font-medium text-editor-text">{preset.label}</span>
                  <span class="mt-0.5 text-[11px] text-editor-text-dim">{preset.width} x {preset.height}</span>
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-editor-divider px-5 py-3 text-[11px] text-editor-text-dim">
          <span>Drop PNG, JPEG, or WebP files anywhere in this workspace.</span>
          <kbd class="rounded-[3px] border border-editor-divider bg-editor-field px-1.5 py-0.5 text-[10px] text-editor-text-dim">Ctrl+O</kbd>
        </div>
      </section>
    </div>
  );
}
