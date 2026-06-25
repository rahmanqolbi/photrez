import { createSignal, Show } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { AdjustmentsPanel } from "./AdjustmentsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { Navigator } from "./Navigator";
import { useEditor } from "./EditorContext";

type RightDockProps = {
  open: boolean;
  onClose: () => void;
};

function ExportButton() {
  const { setShowExportDialog } = useEditor();
  return (
    <button
      onClick={() => setShowExportDialog(true)}
      class="flex h-[28px] shrink-0 items-center gap-2 rounded-[4px] border border-editor-field-border px-3 text-[12.5px] text-editor-text transition-colors hover:bg-white/[0.045] hover:text-editor-text"
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
  const { inspectorTab, setInspectorTab, adjustSubTab, setAdjustSubTab, rightDockLayout } = useEditor();
  const isStacked = () => rightDockLayout() === "stacked";

  const activeTab = () => {
    if (inspectorTab() === "presets") return "presets";
    return adjustSubTab();
  };

  const handleTabChange = (tab: "properties" | "adjustments" | "presets") => {
    if (tab === "presets") {
      setInspectorTab("presets");
    } else {
      setInspectorTab("adjust");
      setAdjustSubTab(tab);
    }
  };

  return (
    <div
      class={clsx(
        "flex w-full flex-1 min-h-0 flex-col border-editor-divider bg-editor-panel",
        isStacked()
          ? "border-b"
          : "border-b lg:border-b-0 lg:border-r lg:w-[300px] 2xl:w-[336px] lg:flex-none"
      )}
    >
      <div class="flex h-[44px] shrink-0 items-center border-b border-editor-divider bg-editor-panel pl-0">
        <nav role="tablist" aria-label="Inspector tabs" class="flex h-full min-w-0 items-center overflow-hidden">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab() === "properties"}
            onClick={() => handleTabChange("properties")}
            class={clsx(
              "relative flex h-full items-center px-4 text-[12px] font-medium transition-colors",
              activeTab() === "properties"
                ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
                : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
            )}
          >
            Properties
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab() === "adjustments"}
            onClick={() => handleTabChange("adjustments")}
            class={clsx(
              "relative flex h-full items-center px-4 text-[12px] font-medium transition-colors",
              activeTab() === "adjustments"
                ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
                : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
            )}
          >
            Adjustments
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab() === "presets"}
            onClick={() => handleTabChange("presets")}
            class={clsx(
              "relative flex h-full items-center px-4 text-[12px] font-medium transition-colors",
              activeTab() === "presets"
                ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
                : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
            )}
          >
            Presets
          </button>
        </nav>
      </div>
      <div class="flex-1 min-h-0 flex flex-col">
        {activeTab() === "properties" && <PropertiesPanel />}
        {activeTab() === "adjustments" && <AdjustmentsPanel />}
        {activeTab() === "presets" && (
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
  const {
    rightDockLayout,
    rightDockPanel,
    setRightDockPanel,
    activeDocumentId,
    setViewportState,
    pan,
    zoom,
    syncViewport,
    workspace,
    renderer,
    scheduler,
  } = useEditor();
  const isStacked = () => rightDockLayout() === "stacked";
  const [navigatorCollapsed, setNavigatorCollapsed] = createSignal(false);

  return (
    <div
      class={clsx(
        "flex w-full flex-1 min-h-0 flex-col bg-editor-panel",
        isStacked()
          ? ""
          : "lg:w-[260px] 2xl:w-[298px] lg:flex-none"
      )}
    >
      <div class="flex h-[44px] shrink-0 items-center border-b border-editor-divider bg-editor-panel pl-0">
        <nav role="tablist" aria-label="Layer dock tabs" class="flex h-full min-w-0 items-center overflow-hidden">
          <button
            type="button"
            role="tab"
            aria-selected={rightDockPanel() === "layers"}
            onClick={() => setRightDockPanel("layers")}
            class={clsx(
              "relative flex h-full items-center px-4 text-[12px] font-medium transition-colors",
              rightDockPanel() === "layers"
                ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
                : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
            )}
          >
            Layers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rightDockPanel() === "history"}
            onClick={() => setRightDockPanel("history")}
            class={clsx(
              "relative flex h-full items-center px-4 text-[12px] font-medium transition-colors",
              rightDockPanel() === "history"
                ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-accent"
                : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
            )}
          >
            History
          </button>
        </nav>
      </div>
      <div class="flex-1 min-h-0 flex flex-col">
        {rightDockPanel() === "layers" ? <LayersPanel /> : <HistoryPanel />}
      </div>

      {/* Navigator panel */}
      <div data-navigator-panel class="shrink-0 border-t border-editor-divider bg-editor-panel">
        <div
          class={clsx(
            "flex h-[46px] items-center justify-between px-4",
            !navigatorCollapsed() && "border-b border-editor-divider"
          )}
        >
          <button
            onClick={() => setNavigatorCollapsed(!navigatorCollapsed())}
            class="flex items-center gap-1.5 text-[13px] font-medium text-editor-text hover:text-editor-text-dim transition-colors"
          >
            <Icon
              name={navigatorCollapsed() ? "chevron-right" : "chevron-down"}
              class="size-3.5 text-editor-text-dim"
              strokeWidth={1.75}
            />
            <span>Navigator</span>
          </button>
          <Show when={!navigatorCollapsed()}>
            <button
              onClick={() => {
                const engine = workspace.getActiveEngine();
                if (engine) {
                  const container = document.getElementById("canvas-container");
                  const rect = container?.getBoundingClientRect();
                  if (rect) {
                    engine.fitToScreen(rect.width, rect.height);
                    syncViewport();
                    const dpr = window.devicePixelRatio || 1;
                    renderer.resizeToViewport(rect.width, rect.height, dpr);
                    scheduler.requestRender();
                  }
                }
              }}
              class="text-editor-text-dim hover:text-editor-text transition-colors p-1 rounded hover:bg-white/5"
              title="Fit Screen"
            >
              <Icon name="maximize" class="size-3.5" strokeWidth={1.75} />
            </button>
          </Show>
        </div>
        
        <Show when={!navigatorCollapsed()}>
          <Navigator />

          <div class={clsx("flex items-center gap-2.5 px-4 py-3", !activeDocumentId() && "opacity-50 pointer-events-none")}>
            <button 
              onClick={() => {
                const engine = workspace.getActiveEngine();
                if (engine) {
                  setViewportState({
                    x: pan().x,
                    y: pan().y,
                    zoom: Math.max(0.05, zoom() - 0.1),
                  });
                  scheduler.requestRender();
                }
              }}
              class="text-[12px] text-editor-text-dim hover:text-editor-text px-1"
            >
              -
            </button>
            <input
              type="range"
              min="5"
              max="400"
              value={Math.round(zoom() * 100)}
              onInput={(e) => {
                const engine = workspace.getActiveEngine();
                if (engine) {
                  setViewportState({
                    x: pan().x,
                    y: pan().y,
                    zoom: parseInt(e.target.value) / 100,
                  });
                  scheduler.requestRender();
                }
              }}
              class="h-[3px] w-full accent-editor-accent bg-editor-field-border rounded-full appearance-none cursor-pointer"
            />
            <button 
              onClick={() => {
                const engine = workspace.getActiveEngine();
                if (engine) {
                  setViewportState({
                    x: pan().x,
                    y: pan().y,
                    zoom: Math.min(4.0, zoom() + 0.1),
                  });
                  scheduler.requestRender();
                }
              }}
              class="text-[12px] text-editor-text-dim hover:text-editor-text px-1"
            >
              +
            </button>
            <span class="text-[12px] text-editor-text min-w-[36px] text-right">{Math.round(zoom() * 100)}%</span>
          </div>
        </Show>
      </div>
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
