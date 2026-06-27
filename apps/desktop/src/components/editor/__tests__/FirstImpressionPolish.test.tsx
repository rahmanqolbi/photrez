import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { BottomStatusBar } from "../shell/BottomStatusBar";
import { EditorProvider } from "../shell/EditorContext";
import { EmptyWorkspace } from "../shell/EmptyWorkspace";
import { RightDock } from "../shell/RightDock";
import { WorkspaceManager } from "@/engine/workspace";

function renderWithEditor(renderChildren: () => any, workspace = new WorkspaceManager()) {
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
        {renderChildren()}
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

describe("first impression polish", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a real blank document from the empty workspace presets", () => {
    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => "empty-workspace-test"),
    });
    const { container, workspace, scheduler, dispose } = renderWithEditor(() => <EmptyWorkspace />);

    expect(container.textContent).toContain("Start a Photrez document");
    expect(container.textContent).not.toContain("portrait-retouch");
    expect(container.textContent).not.toContain("brand-poster");

    const widePreset = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("1600 x 1000"),
    );
    if (!widePreset) throw new Error("Wide blank canvas preset was not rendered");

    widePreset.click();

    const engine = workspace.getActiveEngine();
    expect(workspace.getDocumentCount()).toBe(1);
    expect(engine?.getWidth()).toBe(1600);
    expect(engine?.getHeight()).toBe(1000);
    expect(scheduler.requestRender).toHaveBeenCalled();
    dispose();
  });

  it("keeps the status bar limited to wired actions", () => {
    const workspace = new WorkspaceManager();
    workspace.addDocument(WorkspaceManager.createBlankDocument("status-polish", "Status Polish", 800, 600));
    const { container, dispose } = renderWithEditor(() => <BottomStatusBar />, workspace);

    expect(container.querySelector("[data-status-history-trigger]")).not.toBeNull();
    expect(container.textContent).toContain("History");
    expect(container.textContent).not.toContain("Snapshots");
    expect(container.textContent).not.toContain("Assets");
    dispose();
  });

  it("labels the inspector with flat tabs: Properties, Adjustments, Presets, Layers, History", () => {
    const workspace = new WorkspaceManager();
    workspace.addDocument(WorkspaceManager.createBlankDocument("dock-polish", "Dock Polish", 800, 600));
    const { container, dispose } = renderWithEditor(() => <RightDock open={true} onClose={vi.fn()} />, workspace);

    expect(container.textContent).toContain("Properties");
    expect(container.textContent).toContain("Adjustments");
    expect(container.textContent).toContain("Presets");
    expect(container.textContent).toContain("Layers");
    expect(container.textContent).toContain("History");
    dispose();
  });
});
