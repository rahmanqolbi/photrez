import { createSignal, lazy, onCleanup, onMount, Show, Suspense } from "solid-js";
import { AppTitleBar } from "./AppTitleBar";
import { BottomStatusBar } from "./BottomStatusBar";
import { CanvasViewport } from "../canvas/CanvasViewport";
import { DocumentTabsBar } from "./DocumentTabsBar";
import { LeftToolRail } from "./LeftToolRail";
import { OptionBar } from "./OptionBar";
import { RightDock } from "./RightDock";
import { useDesktopGuards, useDesktopShortcuts } from "@/lib/desktop";
import { EmptyWorkspace } from "./EmptyWorkspace";

const ResizeCanvasModal = lazy(() => import("../dialogs/ResizeCanvasModal").then(m => ({ default: m.ResizeCanvasModal })));
const ExportDialog = lazy(() => import("../dialogs/ExportDialog").then(m => ({ default: m.ExportDialog })));
const PrintDialog = lazy(() => import("../dialogs/PrintDialog").then(m => ({ default: m.PrintDialog })));
import { ToastHost } from "../Toast";
import { LoadingOverlay } from "../LoadingOverlay";
import { GlobalDragDropHost } from "../GlobalDragDropHost";
import { DragGlobalGuard } from "../DragController";

// Core singletons import
import { WorkspaceManager } from "@/engine/workspace";
import { WebGL2Backend } from "@/renderer/webgl2";
import { RenderScheduler } from "@/renderer/scheduler";
import { EditorProvider, useEditor, useGPUCameraForModernCrop } from "./EditorContext";
import { ViewportCamera } from "../../../viewport/viewportCamera";

function EditorLayout(props: {
  rightDockOpen: boolean;
  toggleRightDock: () => void;
  setRightDockOpen: (val: boolean) => void;
}) {
  const { documents, activeDocumentId, chromeVisible } = useEditor();
  const hasDocument = () => documents().length > 0;
  const hasActiveDocument = () => activeDocumentId() !== null;

  return (
    <div class="photrez-app flex h-dvh min-h-[640px] min-w-[960px] flex-col overflow-hidden bg-editor-bg text-editor-text">
      <AppTitleBar
        isRightDockOpen={props.rightDockOpen}
        onToggleRightDock={props.toggleRightDock}
      />

      <main class="relative flex min-h-0 flex-1 overflow-hidden">
        <Show when={chromeVisible()}>
          <LeftToolRail disabled={!hasActiveDocument()} />
        </Show>

        <div class="flex flex-1 min-w-0 overflow-hidden">
          <section class="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Show when={hasDocument()}>
              <DocumentTabsBar />
            </Show>
            <Show when={chromeVisible() && hasActiveDocument()}>
              <OptionBar />
            </Show>
            <Show when={hasActiveDocument()} fallback={<EmptyWorkspace />}>
              <CanvasViewport />
            </Show>
          </section>

          <Show when={chromeVisible()}>
            <RightDock
              open={props.rightDockOpen}
              onClose={() => props.setRightDockOpen(false)}
            />
          </Show>
        </div>
      </main>

      <Show when={chromeVisible()}>
        <BottomStatusBar />
      </Show>
      <Suspense fallback={null}><ResizeCanvasModal /></Suspense>
      <Suspense fallback={null}><ExportDialog /></Suspense>
      <Suspense fallback={null}><PrintDialog /></Suspense>
      <LoadingOverlay />
      <ToastHost />
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
  // Render scheduler uses the shared useGPUCameraForModernCrop signal
  // (defined at module level in EditorContext) so it stays in sync
  // with the context flag. When the flag is true, the new GPU-camera
  // path always passes a VP matrix (image transform is in the matrix).
  // When false, falls back to the legacy CSS-path conditional.
  const scheduler = new RenderScheduler(() => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    if (useGPUCameraForModernCrop()) {
      const matrix = camera.getViewProjectionMatrix();
      renderer.render(engine.getRenderState(), matrix);
    } else if (camera.isModernCropActive) {
      renderer.render(engine.getRenderState());
    } else {
      const matrix = camera.getViewProjectionMatrix();
      renderer.render(engine.getRenderState(), matrix);
    }
  });

  onMount(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = workspace.getTabSummaries().some((t) => t.isDirty);
      if (hasDirty) {
        e.preventDefault();
        // Standard beforeunload pattern — both preventDefault and returnValue
        // are needed across browsers and WebView2. Without returnValue, some
        // WebView2 versions ignore preventDefault alone.
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    onCleanup(() => window.removeEventListener("beforeunload", handleBeforeUnload));
  });

  onCleanup(() => {
    scheduler.dispose();
  });

  return (
    <EditorProvider
      workspace={workspace}
      renderer={renderer}
      scheduler={scheduler}
      camera={camera}
      rightDockOpen={rightDockOpen}
      setRightDockOpen={setRightDockOpen}
    >
      <GlobalDragDropHost />
      <DragGlobalGuard />
      <EditorLayout
        rightDockOpen={rightDockOpen()}
        toggleRightDock={toggleRightDock}
        setRightDockOpen={setRightDockOpen}
      />
    </EditorProvider>
  );
}
