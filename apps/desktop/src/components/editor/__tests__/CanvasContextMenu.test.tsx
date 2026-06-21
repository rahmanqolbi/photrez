import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { WorkspaceManager } from "@/engine/workspace";
import { SelectionOperations } from "@/features/selection/SelectionOperations";
import { EditorProvider, useEditor } from "../EditorContext";
import { CanvasContextMenu } from "../CanvasContextMenu";
import { useEditorCommands } from "../useEditorCommands";

let setTool: (tool: any) => void = () => {};

function Harness() {
  const editor = useEditor();
  setTool = editor.setActiveTool;
  useEditorCommands(() => undefined);
  return (
    <>
      <div id="canvas-container" tabIndex={0} />
      <CanvasContextMenu />
    </>
  );
}

function findMenuButton(label: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
    .find((candidate) => candidate.textContent?.includes(label));
  if (!button) throw new Error(`Menu button not found: ${label}`);
  return button;
}

describe("CanvasContextMenu wiring", () => {
  afterEach(() => {
    SelectionOperations.__resetClipboard();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("routes Deselect through the production editor command handler", async () => {
    const workspace = new WorkspaceManager();
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => (
      <EditorProvider workspace={workspace} renderer={renderer as any} scheduler={scheduler as any}>
        <Harness />
      </EditorProvider>
    ), root);
    const session = WorkspaceManager.createBlankDocument("canvas-menu", "Canvas Menu", 800, 600);
    workspace.addDocument(session);
    session.engine.createSelection(10, 20, 100, 80);

    document.getElementById("canvas-container")!.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      clientX: 40,
      clientY: 50,
    }));
    findMenuButton("Deselect").click();

    expect(session.engine.getSelection()).toBeNull();
    expect(scheduler.requestRender).toHaveBeenCalled();
    dispose();
  });

  it("defers to the existing paint settings menu for Brush and Eraser", () => {
    const workspace = new WorkspaceManager();
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => (
      <EditorProvider
        workspace={workspace}
        renderer={{ uploadImage: vi.fn(), destroyTexture: vi.fn() } as any}
        scheduler={{ requestRender: vi.fn() } as any}
      >
        <Harness />
      </EditorProvider>
    ), root);
    workspace.addDocument(WorkspaceManager.createBlankDocument("canvas-menu", "Canvas Menu", 800, 600));
    setTool("brush");

    document.getElementById("canvas-container")!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    expect(document.querySelector('[data-testid="canvas-context-menu"]')).toBeNull();
    dispose();
  });
});
