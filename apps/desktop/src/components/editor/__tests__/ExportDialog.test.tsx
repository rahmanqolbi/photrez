import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../EditorContext";
import { ExportDialog } from "../ExportDialog";
import { WorkspaceManager } from "@/engine/workspace";

let setShowExport: (v: boolean) => void = () => {};

const TestConsumer = () => {
  const editor = useEditor();
  setShowExport = editor.setShowExportDialog;
  return null;
};

function renderDialog(show: boolean) {
  const ws = new WorkspaceManager();
  const session = WorkspaceManager.createBlankDocument("test", "Test Doc", 800, 600);
  ws.addDocument(session);

  const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn(), resize: vi.fn() };
  const scheduler = { requestRender: vi.fn() };
  const container = document.createElement("div");
  document.body.appendChild(container);

  const dispose = render(
    () => (
      <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
        <ExportDialog />
        <TestConsumer />
      </EditorProvider>
    ),
    container,
  );

  if (show) {
    setShowExport(true);
  }

  return {
    ws,
    session,
    renderer,
    scheduler,
    container,
    dispose: () => {
      dispose();
      container.parentNode?.removeChild(container);
    },
  };
}

describe("ExportDialog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders nothing when showExportDialog is false", () => {
    const { container, dispose } = renderDialog(false);
    expect(container.textContent).toBe("");
    dispose();
  });

  it("renders dialog with format buttons when visible", () => {
    const { container, dispose } = renderDialog(true);
    expect(container.textContent).toContain("Export");
    expect(container.textContent).toContain("PNG");
    expect(container.textContent).toContain("JPEG");
    expect(container.textContent).toContain("WebP");
    dispose();
  });

  it("defaults to PNG format", () => {
    const { container, dispose } = renderDialog(true);
    const buttons = container.querySelectorAll("button");
    const pngBtn = Array.from(buttons).find((b) => b.textContent === "PNG");
    expect(pngBtn).toBeTruthy();
    // PNG should have the accent class (default selected)
    expect(pngBtn!.className).toContain("bg-editor-accent");
    dispose();
  });

  it("switches quality visibility based on format", () => {
    const { container, dispose } = renderDialog(true);

    // PNG: no quality slider
    let slider = container.querySelector<HTMLInputElement>("input[type=range]");
    expect(slider).toBeNull();

    // Switch to JPEG
    const jpegBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "JPEG",
    );
    expect(jpegBtn).toBeTruthy();
    (jpegBtn as HTMLButtonElement).click();

    slider = container.querySelector<HTMLInputElement>("input[type=range]");
    expect(slider).toBeTruthy();
    expect(slider!.value).toBe("90");

    dispose();
  });

  it("Cancel closes dialog", () => {
    const { container, dispose } = renderDialog(true);

    const cancelBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Cancel",
    );
    expect(cancelBtn).toBeTruthy();
    (cancelBtn as HTMLButtonElement).click();

    expect(container.textContent).toBe("");
    dispose();
  });

  it("Escape key closes dialog", () => {
    const { container, dispose } = renderDialog(true);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(container.textContent).toBe("");
    dispose();
  });
});
