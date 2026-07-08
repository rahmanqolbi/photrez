import { createSignal, For, type JSX } from "solid-js";
import { clsx } from "clsx";
import { DesktopDialog, DesktopDialogButton, desktopDialogFieldClass } from "./DesktopDialog";
import type { DialogRequest, NewDocumentResult } from "./DialogProvider";

const PRESETS = {
  "Social Media": [
    { name: "FB Page Cover", width: 1640, height: 664 },
    { name: "Insta Story", width: 1080, height: 1920 },
    { name: "Insta Portrait", width: 1080, height: 1350 },
    { name: "YouTube Thumbnail", width: 1280, height: 720 },
  ],
  "Web & Video": [
    { name: "HD", width: 1920, height: 1080 },
    { name: "4K", width: 3840, height: 2160 },
    { name: "QHD", width: 2560, height: 1440 },
  ],
  "Paper": [
    { name: "A4", width: 2480, height: 3508 },
    { name: "A5", width: 1748, height: 2480 },
    { name: "Letter", width: 2550, height: 3300 },
  ],
  "Photography": [
    { name: "4x6 Landscape", width: 1800, height: 1200 },
    { name: "4x6 Portrait", width: 1200, height: 1800 },
  ],
};

type Category = keyof typeof PRESETS;
const CATEGORIES = Object.keys(PRESETS) as Category[];

export function NewDocumentDialogContent(props: {
  request: Extract<DialogRequest, { kind: "new-document" }>;
  onClose: (result: NewDocumentResult | null) => void;
  dialogRef?: (element: HTMLDivElement) => void;
  onKeyDown?: JSX.EventHandler<HTMLDivElement, KeyboardEvent>;
}) {
  const [activeTab, setActiveTab] = createSignal<Category>("Social Media");
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
    props.onClose({
      name: docName(),
      width: width(),
      height: height(),
      backgroundColor: background() as "white" | "transparent",
    });
  };

  const handleCancel = () => {
    props.onClose(null);
  };

  const getCanvasStyle = (w: number, h: number) => {
    const maxDim = 64; // Max size for the preview
    const scale = maxDim / Math.max(w, h);
    return {
      width: `${Math.max(20, Math.round(w * scale))}px`,
      height: `${Math.max(20, Math.round(h * scale))}px`,
    };
  };

  return (
    <DesktopDialog
      title={props.request.options.title ?? "New Document"}
      kind="new-document"
      onBackdropPointerDown={handleCancel}
      widthClass="w-[680px]"
      bodyClass="!p-0 flex flex-col h-[460px] overflow-hidden"
      dialogRef={props.dialogRef}
      onKeyDown={props.onKeyDown}
    >
      {/* MAIN CONTENT */}
      <div class="flex flex-1 min-h-0">
        {/* LEFT PANEL */}
        <div class="flex-1 border-r border-editor-divider bg-editor-panel flex flex-col min-w-0">
          <div class="flex h-[44px] shrink-0 items-center border-b border-editor-divider">
            <For each={CATEGORIES}>
              {(cat) => (
                <button
                  class={clsx(
                    "relative flex h-full items-center px-5 text-[12px] font-medium transition-colors",
                    activeTab() === cat
                      ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
                      : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
                  )}
                  onClick={() => setActiveTab(cat)}
                >
                  {cat}
                </button>
              )}
            </For>
          </div>
          <div class="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div class="grid grid-cols-3 gap-3">
              <For each={PRESETS[activeTab()]}>
                {(preset) => (
                  <button
                    class="flex flex-col items-center p-3 rounded-lg border border-editor-divider bg-editor-field hover:border-editor-accent/50 hover:bg-white/[0.06] text-center transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-editor-accent/70 h-32"
                    onClick={() => applyPreset(preset)}
                  >
                    <div class="flex-1 flex items-center justify-center w-full min-h-0">
                      <div class="flex h-16 w-16 items-center justify-center">
                        <div
                          class="bg-white/90 rounded-[2px] shadow-sm border border-black/20"
                          style={getCanvasStyle(preset.width, preset.height)}
                        />
                      </div>
                    </div>
                    <div class="flex flex-col gap-0.5 items-center shrink-0 w-full mt-2">
                      <span class="text-[12px] font-medium text-editor-text leading-tight truncate w-full px-1">{preset.name}</span>
                      <span class="text-[11px] text-editor-text-dim leading-tight">{preset.width} × {preset.height}</span>
                    </div>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (Form) */}
        <div class="w-[240px] shrink-0 bg-editor-topbar/30 flex flex-col p-4 gap-4">
          <div class="flex flex-col gap-4 flex-1">
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-editor-text-dim">Name</label>
              <input
                type="text"
                class={desktopDialogFieldClass}
                value={docName()}
                onInput={(e) => setDocName(e.currentTarget.value)}
              />
            </div>
            <div class="flex gap-3">
              <div class="flex flex-col gap-1.5 flex-1 min-w-0">
                <label class="text-[12px] font-medium text-editor-text-dim">Width</label>
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
                <label class="text-[12px] font-medium text-editor-text-dim">Height</label>
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
              <label class="text-[12px] font-medium text-editor-text-dim">Background</label>
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
        </div>
      </div>

      {/* FOOTER */}
      <div class="h-14 border-t border-editor-divider bg-editor-panel flex items-center justify-end px-5 gap-3 shrink-0">
        <DesktopDialogButton class="w-24 h-8" onClick={handleCancel}>
          Cancel
        </DesktopDialogButton>
        <DesktopDialogButton variant="primary" class="w-24 h-8" onClick={handleCreate}>
          Create
        </DesktopDialogButton>
      </div>
    </DesktopDialog>
  );
}
