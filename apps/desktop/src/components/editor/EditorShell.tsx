import { createSignal } from "solid-js";
import { AppTitleBar } from "./AppTitleBar";
import { BottomStatusBar } from "./BottomStatusBar";
import { CanvasViewport } from "./CanvasViewport";
import { DocumentTabsBar } from "./DocumentTabsBar";
import { LeftToolRail } from "./LeftToolRail";
import { OptionBar } from "./OptionBar";
import { RightDock } from "./RightDock";
import { useDesktopGuards, useDesktopShortcuts } from "@/lib/desktop";

export function EditorShell() {
  const [rightDockOpen, setRightDockOpen] = createSignal(false);
  const toggleRightDock = () => setRightDockOpen((open) => !open);

  useDesktopGuards();
  useDesktopShortcuts({ onToggleRightDock: toggleRightDock });

  return (
    <div class="photrez-app flex h-dvh min-h-[640px] min-w-[960px] flex-col overflow-hidden bg-editor-bg text-editor-text">
      <AppTitleBar
        isRightDockOpen={rightDockOpen()}
        onToggleRightDock={toggleRightDock}
      />

      <main class="relative flex min-h-0 flex-1 overflow-hidden">
        <LeftToolRail />

        <section class="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DocumentTabsBar />
          <OptionBar />
          <CanvasViewport />
        </section>

        <RightDock
          open={rightDockOpen()}
          onClose={() => setRightDockOpen(false)}
        />
      </main>

      <BottomStatusBar />
    </div>
  );
}
