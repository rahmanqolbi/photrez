import { onCleanup, onMount } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { isEditableTarget } from "@/lib/dom";
import { isTauriRuntime, runTauriWindowAction } from "@/lib/desktop";
import { WorkspaceManager } from "@/engine/workspace";
import { MAX_OPEN_DOCUMENTS } from "@/engine/types";
import { SelectionOperations } from "@/features/selection/SelectionOperations";
import { useEditor } from "./shell/EditorContext";
import { useLayerActions } from "./layers/useLayerActions";
import { cancelLayerTransformSession } from "./transformSession";
import { useDialog } from "./dialogs/DialogProvider";
import { showToast } from "./Toast";
import { showSaveDialog, writeFileBytes } from "@/tauri/native";
import { serializeAndSaveProject } from "./projectSerialize";
import { addRecentFile } from "@/lib/recentFiles";
import { easeOutCubic } from "@/viewport/easing";
import { encodeComposite, type ExportFormat } from "./exportDocument";

export const NATIVE_MENU_EVENT = "photrez://native-menu";
export const EDITOR_COMMAND_EVENT = "photrez://editor-command";

export type EditorCommand =
  | "file.new"
  | "file.open"
  | "file.save"
  | "file.save-as"
  | "file.export"
  | "file.print"
  | "edit.undo"
  | "edit.redo"
  | "edit.cut"
  | "edit.copy"
  | "edit.paste"
  | "edit.select-all"
  | "edit.deselect"
  | "edit.invert-selection"
  | "image.resize"
  | "layer.new"
  | "layer.duplicate"
  | "layer.delete"
  | "layer.merge-down"
  | "layer.flatten"
  | "layer.stamp-visible"
  | "view.zoom-in"
  | "view.zoom-out"
  | "view.actual-size"
  | "view.fit-canvas"
  | "view.toggle-side-panels"
  | "view.toggle-right-dock-layout"
  | "window.minimize"
  | "window.toggle-maximize"
  | "window.close"
  | "help.about";

const EDITOR_COMMANDS: ReadonlySet<string> = new Set<EditorCommand>([
  "file.new",
  "file.open",
  "file.save",
  "file.save-as",
  "file.export",
  "file.print",
  "edit.undo",
  "edit.redo",
  "edit.cut",
  "edit.copy",
  "edit.paste",
  "edit.select-all",
  "edit.deselect",
  "edit.invert-selection",
  "image.resize",
  "layer.new",
  "layer.duplicate",
  "layer.delete",
  "layer.merge-down",
  "layer.flatten",
  "layer.stamp-visible",
  "view.zoom-in",
  "view.zoom-out",
  "view.actual-size",
  "view.fit-canvas",
  "view.toggle-side-panels",
  "view.toggle-right-dock-layout",
  "window.minimize",
  "window.toggle-maximize",
  "window.close",
  "help.about",
]);

export function isEditorCommand(value: string): value is EditorCommand {
  return EDITOR_COMMANDS.has(value);
}

export function dispatchEditorCommand(command: EditorCommand): void {
  window.dispatchEvent(new CustomEvent<EditorCommand>(EDITOR_COMMAND_EVENT, { detail: command }));
}

