import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { DialogProvider } from "../../dialogs/DialogProvider";
import { DragControllerProvider, useDragController, type DragController } from "../../DragController";
import { EmptyWorkspace } from "../EmptyWorkspace";
import { WorkspaceManager } from "@/engine/workspace";

function mount(workspace: WorkspaceManager) {
  const renderer = {
    uploadImage: vi.fn(),
    destroyTexture: vi.fn(),
    resize: vi.fn(),
    resizeToViewport: vi.fn(),
  };
  const scheduler = { requestRender: vi.fn() };
  let dc: DragController | null = null;
  const Probe = () => {
    dc = useDragController();
    return <EmptyWorkspace />;
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const dispose = render(
    () => (
      <EditorProvider workspace={workspace} renderer={renderer as any} scheduler={scheduler as any}>
        <DialogProvider>
          <DragControllerProvider>
            <Probe />
          </DragControllerProvider>
        </DialogProvider>
      </EditorProvider>
    ),
    container,
  );
  return { container, getDc: () => dc!, dispose, scheduler };
}

describe("EmptyWorkspace layer drop → new document", () => {
  let active: { dispose: () => void } | null = null;
  afterEach(() => {
    active?.dispose();
    active = null;
  });

  it("dropping a layer onto the empty workspace seeds a new document from that layer", () => {
    const ws = new WorkspaceManager();
    const s = WorkspaceManager.createBlankDocument("docA", "A", 800, 600);
    ws.addDocument(s);
    const engine = ws.getEngine("docA")!;
    const src = engine.addLayer("Logo");

    const { container, getDc, dispose } = mount(ws);
    active = { dispose };

    // Simulate the real global drag state: a layer drag is in flight.
    getDc().beginLayerDrag(
      { version: 1, sourceDocId: "docA", layerId: src.id, sourceName: "Logo", isAltPressed: false },
      null,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    // Fire the drop from the time the global host (EmptyWorkspace) is mounted.
    root.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));

    // One source doc + one newly created doc.
    expect(ws.getDocumentCount()).toBe(2);
    const newDoc = ws.getTabSummaries().find((t) => t.id !== "docA")!;
    expect(newDoc).toBeTruthy();
    const newEngine = ws.getEngine(newDoc.id)!;
    expect(newEngine.getLayers().some((l) => l.name === "Logo")).toBe(true);
    // Default (copy) leaves the source layer in place.
    expect(ws.getEngine("docA")!.getLayers().some((l) => l.name === "Logo")).toBe(true);
    // Drag state cleared after drop.
    expect(getDc().state().dragKind).toBeNull();
  });
});
