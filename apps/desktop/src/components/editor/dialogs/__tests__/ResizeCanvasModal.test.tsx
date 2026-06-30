import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../../shell/EditorContext";
import { ResizeCanvasModal } from "../ResizeCanvasModal";
import { WorkspaceManager } from "@/engine/workspace";

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));
let setShowDialog: (value: boolean) => void = () => {};

function TestConsumer() {
  setShowDialog = useEditor().setShowResizeDialog;
  return null;
}

function renderModal(show = true, width = 800, height = 600) {
  const workspace = new WorkspaceManager();
  const session = WorkspaceManager.createBlankDocument("test", "Test Doc", width, height);
  workspace.addDocument(session);
  const renderer = {
    uploadImage: vi.fn(),
    destroyTexture: vi.fn(),
    resize: vi.fn(),
    resizeToViewport: vi.fn(),
  };
  const scheduler = { requestRender: vi.fn() };
  const trigger = document.createElement("button");
  const container = document.createElement("div");
  document.body.append(trigger, container);
  trigger.focus();

  const disposeRoot = render(
    () => (
      <EditorProvider workspace={workspace} renderer={renderer as any} scheduler={scheduler as any}>
        <ResizeCanvasModal />
        <TestConsumer />
      </EditorProvider>
    ),
    container,
  );
  if (show) setShowDialog(true);

  return {
    session,
    renderer,
    scheduler,
    trigger,
    dialog: () => document.querySelector<HTMLElement>('[data-dialog-kind="resize-canvas"]'),
    dispose: () => {
      disposeRoot();
      trigger.remove();
      container.remove();
    },
  };
}

const button = (dialog: HTMLElement, label: string) => Array.from(dialog.querySelectorAll("button"))
  .find((candidate) => candidate.textContent?.trim() === label) as HTMLButtonElement;

describe("ResizeCanvasModal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll("[data-photrez-dialog], [data-dialog-backdrop]").forEach((node) => node.remove());
  });

  it("stays unmounted until requested", () => {
    const view = renderModal(false);
    expect(view.dialog()).toBeNull();
    view.dispose();
  });

  it("opens as the shared desktop dialog with current dimensions and initial focus", async () => {
    const view = renderModal(true, 1024, 768);
    await tick();
    const dialog = view.dialog()!;
    const inputs = dialog.querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.textContent).toContain("Resize Canvas");
    expect([...inputs].map((input) => input.value)).toEqual(["1024", "768"]);
    expect(document.activeElement).toBe(inputs[0]);
    expect(dialog.querySelector('[aria-pressed="true"]')).toHaveTextContent("Keep proportions");
    view.dispose();
  });

  it("updates linked dimensions and allows unlocking the aspect ratio", () => {
    const view = renderModal();
    const dialog = view.dialog()!;
    const inputs = dialog.querySelectorAll<HTMLInputElement>('input[type="number"]');
    inputs[0].value = "400";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    expect(inputs[1].value).toBe("300");
    button(dialog, "Keep proportions").click();
    expect(dialog.querySelector('[aria-pressed="false"]')).toBeTruthy();
    inputs[0].value = "200";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    expect(inputs[1].value).toBe("300");
    view.dispose();
  });

  it("resizes through the production path and preserves undo", () => {
    const view = renderModal();
    const dialog = view.dialog()!;
    const width = dialog.querySelector<HTMLInputElement>("#resize-canvas-width")!;
    width.value = "400";
    width.dispatchEvent(new Event("input", { bubbles: true }));
    button(dialog, "Resize").click();
    expect(view.session.engine.getWidth()).toBe(400);
    expect(view.session.engine.getHeight()).toBe(300);
    expect(view.renderer.resizeToViewport).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 1);
    expect(view.scheduler.requestRender).toHaveBeenCalledOnce();
    expect(view.dialog()).toBeNull();
    const previous = view.session.history.undo(view.session.engine.snapshot());
    expect(previous).not.toBeNull();
    view.session.engine.restore(previous!);
    expect([view.session.engine.getWidth(), view.session.engine.getHeight()]).toEqual([800, 600]);
    view.dispose();
  });

  it("closes unchanged without renderer work", () => {
    const view = renderModal();
    button(view.dialog()!, "Resize").click();
    expect(view.dialog()).toBeNull();
    expect(view.renderer.resizeToViewport).not.toHaveBeenCalled();
    expect(view.scheduler.requestRender).not.toHaveBeenCalled();
    view.dispose();
  });

  it.each(["Cancel", "Escape", "Backdrop"])("dismisses via %s and restores focus", async (method) => {
    const view = renderModal();
    await tick();
    const dialog = view.dialog()!;
    if (method === "Cancel") button(dialog, "Cancel").click();
    if (method === "Escape") document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    if (method === "Backdrop") document.querySelector("[data-dialog-backdrop]")?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await tick();
    expect(view.dialog()).toBeNull();
    expect(view.renderer.resizeToViewport).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(view.trigger);
    view.dispose();
  });
});
