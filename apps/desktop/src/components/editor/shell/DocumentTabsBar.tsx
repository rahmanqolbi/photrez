import { For, Show, createSignal } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "../icons";
import { Tooltip } from "../Tooltip";
import { useEditor } from "./EditorContext";
import { WorkspaceManager } from "@/engine/workspace";
import { MAX_OPEN_DOCUMENTS } from "@/engine/types";
import { cancelLayerTransformSession } from "../transformSession";
import { useDragController } from "../DragController";
import { addFilesAsLayers, addLayerFromCrossDoc, createNewDocsFromFiles, type WorkspaceFacade } from "../crossDocLayerOps";
import { showToast } from "../Toast";

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

function LayoutToggleButton() {
  const { rightDockLayout, setRightDockLayout } = useEditor();
  return (
    <Tooltip content={rightDockLayout() === "side-by-side" ? "Switch to Stacked Dock" : "Switch to Side-by-Side Dock"}>
      <button
        onClick={() => setRightDockLayout(rightDockLayout() === "side-by-side" ? "stacked" : "side-by-side")}
        class={clsx(
          "flex size-7 items-center justify-center rounded-[4px] text-editor-icon hover:bg-white/[0.045] hover:text-editor-text",
          rightDockLayout() === "stacked" && "text-editor-accent"
        )}
      >
        <Icon
          name="columns"
          class="size-4"
          strokeWidth={1.75}
        />
      </button>
    </Tooltip>
  );
}

function CloseDockButton() {
  const { setRightDockOpen } = useEditor();
  return (
    <button
      class="flex size-7 items-center justify-center rounded-[4px] text-editor-icon hover:bg-white/[0.045] hover:text-editor-text lg:hidden"
      aria-label="Close side panels"
      onClick={() => setRightDockOpen(false)}
    >
      <Icon name="x" class="size-4" strokeWidth={1.75} />
    </button>
  );
}

