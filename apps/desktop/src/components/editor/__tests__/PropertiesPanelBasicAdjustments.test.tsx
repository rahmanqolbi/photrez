import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { PropertiesPanel } from "../PropertiesPanel";
import { WorkspaceManager } from "@/engine/workspace";

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("PropertiesPanel basic adjustments", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("commits history and applies adjustment to the active bitmap layer", async () => {
    const workspace = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("adjust-doc", "Adjust Doc", 2, 1);
    workspace.addDocument(session);
    const layer = session.engine.getLayers()[0];
    const fakeBitmap = { width: 2, height: 1 } as ImageBitmap;
    session.engine.setLayerImageBitmap(layer.id, fakeBitmap);

    const applySpy = vi.spyOn(session.engine, "applyBasicAdjustment").mockImplementation(() => undefined);
    const history = workspace.getActiveHistory();
    if (!history) throw new Error("Expected active history");
    const commitSpy = vi.spyOn(history, "commit");

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
          <PropertiesPanel />
        </EditorProvider>
      ),
      container,
    );
    await tick();

    const brightness = container.querySelector<HTMLInputElement>("input[aria-label='Bright']");
    if (!brightness) throw new Error("Brightness slider was not rendered");
    brightness.value = "25";
    brightness.dispatchEvent(new InputEvent("input", { bubbles: true }));

    const apply = container.querySelector<HTMLButtonElement>("[data-basic-adjustment-apply]");
    if (!apply) throw new Error("Apply adjustment button was not rendered");
    apply.click();

    expect(commitSpy).toHaveBeenCalledWith(expect.any(Object), "Basic Adjustment");
    expect(applySpy).toHaveBeenCalledWith(layer.id, {
      brightness: 25,
      contrast: 0,
      saturation: 0,
    });
    expect(renderer.uploadImage).toHaveBeenCalledWith(layer.id, fakeBitmap);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });
});
