import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { BottomStatusBar } from "../BottomStatusBar";
import { EditorProvider, useEditor } from "../EditorContext";
import { WorkspaceManager } from "@/engine/workspace";
import type { WebGL2Backend } from "@/renderer/webgl2";
import type { RenderScheduler } from "@/renderer/scheduler";

describe("History panel wiring", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("opens the right dock and selects the History tab from the status bar", () => {
    const workspace = new WorkspaceManager();
    workspace.addDocument(
      WorkspaceManager.createBlankDocument("history-wiring", "History Wiring", 800, 600),
    );
    const renderer = {} as WebGL2Backend;
    const scheduler = { requestRender: vi.fn() } as unknown as RenderScheduler;
    const setRightDockOpen = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const DockPanelProbe = () => {
      const { rightDockPanel } = useEditor();
      return <span data-right-dock-panel>{rightDockPanel()}</span>;
    };
    const dispose = render(
      () => (
        <EditorProvider
          workspace={workspace}
          renderer={renderer}
          scheduler={scheduler}
          rightDockOpen={() => false}
          setRightDockOpen={setRightDockOpen}
        >
          <BottomStatusBar />
          <DockPanelProbe />
        </EditorProvider>
      ),
      container,
    );
    const trigger = container.querySelector<HTMLButtonElement>("[data-status-history-trigger]");
    if (!trigger) throw new Error("History status trigger was not rendered");

    expect(trigger).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector("[data-right-dock-panel]")?.textContent).toBe("layers");
    trigger.click();

    expect(trigger).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("[data-right-dock-panel]")?.textContent).toBe("history");
    expect(setRightDockOpen).toHaveBeenCalledWith(true);

    dispose();
  });
});
