import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../../shell/EditorContext";
import { CanvasProperties } from "../CanvasProperties";
import { WorkspaceManager } from "@/engine/workspace";

function renderWithEditor(workspace = new WorkspaceManager()) {
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
        <CanvasProperties />
      </EditorProvider>
    ),
    container,
  );

  return {
    container,
    workspace,
    scheduler,
    dispose: () => {
      dispose();
      container.remove();
    },
  };
}

function clickButtonContaining(container: HTMLElement, text: string) {
  const btn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  );
  btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return btn;
}

describe("CanvasProperties Size/Zoom wiring", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("clicking Size opens the Resize Canvas dialog", () => {
    const workspace = new WorkspaceManager();
    workspace.addDocument(WorkspaceManager.createBlankDocument("cp-test", "CP Test", 800, 600));
    const { container, dispose } = renderWithEditor(workspace);

    const sizeBtn = clickButtonContaining(container, "800 × 600 px");
    expect(sizeBtn).toBeTruthy();

    // Resize Canvas modal becomes visible
    expect(container.textContent).toContain("Resize Canvas");

    dispose();
  });

  it("clicking Zoom triggers a fit-to-screen on the active engine", () => {
    const workspace = new WorkspaceManager();
    workspace.addDocument(WorkspaceManager.createBlankDocument("cp-zoom", "CP Zoom", 800, 600));
    const engine = workspace.getActiveEngine()!;
    const fitSpy = vi.spyOn(engine, "fitToScreen");

    const { container, dispose } = renderWithEditor(workspace);

    const zoomBtn = clickButtonContaining(container, "100 %");
    expect(zoomBtn).toBeTruthy();
    expect(fitSpy).toHaveBeenCalled();

    dispose();
  });
});
