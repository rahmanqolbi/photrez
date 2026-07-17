import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../shell/EditorContext";
import { PropertiesPanel } from "../PropertiesPanel";
import { WorkspaceManager } from "@/engine/workspace";

function renderWithSelectedLayer(workspace: WorkspaceManager, layerId: string) {
  const renderer = {
    uploadImage: vi.fn(),
    destroyTexture: vi.fn(),
    resize: vi.fn(),
    resizeToViewport: vi.fn(),
  };
  const scheduler = { requestRender: vi.fn() };
  const container = document.createElement("div");
  document.body.appendChild(container);

  const dispose = render(
    () => (
      <EditorProvider workspace={workspace} renderer={renderer as any} scheduler={scheduler as any}>
        <SelectedLayerHarness layerId={layerId} />
      </EditorProvider>
    ),
    container,
  );

  return { container, dispose, renderer, scheduler };
}

function SelectedLayerHarness(props: { layerId: string }) {
  const editor = useEditor();
  editor.setSelectedLayerId(props.layerId);
  return <PropertiesPanel />;
}

function clickButton(container: HTMLElement, aria: string) {
  const btn = container.querySelector<HTMLButtonElement>(`button[aria-label='${aria}']`);
  btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return btn;
}

describe("PropertiesPanel transform actions (Flip / Reset)", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("Flip H toggles the layer's horizontal flip", () => {
    const workspace = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("act-doc", "Act Doc", 100, 100);
    workspace.addDocument(session);
    const engine = session.engine;
    const layer = engine.getLayers()[0];
    engine.transformLayer(layer.id, { flipH: true });

    const { container, dispose } = renderWithSelectedLayer(workspace, layer.id);

    const before = engine.getLayer(layer.id)!.transform.flipH;
    expect(before).toBe(true);

    const btn = clickButton(container, "Flip horizontal");
    expect(btn).toBeTruthy();

    expect(engine.getLayer(layer.id)!.transform.flipH).toBe(false);
    dispose();
  });

  it("Reset Transform restores default position/scale/rotation/flip", () => {
    const workspace = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("reset-doc", "Reset Doc", 100, 100);
    workspace.addDocument(session);
    const engine = session.engine;
    const layer = engine.getLayers()[0];
    engine.transformLayer(layer.id, {
      x: 50, y: 30, scaleX: 2, scaleY: 1.5, rotation: 45, flipH: true, flipV: true,
    });

    const { container, dispose } = renderWithSelectedLayer(workspace, layer.id);

    const btn = clickButton(container, "Reset transform");
    expect(btn).toBeTruthy();

    const t = engine.getLayer(layer.id)!.transform;
    expect(t.x).toBe(0);
    expect(t.y).toBe(0);
    expect(t.scaleX).toBeCloseTo(1, 5);
    expect(t.scaleY).toBeCloseTo(1, 5);
    expect(t.rotation).toBe(0);
    expect(t.flipH).toBe(false);
    expect(t.flipV).toBe(false);
    dispose();
  });

  it("Flip / Reset buttons are disabled for a locked layer", () => {
    const workspace = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("lock-doc", "Lock Doc", 100, 100);
    workspace.addDocument(session);
    const engine = session.engine;
    const layer = engine.getLayers()[0];
    engine.setLayerLocked(layer.id, true);

    const { container, dispose } = renderWithSelectedLayer(workspace, layer.id);

    const flip = container.querySelector<HTMLButtonElement>("button[aria-label='Flip horizontal']");
    const reset = container.querySelector<HTMLButtonElement>("button[aria-label='Reset transform']");
    expect(flip?.disabled).toBe(true);
    expect(reset?.disabled).toBe(true);
    dispose();
  });
});