export function DocumentTabsBar() {
  const { workspace, documents, activeDocumentId, renderer, scheduler, layerTransformSession, setLayerTransformSession } = useEditor();
  const drag = useDragController();
  const [isHovered, setIsHovered] = createSignal(false);

  const cancelActiveTransformSession = () => {
    const engine = workspace.getActiveEngine();
    if (cancelLayerTransformSession(layerTransformSession(), engine)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
  };

  const handleSwitchTab = (id: string) => {
    if (layerTransformSession()) {
      cancelActiveTransformSession();
    }
    workspace.switchDocument(id);
    scheduler.requestRender();
  };

  const handleCloseTab = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (layerTransformSession()) {
      cancelActiveTransformSession();
    }
    workspace.removeDocument(id);
    scheduler.requestRender();
  };

  const handleNewTab = () => {
    if (layerTransformSession()) {
      cancelActiveTransformSession();
    }
    // instead of letting workspace.addDocument throw silently.
    if (workspace.isFull()) {
      showToast(`Workspace full — close a document first (max ${MAX_OPEN_DOCUMENTS})`, "error");
      return;
    }
    const nextId = `doc-${crypto.randomUUID()}`;
    const name = `Untitled-${workspace.getDocumentCount() + 1}`;
    const session = WorkspaceManager.createBlankDocument(nextId, name, 800, 600);
    workspace.addDocument(session);
    scheduler.requestRender();
  };

  // Pointer-driven hover detection (separate from HTML5 drag handlers
  // below). The canvas drag uses pointer events, not HTML5 drag events,
  // so the tab's onDragOver/onDragLeave don't fire for canvas drags.
  // We need pointerenter/pointerleave on the tab itself to start and
  // cancel the 500ms hover-to-switch timer.
  const handleTabPointerEnter = (e: PointerEvent, tabId: string) => {
    if (drag.state().dragKind === null) return;
    if (activeDocumentId() === tabId) {
      drag.cancelTabHover();
      return;
    }
    drag.startTabHover(tabId);
  };

  const handleTabPointerLeave = (_e: PointerEvent, tabId: string) => {
    // Only cancel if the timer was for THIS tab. Otherwise we cancel
    // a timer started by another tab.
    if (drag.state().hoverTabId === tabId) {
      drag.cancelTabHover();
    }
  };

  const handleTabDragOver = (e: DragEvent, tabId: string) => {
    e.preventDefault();
    drag.setDropTarget({ type: "tab", docId: tabId });
    if (activeDocumentId() !== tabId) {
      drag.startTabHover(tabId);
    } else {
      drag.cancelTabHover();
    }
  };

  const handleTabDragLeave = (e: DragEvent, tabId: string) => {
    const target = e.currentTarget;
    if (target && target instanceof Element && target.contains(e.relatedTarget as Node)) return;
    drag.cancelTabHover();
    const current = drag.state().dropTarget;
    if (current && current.type === "tab" && current.docId === tabId) {
      drag.setDropTarget(null);
    }
  };

  const handleTabDrop = async (e: DragEvent, tabId: string) => {
    e.preventDefault();
    drag.cancelTabHover();
    const state = drag.state();
    if (state.dragKind === "layer" && state.payload) {
      const engine = workspace.getEngine(tabId);
      if (engine) {
        addLayerFromCrossDoc(
          state.payload,
          { type: "tab", docId: tabId },
          { x: engine.getWidth() / 2, y: engine.getHeight() / 2 },
          workspace
        );
        scheduler.requestRender();
      }
    } else if (state.dragKind === "file" && state.filePaths) {
      const engine = workspace.getEngine(tabId);
      if (engine) {
        const created = await addFilesAsLayers(
          state.filePaths,
          { type: "tab", docId: tabId },
          { x: engine.getWidth() / 2, y: engine.getHeight() / 2 },
          workspace
        );
        for (const { layerId, bitmap } of created) {
          renderer.uploadImage(layerId, bitmap);
        }
        if (created.length) scheduler.requestRender();
      }
    }
    drag.endDrag();
  };

  const handleTabBarDragOver = (e: DragEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest("[data-document-tab]")) return;
    e.preventDefault();
    drag.setDropTarget({ type: "tab-empty" });
    drag.cancelTabHover();
  };

  const handleTabBarDrop = async (e: DragEvent) => {
    e.preventDefault();
    const state = drag.state();
    if (state.dragKind === "file" && state.filePaths) {
      // a single downcast replaces the previous `as unknown as ...[1]`
      // double-assert noise.
      const facade: WorkspaceFacade = workspace;
      const created = await createNewDocsFromFiles(state.filePaths, facade);
      for (const { backgroundLayerId, bitmap } of created) {
        renderer.uploadImage(backgroundLayerId, bitmap);
      }
      if (created.length) scheduler.requestRender();
    }
    drag.endDrag();
  };

  const handleWheel = (e: WheelEvent) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      const container = e.currentTarget as HTMLElement | null;
      if (container) {
        container.scrollLeft += e.deltaY;
      }
    }
  };

  const handleTabListKeyDown = (e: KeyboardEvent) => {
    const docs = documents();
    if (docs.length < 2) return;
    const currentIdx = docs.findIndex((d) => d.id === activeDocumentId());
    if (currentIdx === -1) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const nextIdx = e.key === "ArrowRight"
        ? (currentIdx + 1) % docs.length
        : (currentIdx - 1 + docs.length) % docs.length;
      handleSwitchTab(docs[nextIdx].id);
    }
  };

  return (
    <div
      class="flex h-[44px] shrink-0 items-center border-b border-editor-divider bg-editor-topbar justify-between select-none"
      data-tab-bar-empty
      onDragOver={handleTabBarDragOver}
      onDrop={handleTabBarDrop}
    >
      <div 
        role="tablist"
        class={clsx(
          "flex items-stretch overflow-x-auto tab-scrollbar flex-1 h-full min-w-0",
          isHovered() && "is-hovered"
        )}
        onWheel={handleWheel}
        onKeyDown={handleTabListKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <For each={documents()}>
          {(tab) => {
            const isDragOver = () => {
              const dt = drag.state().dropTarget;
              return dt !== null && dt.type === "tab" && dt.docId === tab.id;
            };
            const isHovering = () => drag.state().hoverTabId === tab.id;
            return (
              <div
                role="tab"
                tabindex={activeDocumentId() === tab.id ? 0 : -1}
                aria-selected={activeDocumentId() === tab.id}
                data-document-tab={tab.id}
                data-drag-over={isDragOver() ? "tab" : null}
                data-hover-tab-progress={isHovering() ? "1" : null}
                onClick={() => handleSwitchTab(tab.id)}
                onPointerEnter={(e) => handleTabPointerEnter(e, tab.id)}
                onPointerLeave={(e) => handleTabPointerLeave(e, tab.id)}
                onDragOver={(e) => handleTabDragOver(e, tab.id)}
                onDragLeave={(e) => handleTabDragLeave(e, tab.id)}
                onDrop={(e) => handleTabDrop(e, tab.id)}
                class={clsx(
                  "group relative flex shrink-0 items-center gap-3 border-r border-editor-divider pl-4 pr-3 cursor-pointer",
                  activeDocumentId() === tab.id ? "bg-editor-bg" : "bg-editor-topbar hover:bg-editor-topbar-hover",
                  isDragOver() && "outline outline-2 outline-editor-accent"
                )}
              >
                <span
                  class={clsx(
                    "whitespace-nowrap text-[13px]",
                    activeDocumentId() === tab.id ? "text-editor-accent font-medium" : "text-editor-text-dim",
                  )}
                >
                  {tab.displayName}
                  {tab.isDirty && <span class="ml-1 text-editor-accent">•</span>}
                </span>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  class="flex size-4 items-center justify-center rounded text-editor-text-dim hover:text-editor-text hover:bg-editor-app-hover"
                  aria-label={`Close ${tab.displayName}`}
                >
                  <Icon name="x" class="size-3.5" strokeWidth={1.75} />
                </button>
                <Show when={activeDocumentId() === tab.id}>
                  <span class="absolute inset-x-0 bottom-0 h-[2px] bg-editor-accent" />
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      <button
        onClick={handleNewTab}
        class="flex w-11 shrink-0 items-center justify-center text-editor-icon hover:text-editor-text border-l border-editor-divider h-full"
        aria-label="New document"
      >
        <Icon name="plus" class="size-[18px]" strokeWidth={1.75} />
      </button>

      <div class="flex items-center gap-2 pr-4 pl-2 shrink-0 border-l border-editor-divider h-full">
        <LayoutToggleButton />
        <ExportButton />
        <CloseDockButton />
      </div>
    </div>
  );
}
