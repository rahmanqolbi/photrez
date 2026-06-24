import { createSignal } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { AdjustmentsPanel } from "./AdjustmentsPanel";
import { useEditor } from "./EditorContext";

type RightDockProps = {
  open: boolean;
  onClose: () => void;
};

type InspectorTab = "library" | "adjust" | "presets";

function InspectorTabs(props: { activeTab: InspectorTab; onTabChange: (tab: InspectorTab) => void }) {
  return (
    <nav class="flex h-full min-w-0 items-center overflow-hidden">
      <button
        onClick={() => props.onTabChange("library")}
        class={clsx(
          "relative flex h-full items-center px-4 text-[12px] font-medium transition-colors",
          props.activeTab === "library"
            ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
            : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
        )}
      >
        Library
      </button>
      <button
        onClick={() => props.onTabChange("adjust")}
        class={clsx(
          "relative flex h-full items-center px-4 text-[12px] font-medium transition-colors",
          props.activeTab === "adjust"
            ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
            : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
        )}
      >
        Adjust
      </button>
      <button
        onClick={() => props.onTabChange("presets")}
        class={clsx(
          "relative flex h-full items-center px-4 text-[12px] font-medium transition-colors",
          props.activeTab === "presets"
            ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
            : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
        )}
      >
        Presets
      </button>
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

function AdjustPanel() {
  const { adjustSubTab, setAdjustSubTab } = useEditor();

  return (
    <div class="flex flex-grow flex-col min-h-0">
      <div class="flex h-[36px] shrink-0 items-center border-b border-editor-divider bg-editor-panel/50 pl-0">
        <button
          onClick={() => setAdjustSubTab("properties")}
          class={clsx(
            "relative flex h-full items-center px-4 text-[11px] font-medium transition-colors",
            adjustSubTab() === "properties"
              ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[1.5px] after:bg-editor-accent"
              : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
          )}
        >
          Properties
        </button>
        <button
          onClick={() => setAdjustSubTab("adjustments")}
          class={clsx(
            "relative flex h-full items-center px-4 text-[11px] font-medium transition-colors",
            adjustSubTab() === "adjustments"
              ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[1.5px] after:bg-editor-accent"
              : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
          )}
        >
          Adjustments
        </button>
      </div>
      <div class="flex-1 min-h-0 flex flex-col">
        {adjustSubTab() === "properties" ? <PropertiesPanel /> : <AdjustmentsPanel />}
      </div>
    </div>
  );
}

function InspectorDock() {
  const { inspectorTab, setInspectorTab, rightDockLayout } = useEditor();
  const isStacked = () => rightDockLayout() === "stacked";

  return (
    <div
      class={clsx(
        "flex w-full flex-1 min-h-0 flex-col border-editor-divider bg-editor-panel",
        isStacked()
          ? "border-b"
          : "border-b lg:border-b-0 lg:border-r lg:w-[300px] 2xl:w-[336px] lg:flex-none"
      )}
    >
      <div class="flex h-[44px] shrink-0 items-center border-b border-editor-divider bg-editor-topbar pl-0">
        <InspectorTabs activeTab={inspectorTab()} onTabChange={setInspectorTab} />
      </div>
      <div class="flex-1 min-h-0 flex flex-col">
        {inspectorTab() === "library" && (
          <div class="flex h-full flex-col items-center justify-center p-6 text-center">
            <Icon name="box" class="size-6 text-editor-text-dim opacity-50 mb-3" strokeWidth={1.5} />
            <p class="text-[13px] font-medium text-editor-text">Library</p>
            <p class="text-[12px] text-editor-text-dim leading-snug mt-1">Coming soon: manage and search your design assets, shapes, and templates.</p>
          </div>
        )}
        {inspectorTab() === "adjust" && <AdjustPanel />}
        {inspectorTab() === "presets" && (
          <div class="flex h-full flex-col items-center justify-center p-6 text-center">
            <Icon name="sparkles" class="size-6 text-editor-text-dim opacity-50 mb-3" strokeWidth={1.5} />
            <p class="text-[13px] font-medium text-editor-text">Presets</p>
            <p class="text-[12px] text-editor-text-dim leading-snug mt-1">Coming soon: save and apply custom filter adjustments and effects.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LayoutToggleButton() {
  const { rightDockLayout, setRightDockLayout } = useEditor();
  return (
    <button
      onClick={() => setRightDockLayout(rightDockLayout() === "side-by-side" ? "stacked" : "side-by-side")}
      class={clsx(
        "flex size-7 items-center justify-center rounded-[4px] text-editor-icon hover:bg-white/[0.045] hover:text-editor-text",
        rightDockLayout() === "stacked" && "text-editor-accent"
      )}
      title={rightDockLayout() === "side-by-side" ? "Switch to Stacked Dock" : "Switch to Side-by-Side Dock"}
    >
      <Icon
        name="columns"
        class="size-4"
        strokeWidth={1.75}
      />
    </button>
  );
}

function LayerDock(props: Pick<RightDockProps, "onClose">) {
  const { rightDockLayout } = useEditor();
  const isStacked = () => rightDockLayout() === "stacked";

  return (
    <div
      class={clsx(
        "flex w-full flex-1 min-h-0 flex-col bg-editor-panel",
        isStacked()
          ? ""
          : "lg:w-[260px] 2xl:w-[298px] lg:flex-none"
      )}
    >
      <div class="flex h-[44px] shrink-0 items-center justify-end gap-2 border-b border-editor-divider bg-editor-topbar pr-4">
        <LayoutToggleButton />
        <ExportButton />
        <button
          class="flex size-7 items-center justify-center rounded-[4px] text-editor-icon hover:bg-white/[0.045] hover:text-editor-text lg:hidden"
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
  const { rightDockLayout } = useEditor();

  return (
    <aside
      class={clsx(
        "flex shrink-0 overflow-hidden border-l border-editor-divider bg-editor-panel",
        rightDockLayout() === "side-by-side"
          ? "flex flex-col lg:flex-row w-[300px] lg:w-auto lg:static lg:z-auto lg:shadow-none"
          : "flex flex-col w-[300px] lg:w-[300px] 2xl:w-[336px] h-full lg:static lg:z-auto lg:shadow-none",
        props.open ? "flex" : "hidden",
      )}
    >
      <InspectorDock />
      <LayerDock onClose={props.onClose} />
    </aside>
  );
}
