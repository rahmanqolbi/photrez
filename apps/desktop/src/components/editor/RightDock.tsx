import { For } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { INSPECTOR_TABS } from "./editorData";
import { useEditor } from "./EditorContext";

type RightDockProps = {
  open: boolean;
  onClose: () => void;
};

function InspectorTabs() {
  return (
    <nav class="flex h-full min-w-0 items-center overflow-hidden">
      <For each={INSPECTOR_TABS}>
        {(tab) => (
          <button
            class={clsx(
              "relative flex h-full items-center px-6 text-[12px] font-medium transition-colors",
              tab.active
                ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-text-dim"
                : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
            )}
          >
            {tab.label}
          </button>
        )}
      </For>
    </nav>
  );
}

function ExportButton() {
  const { setShowExportDialog } = useEditor();
  return (
    <button
      onClick={() => setShowExportDialog(true)}
      class="flex h-[28px] shrink-0 items-center gap-2 rounded-[4px] border border-editor-field-border px-3 text-[12.5px] text-editor-text transition-colors hover:bg-white/[0.045]"
    >
      Export
      <Icon
        name="chevron-down"
        class="size-3.5 text-editor-text-dim"
        strokeWidth={1.75}
      />
    </button>
  );
}

function InspectorDock() {
  return (
    <div class="flex w-[300px] shrink-0 flex-col border-r border-editor-divider bg-editor-panel 2xl:w-[336px]">
      <div class="flex h-[44px] shrink-0 items-center border-b border-editor-divider bg-editor-topbar pl-0">
        <InspectorTabs />
      </div>
      <PropertiesPanel />
    </div>
  );
}

function LayerDock(props: Pick<RightDockProps, "onClose">) {
  return (
    <div class="flex w-[260px] shrink-0 flex-col bg-editor-panel 2xl:w-[298px]">
      <div class="flex h-[44px] shrink-0 items-center justify-end gap-2 border-b border-editor-divider bg-editor-topbar pr-4">
        <ExportButton />
        <button
          class="flex size-7 items-center justify-center rounded-[4px] text-editor-icon hover:bg-white/[0.045] hover:text-editor-text xl:hidden"
          aria-label="Close side panels"
          onClick={props.onClose}
        >
          <Icon name="x" class="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <LayersPanel />
    </div>
  );
}

export function RightDock(props: RightDockProps) {
  return (
    <aside
      class={clsx(
        "bottom-[32px] right-0 top-[54px] z-40 flex shrink-0 overflow-hidden border-l border-editor-divider shadow-[-18px_0_40px_rgba(0,0,0,0.24)]",
        "fixed w-[min(92vw,634px)] max-w-[calc(100vw-52px)] xl:static xl:z-auto xl:flex xl:w-auto xl:max-w-none xl:shadow-none",
        props.open ? "flex" : "hidden",
      )}
    >
      <InspectorDock />
      <LayerDock onClose={props.onClose} />
    </aside>
  );
}
