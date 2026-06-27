import { For, Show } from "solid-js";
import { useEditor } from "./shell/EditorContext";
import { Icon, type IconName } from "./icons";
import { clsx } from "clsx";

export function HistoryPanel() {
  const {
    activeDocumentId,
    historyItems,
    activeHistoryIndex,
    navigateHistory,
  } = useEditor();

  const getActionIcon = (label: string): IconName => {
    const l = label.toLowerCase();
    if (l === "open" || l.includes("new document")) return "image";
    if (l.includes("brush")) return "brush";
    if (l.includes("eraser")) return "eraser";
    if (l.includes("layer")) return "layers";
    if (l.includes("crop")) return "crop";
    if (l.includes("resize")) return "maximize";
    if (l.includes("cut")) return "slice";
    if (l.includes("paste")) return "copy";
    if (l.includes("selection") || l.includes("deselect")) return "rectangle";
    return "history";
  };

  return (
    <div data-history-panel class="flex min-h-0 flex-1 select-none flex-col">
      <Show
        when={activeDocumentId()}
        fallback={
          <div class="flex h-[88px] flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-editor-divider/50 text-center">
            <Icon name="history" class="size-5 text-editor-text-dim opacity-50" strokeWidth={1.5} />
            <span class="text-[12px] text-editor-text-dim">No image open</span>
          </div>
        }
      >
        <div data-history-list class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div class="flex-1 overflow-y-auto">
            <div class="flex flex-col">
              <For each={historyItems()}>
                {(item, index) => {
                  const isActive = () => index() === activeHistoryIndex();
                  const isRedo = () => item.isRedo;

                  return (
                    <button
                      type="button"
                      onClick={() => navigateHistory(index())}
                      aria-current={isActive() ? "step" : undefined}
                      data-history-state={isActive() ? "current" : isRedo() ? "future" : "past"}
                      class={clsx(
                        "group relative flex min-h-8 w-full items-center gap-2 border-b border-editor-divider/70 px-4 py-1.5 text-left text-[11.5px] transition-colors focus:outline-none focus-visible:bg-white/[0.075]",
                        isActive()
                          ? "bg-white/[0.055] text-editor-text"
                          : isRedo()
                          ? "text-editor-text/40 hover:bg-white/[0.02] hover:text-editor-text/65"
                          : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
                      )}
                    >
                      <Icon
                        name={getActionIcon(item.label)}
                        class={clsx(
                          "size-3.5 shrink-0",
                          isActive()
                            ? "text-editor-accent"
                            : isRedo()
                            ? "text-editor-text/30"
                            : "text-editor-text-dim"
                        )}
                        strokeWidth={isActive() ? 2.0 : 1.75}
                      />
                      <span class="truncate font-medium">{item.label}</span>
                    </button>
                  );
                }}
              </For>
              <Show when={historyItems().length === 1}>
                <p class="px-4 py-2 text-[11px] text-editor-text-dim/55">Edits appear here</p>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
