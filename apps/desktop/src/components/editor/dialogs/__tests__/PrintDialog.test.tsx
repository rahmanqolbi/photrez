import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../../shell/EditorContext";
import { PrintDialog } from "../PrintDialog";
import { WorkspaceManager } from "@/engine/workspace";

const mockPrintDocument = vi.hoisted(() => vi.fn());
vi.mock("../../printDocument", () => ({ printDocument: mockPrintDocument }));

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));
let setShowPrint: (value: boolean) => void = () => {};

function TestConsumer() {
  setShowPrint = useEditor().setShowPrintDialog;
  return null;
}

function renderDialog(show = true) {
  const workspace = new WorkspaceManager();
  workspace.addDocument(WorkspaceManager.createBlankDocument("test", "Test Doc", 800, 600));
  const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn(), resize: vi.fn() };
  const scheduler = { requestRender: vi.fn() };
  const trigger = document.createElement("button");
  const container = document.createElement("div");
  document.body.append(trigger, container);
  trigger.focus();
  const disposeRoot = render(
    () => (
      <EditorProvider workspace={workspace} renderer={renderer as any} scheduler={scheduler as any}>
        <PrintDialog />
        <TestConsumer />
      </EditorProvider>
    ),
    container,
  );
  if (show) setShowPrint(true);
  return {
    scheduler,
    trigger,
    dialog: () => document.querySelector<HTMLElement>('[data-dialog-kind="print"]'),
    dispose: () => {
      disposeRoot();
      trigger.remove();
      container.remove();
    },
  };
}

const button = (dialog: HTMLElement, label: string) => Array.from(dialog.querySelectorAll("button"))
  .find((candidate) => candidate.textContent?.trim() === label) as HTMLButtonElement;

describe("PrintDialog", () => {
  afterEach(() => {
    mockPrintDocument.mockReset();
    document.querySelectorAll("[data-photrez-dialog], [data-dialog-backdrop]").forEach((node) => node.remove());
  });

  it("stays unmounted until requested", () => {
    const view = renderDialog(false);
    expect(view.dialog()).toBeNull();
    view.dispose();
  });

  it("shows document info when opened", async () => {
    const view = renderDialog();
    await tick();
    const dialog = view.dialog()!;
    expect(dialog.textContent).toContain("Test Doc");
    expect(dialog.textContent).toContain("800");
    expect(dialog.textContent).toContain("600");
    view.dispose();
  });

  it("calls printDocument on Print button click", async () => {
    mockPrintDocument.mockResolvedValue(undefined);
    const view = renderDialog();
    await tick();
    button(view.dialog()!, "Print").click();
    await tick();
    expect(mockPrintDocument).toHaveBeenCalledOnce();
    view.dispose();
  });

  it("shows preparing spinner while printing", async () => {
    let finish!: (value: unknown) => void;
    mockPrintDocument.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = renderDialog();
    await tick();
    button(view.dialog()!, "Print").click();
    await tick();
    const dialog = view.dialog()!;
    expect(button(dialog, "Preparing...").disabled).toBe(true);
    expect(button(dialog, "Cancel").disabled).toBe(true);
    finish(undefined);
    await tick();
    view.dispose();
  });

  it.each(["Cancel", "Escape", "Backdrop"])("dismisses via %s and restores focus", async (method) => {
    const view = renderDialog();
    await tick();
    const dialog = view.dialog()!;
    if (method === "Cancel") button(dialog, "Cancel").click();
    if (method === "Escape") document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    if (method === "Backdrop") document.querySelector("[data-dialog-backdrop]")?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await tick();
    expect(view.dialog()).toBeNull();
    expect(document.activeElement).toBe(view.trigger);
    view.dispose();
  });
});
