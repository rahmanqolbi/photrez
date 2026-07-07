import { createSignal, For } from "solid-js";
import { DesktopDialog, DesktopDialogButton, desktopDialogFieldClass } from "./DesktopDialog";
import type { DialogRequest } from "./DialogProvider";

const PRESETS = {
  Social: [
    { name: "FB Page Cover", width: 1640, height: 664 },
    { name: "Insta Story", width: 1080, height: 1920 },
    { name: "Insta Portrait", width: 1080, height: 1350 },
    { name: "YouTube Thumbnail", width: 1280, height: 720 },
  ],
  Print: [
    { name: "A4", width: 2480, height: 3508 },
    { name: "A5", width: 1748, height: 2480 },
    { name: "Letter", width: 2550, height: 3300 },
  ],
  Screen: [
    { name: "HD", width: 1920, height: 1080 },
    { name: "4K", width: 3840, height: 2160 },
    { name: "QHD", width: 2560, height: 1440 },
  ],
  Photo: [
    { name: "4x6 Landscape", width: 1800, height: 1200 },
    { name: "4x6 Portrait", width: 1200, height: 1800 },
  ],
};

type Category = keyof typeof PRESETS;
const CATEGORIES = Object.keys(PRESETS) as Category[];

export function NewDocumentDialogContent(props: { request: Extract<DialogRequest, { kind: "new-document" }> }) {
  const [activeTab, setActiveTab] = createSignal<Category>("Social");
  const [docName, setDocName] = createSignal("New Project");
  const [width, setWidth] = createSignal(1080);
  const [height, setHeight] = createSignal(1080);
  const [background, setBackground] = createSignal<"transparent" | "white">("transparent");

  const applyPreset = (preset: { name: string, width: number, height: number }) => {
    setDocName(preset.name);
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleCreate = () => {
    props.request.resolve({
      name: docName(),
      width: width(),
      height: height(),
      backgroundColor: background(),
    });
  };

  const handleCancel = () => {
    props.request.resolve(null);
  };

  return (
    <DesktopDialog
      title={props.request.options.title ?? "New Document"}
      kind="new-document"
      onBackdropPointerDown={handleCancel}
      widthClass="w-[720px]"
      bodyClass="p-0 flex h-[480px] overflow-hidden"
    >
      {/* LEFT PANEL */}
      <div class="flex-1 border-r border-editor-divider bg-editor-panel flex flex-col min-w-0">
        <div class="flex h-10 border-b border-editor-divider px-2 items-center gap-1 shrink-0">
          <For each={CATEGORIES}>
            {(cat) => (
              <button
                class={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  activeTab() === cat
                    ? "bg-white/[0.08] text-editor-text"
                    : "text-editor-text-dim hover:text-editor-text hover:bg-white/[0.04]"
                }`}
                onClick={() => setActiveTab(cat)}
              >
                {cat}
              </button>
            )}
          </For>
        </div>
        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div class="grid grid-cols-3 gap-3">
            <For each={PRESETS[activeTab()]}>
              {(preset) => (
                <button
                  class="flex flex-col items-center justify-center gap-2 rounded-lg border border-editor-divider bg-editor-field hover:border-editor-accent/50 hover:bg-white/[0.06] p-4 text-center transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-editor-accent/70"
                  onClick={() => applyPreset(preset)}
                >
                  <div class="flex h-16 w-16 items-center justify-center rounded border border-editor-field-border bg-black/40">
                    <span class="text-[10px] text-editor-text-dim">{preset.width} × {preset.height}</span>
                  </div>
                  <span class="text-[11px] font-medium text-editor-text">{preset.name}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div class="w-[240px] shrink-0 bg-editor-topbar/30 flex flex-col p-5 gap-5">
        <div class="flex flex-col gap-4 flex-1">
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-medium text-editor-text-dim">Name</label>
            <input
              type="text"
              class={desktopDialogFieldClass}
              value={docName()}
              onInput={(e) => setDocName(e.currentTarget.value)}
            />
          </div>
          <div class="flex gap-3">
            <div class="flex flex-col gap-1.5 flex-1 min-w-0">
              <label class="text-[11px] font-medium text-editor-text-dim">Width</label>
              <div class="relative">
                <input
                  type="number"
                  class={desktopDialogFieldClass + " pr-6"}
                  value={width()}
                  onInput={(e) => setWidth(parseInt(e.currentTarget.value) || 1)}
                  min="1"
                />
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-editor-text-dim pointer-events-none">px</span>
              </div>
            </div>
            <div class="flex flex-col gap-1.5 flex-1 min-w-0">
              <label class="text-[11px] font-medium text-editor-text-dim">Height</label>
              <div class="relative">
                <input
                  type="number"
                  class={desktopDialogFieldClass + " pr-6"}
                  value={height()}
                  onInput={(e) => setHeight(parseInt(e.currentTarget.value) || 1)}
                  min="1"
                />
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-editor-text-dim pointer-events-none">px</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-medium text-editor-text-dim">Background</label>
            <select
              class={desktopDialogFieldClass}
              value={background()}
              onChange={(e) => setBackground(e.currentTarget.value as any)}
            >
              <option value="transparent">Transparent</option>
              <option value="white">White</option>
            </select>
          </div>
        </div>

        <div class="flex flex-col gap-2 pt-4 border-t border-editor-divider">
          <DesktopDialogButton variant="primary" class="w-full h-8" onClick={handleCreate}>
            Create
          </DesktopDialogButton>
          <DesktopDialogButton class="w-full h-8" onClick={handleCancel}>
            Cancel
          </DesktopDialogButton>
        </div>
      </div>
    </DesktopDialog>
  );
}
