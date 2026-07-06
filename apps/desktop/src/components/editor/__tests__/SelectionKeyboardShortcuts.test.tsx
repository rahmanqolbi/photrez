import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../shell/EditorContext";
import { useCanvasKeyboard } from "../canvas/useCanvasKeyboard";
import { clearRegistry } from "../keyboardRegistry";
import { WorkspaceManager } from "@/engine/workspace";
import { SelectionOperations } from "@/features/selection/SelectionOperations";
import type { ToolType } from "@/viewport/input-handler";

function SelectionKeyboardHarness(props: {
  captureEditor: (editor: ReturnType<typeof useEditor>) => void;
  activeTool: ToolType;
}) {
  const editor = useEditor();
  props.captureEditor(editor);
  useCanvasKeyboard({
    isSpacePressed: () => false,
    setIsSpacePressed: vi.fn(),
    isAltPressed: () => false,
    setIsAltPressed: vi.fn(),
    isPanning: () => false,
    setIsPanning: vi.fn(),
    stopMomentum: vi.fn(),
    fitToScreenAndRender: vi.fn(),
    syncViewport: vi.fn(),
    getCanvasContainerRef: () => undefined,
  });

  return null;
}

function fireKey(target: EventTarget, init: KeyboardEventInit) {
  const ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
}

function setupHarness() {
  const session = WorkspaceManager.createBlankDocument("sel-kbd", "Sel Kbd", 400, 300);
  const ws = new WorkspaceManager();
  const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
  const scheduler = { requestRender: vi.fn() };
  const container = document.createElement("div");
  document.body.appendChild(container);

  let editorRef: any = null;

  const dispose = render(
    () => (
      <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
        <SelectionKeyboardHarness
          captureEditor={(e) => (editorRef = e)}
          activeTool={"selection"}
        />
      </EditorProvider>
    ),
    container,
  );

  ws.addDocument(session);
  const engine = ws.getActiveEngine()!;

  return {
    ws,
    engine,
    session,
    editorRef: editorRef as any,
    dispose: () => {
      dispose();
      container.parentNode?.removeChild(container);
    },
  };
}

describe("selection tool keyboard shortcuts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearRegistry();
  });

  it("Ctrl+D in selection tool calls clearSelection (regression: brace nesting bug)", () => {
    const { engine, editorRef, dispose } = setupHarness();
    engine.createSelection(10, 20, 100, 200);
    editorRef.setActiveTool("selection");
    const clearSpy = vi.spyOn(engine, "clearSelection");

    fireKey(window, { key: "d", ctrlKey: true });

    expect(clearSpy).toHaveBeenCalled();
    dispose();
  });

  it("Ctrl+D in selection tool does NOT clear selection when tool is 'move' (guard)", () => {
    const session = WorkspaceManager.createBlankDocument("sel-kbd-2", "Sel Kbd 2", 400, 300);
    const ws = new WorkspaceManager();
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const container = document.createElement("div");
    document.body.appendChild(container);

    let editorRef: any = null;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <SelectionKeyboardHarness
            captureEditor={(e) => (editorRef = e)}
            activeTool={"move"}
          />
        </EditorProvider>
      ),
      container,
    );

    ws.addDocument(session);
    const engine = ws.getActiveEngine()!;
    engine.createSelection(10, 20, 100, 200);
    editorRef.setActiveTool("move");
    const clearSpy = vi.spyOn(engine, "clearSelection");

    fireKey(window, { key: "d", ctrlKey: true });

    expect(clearSpy).not.toHaveBeenCalled();

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("Escape in selection tool clears selection", () => {
    const { engine, editorRef, dispose } = setupHarness();
    engine.createSelection(10, 20, 100, 200);
    editorRef.setActiveTool("selection");
    const clearSpy = vi.spyOn(engine, "clearSelection");

    fireKey(window, { key: "Escape" });

    expect(clearSpy).toHaveBeenCalled();
    dispose();
  });

  it("Ctrl+X in selection tool calls SelectionOperations.cutSelection (regression: cut not wired)", () => {
    const { engine, editorRef, dispose } = setupHarness();
    engine.createSelection(10, 20, 50, 50);
    editorRef.setActiveTool("selection");
    const cutSpy = vi.spyOn(SelectionOperations, "cutSelection");

    fireKey(window, { key: "x", ctrlKey: true });

    expect(cutSpy).toHaveBeenCalled();
    expect(cutSpy.mock.calls[0][0]).toBe(engine);
    dispose();
  });

  it("Ctrl+C in selection tool calls SelectionOperations.copySelection (regression: copy not wired)", () => {
    const { engine, editorRef, dispose } = setupHarness();
    engine.createSelection(10, 20, 50, 50);
    editorRef.setActiveTool("selection");
    const copySpy = vi.spyOn(SelectionOperations, "copySelection");

    fireKey(window, { key: "c", ctrlKey: true });

    expect(copySpy).toHaveBeenCalled();
    expect(copySpy.mock.calls[0][0]).toBe(engine);
    dispose();
  });

  it("Ctrl+V in selection tool calls SelectionOperations.pasteSelection (regression: paste not wired)", () => {
    const { engine, editorRef, dispose } = setupHarness();
    editorRef.setActiveTool("selection");
    const pasteSpy = vi.spyOn(SelectionOperations, "pasteSelection");

    fireKey(window, { key: "v", ctrlKey: true });

    expect(pasteSpy).toHaveBeenCalled();
    expect(pasteSpy.mock.calls[0][0]).toBe(engine);
    dispose();
  });

  it("Delete in selection tool calls SelectionOperations.deleteSelection (regression: was only clearing selection state)", () => {
    const { engine, editorRef, dispose } = setupHarness();
    engine.createSelection(10, 20, 50, 50);
    editorRef.setActiveTool("selection");
    const delSpy = vi.spyOn(SelectionOperations, "deleteSelection");

    fireKey(window, { key: "Delete" });

    expect(delSpy).toHaveBeenCalled();
    expect(delSpy.mock.calls[0][0]).toBe(engine);
    dispose();
  });
});
