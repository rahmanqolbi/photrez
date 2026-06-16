import { Icon } from "./icons";
import { useEditor } from "./EditorContext";
import { WorkspaceManager } from "@/engine/workspace";
import { useTauriDragDrop } from "./useTauriDragDrop";
import { createNewDocsFromFiles } from "./crossDocLayerOps";

export function EmptyWorkspace() {
  const { openImage, workspace, renderer, scheduler } = useEditor();

  const handleNewCanvas = () => {
    const widthStr = prompt("Enter canvas width (pixels):", "1920");
    if (!widthStr) return;
    const heightStr = prompt("Enter canvas height (pixels):", "1080");
    if (!heightStr) return;

    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      alert("Invalid dimensions!");
      return;
    }

    const id = `doc-${crypto.randomUUID()}`;
    const session = WorkspaceManager.createBlankDocument(id, "Untitled Canvas", width, height);
    workspace.addDocument(session);
  };

  useTauriDragDrop({
    onDrop: async (paths) => {
      const created = await createNewDocsFromFiles(paths, workspace as unknown as Parameters<typeof createNewDocsFromFiles>[1]);
      for (const { backgroundLayerId, bitmap } of created) {
        renderer.uploadImage(backgroundLayerId, bitmap);
      }
      if (created.length) scheduler.requestRender();
    },
  });

  return (
    <div class="flex flex-1 items-center justify-center bg-editor-canvas p-6">
      <div class="flex w-full max-w-[480px] flex-col items-center justify-center rounded-[8px] border border-editor-divider bg-editor-panel p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
        <Icon name="image-plus" class="mb-4 size-12 text-editor-text-dim opacity-50" strokeWidth={1.5} />
        <h3 class="mb-2 text-[15px] font-semibold text-editor-text">No image open</h3>
        <p class="mb-6 text-[13px] text-editor-text-dim">Drop an image here or open one from your computer.</p>
        <div class="flex w-full flex-col gap-3">
          <button
            onClick={openImage}
            class="flex h-9 w-full items-center justify-center rounded-[4px] bg-editor-accent text-[13px] font-medium text-white transition-colors hover:bg-editor-accent/90"
          >
            Open Image
          </button>
          <button
            onClick={handleNewCanvas}
            class="flex h-9 w-full items-center justify-center rounded-[4px] border border-editor-divider bg-transparent text-[13px] font-medium text-editor-text transition-colors hover:bg-white/[0.03]"
          >
            New Canvas
          </button>
        </div>
        <div class="relative mt-8 mb-4 w-full">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-editor-divider" />
          </div>
          <div class="relative flex justify-center">
            <span class="bg-editor-panel px-3 text-[11px] font-medium text-editor-text-dim uppercase tracking-wider">Recent files</span>
          </div>
        </div>
        <div class="flex w-full flex-col gap-1.5 text-[12px] text-editor-text-dim">
          <button class="flex items-center gap-3 rounded-[4px] px-3 py-2 hover:bg-white/[0.03] transition-colors text-left group">
            <Icon name="image" class="size-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span class="flex-1 truncate">portrait-retouch.psd</span>
            <span class="text-[10px] opacity-40">2 hours ago</span>
          </button>
          <button class="flex items-center gap-3 rounded-[4px] px-3 py-2 hover:bg-white/[0.03] transition-colors text-left group">
            <Icon name="image" class="size-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span class="flex-1 truncate">brand-poster.png</span>
            <span class="text-[10px] opacity-40">Yesterday</span>
          </button>
        </div>
        <p class="mt-8 text-[11px] text-editor-text-dim/60">Supports JPG, PNG, TIFF, PSD, WebP, HEIC, RAW and more.</p>
      </div>
    </div>
  );
}

