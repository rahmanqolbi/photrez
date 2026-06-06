import { For, Show } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { useEditor } from "./EditorContext";
import { WorkspaceManager } from "@/engine/workspace";
import { cancelLayerTransformSession } from "./transformSession";

export function DocumentTabsBar() {
  const { workspace, documents, activeDocumentId, scheduler, layerTransformSession, setLayerTransformSession } = useEditor();

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
    const nextId = `doc-${crypto.randomUUID()}`;
    const name = `Untitled-${workspace.getDocumentCount() + 1}`;
    const session = WorkspaceManager.createBlankDocument(nextId, name, 800, 600);
    workspace.addDocument(session);
    scheduler.requestRender();
  };

  return (
    <div class="flex h-[44px] shrink-0 items-stretch overflow-x-auto border-b border-editor-divider bg-editor-topbar">
      <For each={documents()}>
        {(tab) => {
          return (
            <div
              onClick={() => handleSwitchTab(tab.id)}
              class={clsx(
                "group relative flex shrink-0 items-center gap-3 border-r border-editor-divider pl-4 pr-3 cursor-pointer",
                activeDocumentId() === tab.id ? "bg-editor-bg" : "bg-editor-topbar hover:bg-editor-topbar-hover",
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
      <button
        onClick={handleNewTab}
        class="flex w-11 shrink-0 items-center justify-center text-editor-icon hover:text-editor-text"
        aria-label="New document"
      >
        <Icon name="plus" class="size-[18px]" strokeWidth={1.75} />
      </button>
    </div>
  );
}
