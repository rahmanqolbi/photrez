import { createSignal, onCleanup, Show } from "solid-js";
import { AppTitleBar } from "./AppTitleBar";
import { BottomStatusBar } from "./BottomStatusBar";
import { CanvasViewport } from "./CanvasViewport";
import { DocumentTabsBar } from "./DocumentTabsBar";
import { LeftToolRail } from "./LeftToolRail";
import { OptionBar } from "./OptionBar";
import { RightDock } from "./RightDock";
import { useDesktopGuards, useDesktopShortcuts } from "@/lib/desktop";
import { EmptyWorkspace } from "./EmptyWorkspace";
import { ResizeCanvasModal } from "./ResizeCanvasModal";
import { ExportDialog } from "./ExportDialog";

// Core singletons import
import { WorkspaceManager } from "@/engine/workspace";
import { WebGL2Backend } from "@/renderer/webgl2";
import { RenderScheduler } from "@/renderer/scheduler";
import { EditorProvider, useEditor } from "./EditorContext";
import { ViewportCamera } from "../../viewport/viewportCamera";

function EditorLayout(props: {
  rightDockOpen: boolean;
  toggleRightDock: () => void;
  setRightDockOpen: (val: boolean) => void;
}) {
  const { documents, activeDocumentId } = useEditor();
  const hasDocument = () => documents().length > 0;
  const hasActiveDocument = () => activeDocumentId() !== null;

  return (
    <div class="photrez-app flex h-dvh min-h-[640px] min-w-[960px] flex-col overflow-hidden bg-editor-bg text-editor-text">
      <AppTitleBar
        isRightDockOpen={props.rightDockOpen}
        onToggleRightDock={props.toggleRightDock}
      />

      <main class="relative flex min-h-0 flex-1 overflow-hidden">
        <LeftToolRail disabled={!hasActiveDocument()} />

        <section class="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Show when={hasDocument()}>
            <DocumentTabsBar />
          </Show>
          <Show when={hasActiveDocument()}>
            <OptionBar />
          </Show>
          <Show when={hasActiveDocument()} fallback={<EmptyWorkspace />}>
            <CanvasViewport />
          </Show>
        </section>

        <RightDock
          open={props.rightDockOpen}
          onClose={() => props.setRightDockOpen(false)}
        />
      </main>

      <BottomStatusBar />
      <ResizeCanvasModal />
      <ExportDialog />
    </div>
  );
}

export function EditorShell() {
  const [rightDockOpen, setRightDockOpen] = createSignal(true); // Default open for premium dual panel layout
  const toggleRightDock = () => setRightDockOpen((open) => !open);

  useDesktopGuards();
  useDesktopShortcuts({ onToggleRightDock: toggleRightDock });

  // ─── Singletons Initialization ───
  const workspace = new WorkspaceManager();
  const camera = new ViewportCamera();
  const renderer = new WebGL2Backend();
  const scheduler = new RenderScheduler(() => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    if (camera.isModernCropActive) {
      renderer.render(engine.getRenderState());
    } else {
      const matrix = camera.getViewProjectionMatrix();
      renderer.render(engine.getRenderState(), matrix);
    }
  });

  onCleanup(() => {
    scheduler.dispose();
  });

  return (
    <EditorProvider workspace={workspace} renderer={renderer} scheduler={scheduler} camera={camera}>
      <EditorLayout
        rightDockOpen={rightDockOpen()}
        toggleRightDock={toggleRightDock}
        setRightDockOpen={setRightDockOpen}
      />
    </EditorProvider>
  );
}