export function useEditorCommands(onToggleSidePanels: () => void) {
  const editor = useEditor();
  const dialog = useDialog();
  const layerActions = useLayerActions();

  const requiresDocument = (command: EditorCommand) => (
    command === "file.save"
    || command === "file.save-as"
    || command === "file.export"
    || command === "file.print"
    || command === "edit.undo"
    || command === "edit.redo"
    || command.startsWith("edit.")
    || command === "image.resize"
    || command.startsWith("layer.")
    || command === "view.zoom-in"
    || command === "view.zoom-out"
    || command === "view.actual-size"
    || command === "view.fit-canvas"
  );

  const isEnabled = (command: EditorCommand): boolean => {
    if (command === "file.new") return !editor.workspace.isFull();
    if (requiresDocument(command) && !editor.activeDocumentId()) return false;
    if (command === "edit.undo") {
      return editor.layerTransformSession() !== null
        || (editor.activeTool() === "crop" && editor.canCropUndo())
        || editor.workspace.getActiveHistory()?.canUndo() === true;
    }
    if (command === "edit.redo") {
      return (editor.activeTool() === "crop" && editor.canCropRedo())
        || editor.workspace.getActiveHistory()?.canRedo() === true;
    }
    const engine = editor.workspace.getActiveEngine();
    if (command === "edit.cut" || command === "edit.copy") {
      const activeId = engine?.getActiveLayerId();
      return Boolean(engine?.getSelection() && activeId && engine.getLayerImageBitmap(activeId));
    }
    if (command === "edit.paste") return SelectionOperations.hasClipboard();
    if (command === "edit.deselect") return engine?.getSelection() !== null;
    if (command === "layer.new") return Boolean(engine);
    if (command === "layer.duplicate") return Boolean(engine?.getActiveLayerId());
    if (command === "layer.delete") {
      return Boolean(engine && engine.getActiveLayerId() && engine.getLayers().length > 1);
    }
    if (command === "layer.merge-down") {
      if (!engine) return false;
      const activeId = engine.getActiveLayerId();
      const activeIndex = engine.getLayers().findIndex((layer) => layer.id === activeId);
      return activeIndex >= 0 && activeIndex < engine.getLayers().length - 1;
    }
    if (command === "layer.flatten") return (engine?.getLayers().length ?? 0) > 1;
    return true;
  };

  const uploadActiveLayerBitmap = () => {
    const engine = editor.workspace.getActiveEngine();
    const activeId = engine?.getActiveLayerId();
    if (!engine || !activeId) return;
    const layer = engine.getLayer(activeId);
    if (layer?.imageBitmap) editor.renderer.uploadImage(layer.id, layer.imageBitmap);
  };

  const cancelActiveTransformSession = (): boolean => {
    const engine = editor.workspace.getActiveEngine();
    if (!cancelLayerTransformSession(editor.layerTransformSession(), engine)) return false;
    editor.setLayerTransformSession(null);
    editor.scheduler.requestRender();
    return true;
  };

  const restoreHistorySnapshot = (direction: "undo" | "redo") => {
    if (cancelActiveTransformSession()) {
      return;
    }

    if (editor.activeTool() === "crop") {
      const state = direction === "undo"
        ? (editor.canCropUndo() ? editor.undoLastCrop() : null)
        : (editor.canCropRedo() ? editor.redoCrop() : null);
      if (state) {
        editor.setCropRect(state.rect);
        editor.setCropRotation(state.rotation);
        return;
      }
    }

    try {
      const engine = editor.workspace.getActiveEngine();
      const history = editor.workspace.getActiveHistory();
      if (!engine || !history) {
        return;
      }

      const canRestore = direction === "undo" ? history.canUndo() : history.canRedo();
      if (!canRestore) {
        return;
      }
      const snapshot = direction === "undo"
        ? history.undo(engine.snapshot())
        : history.redo(engine.snapshot());
      if (!snapshot) {
        return;
      }


      engine.restore(snapshot);

      const restoredLayer = engine.getLayers()[0];

      for (const layer of engine.getLayers()) {
        if (layer.imageBitmap) editor.renderer.uploadImage(layer.id, layer.imageBitmap);
      }
      // Notify workspace to trigger UI sync (layers, history panel, adjustments, etc.)
      editor.workspace.notifyVisualChange();
      editor.scheduler.requestRender();
    } catch (error) {
      showToast(`${direction === "undo" ? "Undo" : "Redo"} failed: ${error instanceof Error ? error.message : "unknown error"}`, "error");
    }
  };

  const execute = (command: EditorCommand) => {
    if (!isEnabled(command)) return;

    switch (command) {
      case "file.new": {
        // instead of letting workspace.addDocument throw silently.
        if (editor.workspace.isFull()) {
          showToast(`Workspace full — close a document first (max ${MAX_OPEN_DOCUMENTS})`, "error");
          break;
        }
        const id = `doc-${crypto.randomUUID()}`;
        const name = `Untitled-${editor.workspace.getDocumentCount() + 1}`;
        editor.workspace.addDocument(
          WorkspaceManager.createBlankDocument(id, name, 800, 600),
        );
        editor.scheduler.requestRender();
        break;
      }
      case "file.open":
        void editor.openImage();
        break;
      case "file.save": {
        const session = editor.workspace.getActiveSession();
        if (!session) break;

        // New/unsaved → redirect to Save As
        if (!session.sourcePath) {
          execute("file.save-as");
          break;
        }

        const engine = session.engine;
        const ext = session.sourcePath.split(".").pop()?.toLowerCase();
        const layerCount = engine.getLayers().length;

        // Multi-layer on flat image format → redirect to Save As
        if (layerCount > 1 && ext !== "ptz") {
          execute("file.save-as");
          break;
        }

        // Quick overwrite
        void (async () => {
          try {
            if (ext === "ptz") {
              showToast("Saving project...", "info");
              const wasDirty = session.dirty;
              await serializeAndSaveProject(engine, session.sourcePath!);
              session.dirty = wasDirty && engine.isDirty();
            } else {
              const format: ExportFormat = ext === "jpg" || ext === "jpeg" ? "jpeg"
                : ext === "webp" ? "webp" : "png";
              const bytes = await encodeComposite(engine, format, 92);
              await writeFileBytes(session.sourcePath!, bytes);
              session.dirty = false;
            }
            addRecentFile(session.sourcePath!, session.displayName);
            showToast("Saved", "info");
            editor.scheduler.requestRender();
          } catch (err) {
            showToast(`Failed to save: ${err}`, "error");
          }
        })();
        break;
      }
      case "file.save-as": {
        const session = editor.workspace.getActiveSession();
        if (!session) break;
        void (async () => {
          try {
            const defaultName = session.displayName.endsWith(".ptz")
              ? session.displayName
              : `${session.displayName.split(".")[0]}.ptz`;
            const path = await showSaveDialog(defaultName);
            if (!path) return;

            const wasDirty = session.dirty;
            await serializeAndSaveProject(session.engine, path);
            session.sourcePath = path;
            session.displayName = path.split(/[/\\]/).pop() || session.displayName;
            // Only clear dirty if engine wasn't modified during the async save
            session.dirty = wasDirty && session.engine.isDirty();
            addRecentFile(path, session.displayName);
            showToast("Project saved successfully", "info");
            editor.scheduler.requestRender();
          } catch (err) {
            showToast(`Failed to save project: ${err}`, "error");
          }
        })();
        break;
      }
      case "file.export":
        if (editor.activeDocumentId()) editor.setShowExportDialog(true);
        break;
      case "file.print":
        if (editor.activeDocumentId()) editor.setShowPrintDialog(true);
        break;
      case "edit.undo":
        restoreHistorySnapshot("undo");
        break;
      case "edit.redo":
        restoreHistorySnapshot("redo");
        break;
      case "edit.cut": {
        const engine = editor.workspace.getActiveEngine();
        const history = editor.workspace.getActiveHistory();
        if (!engine?.getSelection() || !history) break;
        history.commit(engine.snapshot(), "Cut");
        SelectionOperations.cutSelection(engine);
        uploadActiveLayerBitmap();
        editor.scheduler.requestRender();
        break;
      }
      case "edit.copy": {
        const engine = editor.workspace.getActiveEngine();
        if (engine) SelectionOperations.copySelection(engine);
        break;
      }
      case "edit.paste": {
        const engine = editor.workspace.getActiveEngine();
        const history = editor.workspace.getActiveHistory();
        if (!engine || !history) break;
        history.commit(engine.snapshot(), "Paste");
        SelectionOperations.pasteSelection(engine);
        uploadActiveLayerBitmap();
        editor.scheduler.requestRender();
        break;
      }
      case "edit.select-all":
        editor.workspace.getActiveEngine()?.selectAll();
        editor.scheduler.requestRender();
        break;
      case "edit.deselect":
        editor.workspace.getActiveEngine()?.clearSelection();
        editor.setSelectionEditMode(false);
        editor.scheduler.requestRender();
        break;
      case "edit.invert-selection":
        editor.workspace.getActiveEngine()?.invertSelection();
        editor.setSelectionEditMode(false);
        editor.scheduler.requestRender();
        break;
      case "image.resize":
        if (editor.activeDocumentId()) editor.setShowResizeDialog(true);
        break;
      case "layer.new":
        layerActions.handleAddLayer();
        break;
      case "layer.duplicate":
        layerActions.handleDuplicateActiveLayer();
        break;
      case "layer.delete":
        layerActions.handleDeleteActiveLayer();
        break;
      case "layer.merge-down":
        layerActions.handleMergeActiveLayerDown();
        break;
      case "layer.flatten":
        layerActions.handleFlattenAllLayers();
        break;
      case "layer.stamp-visible":
        layerActions.handleStampVisible();
        break;
      case "view.zoom-in":
      case "view.zoom-out":
      case "view.actual-size": {
        const viewport = editor.camera.getViewportSize();
        const currentZoom = editor.camera.getState().zoom;
        const factor = command === "view.zoom-in"
          ? 1.25
          : command === "view.zoom-out"
            ? 0.8
            : 1 / currentZoom;
        // Animated zoom for keyboard shortcuts (150ms - snappy and smooth)
        editor.camera.animateZoomToPoint(
          factor,
          viewport.width / 2,
          viewport.height / 2,
          150,
          easeOutCubic
        );
        // Note: syncFromCamera() and scheduler.requestRender() are handled by camera animation callbacks
        break;
      }
      case "view.fit-canvas": {
        const engine = editor.workspace.getActiveEngine();
        if (!engine) break;
        engine.fitToScreen(editor.viewportWidth(), editor.viewportHeight());
        editor.syncViewport();
        editor.scheduler.requestRender();
        break;
      }
      case "view.toggle-side-panels":
        onToggleSidePanels();
        break;
      case "view.toggle-right-dock-layout":
        editor.setRightDockLayout(editor.rightDockLayout() === "side-by-side" ? "stacked" : "side-by-side");
        break;
      case "window.minimize":
        void runTauriWindowAction("minimize");
        break;
      case "window.toggle-maximize":
        void runTauriWindowAction("toggleMaximize");
        break;
      case "window.close":
        void runTauriWindowAction("close");
        break;
      case "help.about":
        void dialog.alert({
          title: "About Photrez",
          message: "Photrez 0.2.0\nA lightweight image editor for Windows.",
          confirmLabel: "Close",
        });
        break;
    }
  };

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[aria-modal="true"]')) return;

      if (
        event.defaultPrevented
        || isEditableTarget(event.target)
        || isEditableTarget(document.activeElement)
      ) return;

      const commandKey = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      let command: EditorCommand | null = null;

      if (commandKey && event.shiftKey && key === "z") command = "edit.redo";
      else if (commandKey && key === "z") command = "edit.undo";
      else if (commandKey && key === "y") command = "edit.redo";
      else if (commandKey && key === "n") command = "file.new";
      else if (commandKey && key === "o") command = "file.open";
      else if (commandKey && event.shiftKey && key === "s") command = "file.save-as";
      else if (commandKey && key === "s") command = "file.save";
      else if (commandKey && event.altKey && key === "e") command = "file.export";
      else if (commandKey && key === "p") command = "file.print";
      else if (commandKey && key === "1") command = "view.actual-size";
      else if (commandKey && key === "0") command = "view.fit-canvas";
      else if (commandKey && (key === "=" || key === "+")) command = "view.zoom-in";
      else if (commandKey && (key === "-" || key === "_")) command = "view.zoom-out";

      if (command) {
        event.preventDefault();
        execute(command);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const handleDispatchedCommand = (event: Event) => {
      const command = (event as CustomEvent<unknown>).detail;
      if (typeof command === "string" && isEditorCommand(command)) execute(command);
    };
    window.addEventListener(EDITOR_COMMAND_EVENT, handleDispatchedCommand);

    let disposed = false;
    let unlisten: (() => void) | undefined;
    if (isTauriRuntime()) {
      void listen<string>(NATIVE_MENU_EVENT, (event) => {
        if (isEditorCommand(event.payload)) execute(event.payload);
      }).then((disposeListener) => {
        if (disposed) disposeListener();
        else unlisten = disposeListener;
      }).catch((error: unknown) => {
        console.warn("Failed to register native menu listener:", error);
      });
    }

    onCleanup(() => {
      disposed = true;
      unlisten?.();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(EDITOR_COMMAND_EVENT, handleDispatchedCommand);
    });
  });

  return {
    execute,
    isEnabled,
    undo: () => execute("edit.undo"),
    redo: () => execute("edit.redo"),
  };
}
