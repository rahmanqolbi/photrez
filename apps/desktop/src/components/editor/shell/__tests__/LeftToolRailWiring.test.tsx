import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { LeftToolRail } from "../LeftToolRail";
import { WorkspaceManager } from "@/engine/workspace";

describe("LeftToolRail Tooltip Wiring", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders tool rail buttons wrapped with Tooltip components", () => {
    const ws = new WorkspaceManager();
    const doc = WorkspaceManager.createBlankDocument("test-doc", "Test Doc", 800, 600);
    ws.addDocument(doc);

    const root = document.createElement("div");
    document.body.appendChild(root);

    const dispose = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={{ uploadImage: vi.fn(), destroyTexture: vi.fn() } as any}
          scheduler={{ requestRender: vi.fn() } as any}
        >
          <LeftToolRail />
        </EditorProvider>
      ),
      root
    );

    // Let's verify that the tool rail buttons no longer have native title attributes
    // because we replaced them with Tooltip components, which don't set native title
    // (native title triggers browser tooltips which causes duplicates).
    const buttons = root.querySelectorAll("button");
    
    // There are 6 tools + 1 swap micro-button + 1 more tools button = 8 buttons in total
    expect(buttons.length).toBeGreaterThanOrEqual(8);

    // Verify all tool buttons do not have native title attributes
    buttons.forEach((btn) => {
      expect(btn.getAttribute("title")).toBeNull();
    });

    dispose();
    root.remove();
  });
});
