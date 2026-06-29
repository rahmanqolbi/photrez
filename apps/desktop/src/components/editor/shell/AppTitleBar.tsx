import { Icon } from "../icons";
import { runTauriWindowAction } from "@/lib/desktop";
import { useEditor } from "./EditorContext";
import { useEditorCommands } from "../useEditorCommands";
import { AppMenuBar } from "./AppMenuBar";

type AppTitleBarProps = {
  isRightDockOpen: boolean;
  onToggleRightDock: () => void;
};

export function AppTitleBar(props: AppTitleBarProps) {
  const { activeDocumentId, documents } = useEditor();
  const commands = useEditorCommands(props.onToggleRightDock);

  const activeDocName = () => {
    const id = activeDocumentId();
    return documents().find((document) => document.id === id)?.displayName || "Untitled";
  };

  return (
    <header class="relative flex h-[46px] shrink-0 items-center border-b border-editor-divider bg-editor-topbar select-none">
      <div class="flex min-w-0 items-center gap-2 self-stretch">
        <div
          class="flex h-full shrink-0 items-center pl-3 pr-2"
          data-tauri-drag-region
          onDblClick={() => runTauriWindowAction("toggleMaximize")}
        >
          <svg viewBox="0 0 512 512" class="size-[30px] shrink-0" aria-hidden="true">
            <defs>
              <linearGradient id="pageGradientTitle" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFB31A" />
                <stop offset="100%" stop-color="#E15A17" />
              </linearGradient>
            </defs>
            <rect x="16" y="16" width="480" height="480" rx="28" fill="#1A1A1A" />
            <g transform="translate(-20, 15)">
              <path d="M 240 50 L 460 50 L 390 310 L 253 310 L 219 440 L 136 440 Z" fill="url(#pageGradientTitle)" />
              <circle cx="322" cy="175" r="30" fill="#FFE57F" />
              <polygon points="270,310 337,127 343,127 330,310" fill="#1A1A1A" />
            </g>
          </svg>
        </div>

        <AppMenuBar
          execute={commands.execute}
          isEnabled={commands.isEnabled}
          isRightDockOpen={props.isRightDockOpen}
        />
      </div>

      <div
        class="flex min-w-4 flex-1 items-center justify-center self-stretch"
        data-tauri-drag-region
        onDblClick={() => runTauriWindowAction("toggleMaximize")}
      >
        <div class="pointer-events-none flex items-center gap-1.5 opacity-90">
          <span class="text-[12px] font-medium tracking-wide text-editor-text">
            {activeDocName()}
          </span>
          <span class="text-[12px] text-editor-text-dim">—</span>
          <span class="text-[12px] tracking-wide text-editor-text-dim">photrez</span>
        </div>
      </div>

      <div class="flex shrink-0 items-center">
        <div class="mr-3 flex items-center gap-0.5 text-editor-icon">
          <button
            onClick={commands.undo}
            class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text"
            aria-label="Undo"
          >
            <Icon name="undo" class="size-[16px]" strokeWidth={1.75} />
          </button>
          <button
            onClick={commands.redo}
            class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text"
            aria-label="Redo"
          >
            <Icon name="redo" class="size-[16px]" strokeWidth={1.75} />
          </button>
          <div class="mx-1 h-3.5 w-px bg-editor-divider" />
          <button
            class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text lg:hidden"
            aria-label={props.isRightDockOpen ? "Hide side panels" : "Show side panels"}
            onClick={props.onToggleRightDock}
          >
            <Icon
              name={props.isRightDockOpen ? "panel-right-close" : "panel-right-open"}
              class="size-[16px]"
              strokeWidth={1.75}
            />
          </button>
        </div>

        <div class="flex items-center pr-1 text-editor-icon">
          <button
            class="flex h-[46px] w-11 items-center justify-center hover:bg-white/[0.055] hover:text-editor-text"
            onClick={() => runTauriWindowAction("minimize")}
            aria-label="Minimize window"
          >
            <Icon name="minus" class="size-[15px]" strokeWidth={1.75} />
          </button>
          <button
            class="flex h-[46px] w-11 items-center justify-center hover:bg-white/[0.055] hover:text-editor-text"
            onClick={() => runTauriWindowAction("toggleMaximize")}
            aria-label="Toggle maximize window"
          >
            <Icon name="square" class="size-[12px]" strokeWidth={1.75} />
          </button>
          <button
            class="flex h-[46px] w-11 items-center justify-center hover:bg-red-500/85 hover:text-white"
            onClick={() => runTauriWindowAction("close")}
            aria-label="Close window"
          >
            <Icon name="x" class="size-[16px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
