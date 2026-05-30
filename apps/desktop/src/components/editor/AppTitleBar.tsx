import { For } from "solid-js";
import { Icon } from "./icons";
import { APP_NAME, MENU_ITEMS, DOCUMENT_TABS } from "./editorData";
import { runTauriWindowAction } from "@/lib/desktop";

type AppTitleBarProps = {
  isRightDockOpen: boolean;
  onToggleRightDock: () => void;
};

function BrandArea() {
  return (
    <div
      class="flex h-full shrink-0 items-center pl-3 pr-2"
      data-tauri-drag-region
      onDblClick={() => runTauriWindowAction("toggleMaximize")}
    >
      <AppIcon />
    </div>
  );
}

function AppIcon() {
  return (
    <div
      class="flex size-[30px] items-center justify-center rounded-[6px] bg-editor-brand"
      data-tauri-drag-region
    >
      <span
        class="text-[13px] font-bold lowercase tracking-tight text-white"
        data-tauri-drag-region
      >
        pz
      </span>
    </div>
  );
}

function MainMenu() {
  return (
    <nav class="hidden items-center gap-0.5 md:flex">
      <For each={MENU_ITEMS}>
        {(item) => (
          <button class="flex h-[26px] items-center justify-center rounded-[4px] px-2.5 text-[12.5px] tracking-wide text-editor-text/85 transition-colors hover:bg-white/[0.045] hover:text-editor-text">
            {item}
          </button>
        )}
      </For>
    </nav>
  );
}

function WindowControls(props: AppTitleBarProps) {
  return (
    <div class="flex shrink-0 items-center">
      <div class="mr-3 flex items-center gap-0.5 text-editor-icon">
        <button
          class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text"
          aria-label="Undo"
        >
          <Icon name="undo" class="size-[16px]" strokeWidth={1.75} />
        </button>
        <button
          class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text"
          aria-label="Redo"
        >
          <Icon name="redo" class="size-[16px]" strokeWidth={1.75} />
        </button>
        <div class="mx-1 h-3.5 w-px bg-editor-divider" />
        <button
          class="flex size-7 items-center justify-center rounded-[4px] hover:bg-white/[0.045] hover:text-editor-text xl:hidden"
          aria-label={
            props.isRightDockOpen ? "Hide side panels" : "Show side panels"
          }
          title="Toggle side panels (Ctrl+Shift+P)"
          onClick={props.onToggleRightDock}
        >
          <Icon
            name={
              props.isRightDockOpen ? "panel-right-close" : "panel-right-open"
            }
            class="size-[16px]"
            strokeWidth={1.75}
          />
        </button>
      </div>

      <div class="flex items-center pr-1 text-editor-icon">
        <button
          class="flex h-[46px] w-11 items-center justify-center hover:bg-white/[0.055] hover:text-editor-text"
          aria-label="Minimize window"
          onClick={() => runTauriWindowAction("minimize")}
        >
          <Icon name="minus" class="size-[15px]" strokeWidth={1.75} />
        </button>
        <button
          class="flex h-[46px] w-11 items-center justify-center hover:bg-white/[0.055] hover:text-editor-text"
          aria-label="Maximize window"
          onClick={() => runTauriWindowAction("toggleMaximize")}
        >
          <Icon name="square" class="size-[12px]" strokeWidth={1.75} />
        </button>
        <button
          class="flex h-[46px] w-11 items-center justify-center hover:bg-red-500/85 hover:text-white"
          aria-label="Close window"
          onClick={() => runTauriWindowAction("close")}
        >
          <Icon name="x" class="size-[16px]" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export function AppTitleBar(props: AppTitleBarProps) {
  const activeDoc = () => DOCUMENT_TABS.find((t) => t.active)?.label || "Untitled";

  return (
    <header class="relative flex h-[46px] shrink-0 items-center border-b border-editor-divider bg-editor-topbar">
      <div class="flex min-w-0 items-center gap-2 self-stretch">
        <BrandArea />
        <MainMenu />
      </div>

      <div
        class="flex min-w-4 flex-1 items-center justify-center self-stretch"
        data-tauri-drag-region
        onDblClick={() => runTauriWindowAction("toggleMaximize")}
      >
        <div class="pointer-events-none flex items-center gap-1.5 opacity-90">
          <span class="text-[12px] font-medium tracking-wide text-editor-text">
            {activeDoc()}
          </span>
          <span class="text-[12px] text-editor-text-dim">—</span>
          <span class="text-[12px] tracking-wide text-editor-text-dim">
            {APP_NAME}
          </span>
        </div>
      </div>

      <WindowControls {...props} />
    </header>
  );
}
