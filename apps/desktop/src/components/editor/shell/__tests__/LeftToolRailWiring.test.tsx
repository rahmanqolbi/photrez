import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../EditorContext";
import { LeftToolRail } from "../LeftToolRail";
import { WorkspaceManager } from "@/engine/workspace";
import { DialogProvider } from "../../dialogs/DialogProvider";

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
          <DialogProvider>
            <LeftToolRail />
          </DialogProvider>
        </EditorProvider>
      ),
      root
    );

    // Let's verify that the tool rail buttons no longer have native title attributes
    // because we replaced them with Tooltip components, which don't set native title
    // (native title triggers browser tooltips which causes duplicates).
    const buttons = root.querySelectorAll("button");
    
    // There are 6 tools + 1 swap micro-button = 7 buttons in total
    expect(buttons.length).toBeGreaterThanOrEqual(7);

    // Verify all tool buttons do not have native title attributes
    buttons.forEach((btn) => {
      expect(btn.getAttribute("title")).toBeNull();
    });

    dispose();
    root.remove();
  });

  it("clicking a tool button updates the active tool and applies active styling", () => {
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
          <DialogProvider>
            <LeftToolRail />
          </DialogProvider>
        </EditorProvider>
      ),
      root
    );

    const buttons = root.querySelectorAll<HTMLButtonElement>("button");

    // Find the brush tool button (aria-label="Brush Tool")
    const brushBtn = Array.from(buttons).find((b) => b.getAttribute("aria-label") === "Brush Tool");
    expect(brushBtn).not.toBeNull();
    brushBtn!.click();

    // After click, brush button should have active styling
    expect(brushBtn!.className).toContain("bg-white/5");
    expect(brushBtn!.className).toContain("text-editor-text");

    // Move tool button should NOT have active styling
    const moveBtn = Array.from(buttons).find((b) => b.getAttribute("aria-label") === "Move Tool");
    expect(moveBtn).not.toBeNull();
    expect(moveBtn!.className).toContain("text-editor-icon");

    dispose();
    root.remove();
  });

  it("clicking the Swap Colors button swaps foreground and background color signals", () => {
    const ws = new WorkspaceManager();
    const doc = WorkspaceManager.createBlankDocument("test-doc", "Test Doc", 800, 600);
    ws.addDocument(doc);

    const root = document.createElement("div");
    document.body.appendChild(root);

    let currentFg = "";
    let currentBg = "";

    const dispose = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={{ uploadImage: vi.fn(), destroyTexture: vi.fn() } as any}
          scheduler={{ requestRender: vi.fn() } as any}
        >
          <DialogProvider>
            {(() => {
              const context = useEditor();
              return (
                <>
                  <LeftToolRail />
                  <button
                    onClick={() => {
                      currentFg = context.fgColor();
                      currentBg = context.bgColor();
                    }}
                    data-testid="probe"
                  />
                </>
              );
            })()}
          </DialogProvider>
        </EditorProvider>
      ),
      root
    );

    const probe = root.querySelector("[data-testid='probe']") as HTMLButtonElement;
    probe.click();

    const initialFg = currentFg;
    const initialBg = currentBg;

    // Find the Swap Colors button (aria-label="Swap Colors")
    const swapBtn = root.querySelector("button[aria-label='Swap Colors']") as HTMLButtonElement;
    expect(swapBtn).not.toBeNull();
    swapBtn.click();

    probe.click();
    expect(currentFg).toBe(initialBg);
    expect(currentBg).toBe(initialFg);

    dispose();
    root.remove();
  });

  it("pressing the D key resets colors to default photon amber and white", () => {
    const ws = new WorkspaceManager();
    const doc = WorkspaceManager.createBlankDocument("test-doc", "Test Doc", 800, 600);
    ws.addDocument(doc);

    const root = document.createElement("div");
    document.body.appendChild(root);

    let currentFg = "";
    let currentBg = "";

    const dispose = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={{ uploadImage: vi.fn(), destroyTexture: vi.fn() } as any}
          scheduler={{ requestRender: vi.fn() } as any}
        >
          <DialogProvider>
            {(() => {
              const context = useEditor();
              // Preset colors to something else first to test reset
              context.setFgColor("#00ff00");
              context.setBgColor("#0000ff");
              return (
                <>
                  <LeftToolRail />
                  <button
                    onClick={() => {
                      currentFg = context.fgColor();
                      currentBg = context.bgColor();
                    }}
                    data-testid="probe"
                  />
                </>
              );
            })()}
          </DialogProvider>
        </EditorProvider>
      ),
      root
    );

    const probe = root.querySelector("[data-testid='probe']") as HTMLButtonElement;
    probe.click();
    expect(currentFg).toBe("#00ff00");
    expect(currentBg).toBe("#0000ff");

    // Dispatch keyboard event 'd' to reset colors
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));

    probe.click();
    expect(currentFg).toBe("#E15A17");
    expect(currentBg).toBe("#FFFFFF");

    dispose();
    root.remove();
  });
});
