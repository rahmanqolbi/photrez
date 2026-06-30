import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../../shell/EditorContext";
import { LayersPanel } from "../../layers/LayersPanel";
import { WorkspaceManager } from "@/engine/workspace";

function installCanvasMocks(bitmap: ImageBitmap) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(((type: string) => {
      if (type !== "2d") return null;
      return {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        strokeRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        beginPath: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
        set globalAlpha(_value: number) {},
        set globalCompositeOperation(_value: string) {},
      } as unknown as CanvasRenderingContext2D;
    }) as any);

  vi.stubGlobal("OffscreenCanvas", class {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return {
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        set globalAlpha(_value: number) {},
        set globalCompositeOperation(_value: string) {},
      };
    }
    transferToImageBitmap() {
      return bitmap;
    }
  });
}

function renderLayersPanel(session = WorkspaceManager.createBlankDocument("test", "Test", 800, 600)) {
  const ws = new WorkspaceManager();
  const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
  const scheduler = { requestRender: vi.fn() };
  const container = document.createElement("div");
  document.body.appendChild(container);

  const dispose = render(
    () => (
      <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
        <LayersPanel />
      </EditorProvider>
    ),
    container,
  );

  ws.addDocument(session);

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

describe("Delete layer confirmation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("delete button shows the shared dialog with layer name and deletes after confirmation", async () => {
    const session = WorkspaceManager.createBlankDocument("test", "Test", 800, 600);
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { container, session: s, dispose } = renderLayersPanel(session);

    const l2 = s.engine.addLayer("Layer 2");

    const deleteBtn = container.querySelector<HTMLButtonElement>("button[aria-label='Delete Layer']");
    expect(deleteBtn).toBeTruthy();
    deleteBtn!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]');
    expect(dialog).toHaveTextContent(l2.name);
    expect(document.activeElement).toBe(document.querySelector("[data-dialog-cancel]"));
    document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(s.engine.getLayers()).toHaveLength(1);
    expect(s.engine.getLayers()[0].id).not.toBe(l2.id);

    dispose();
  });

  it("cancelling the shared dialog does not delete layer", async () => {
    const session = WorkspaceManager.createBlankDocument("test", "Test", 800, 600);
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { container, session: s, dispose } = renderLayersPanel(session);

    s.engine.addLayer("Layer 2");

    const deleteBtn = container.querySelector<HTMLButtonElement>("button[aria-label='Delete Layer']");
    expect(deleteBtn).toBeTruthy();
    deleteBtn!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    document.querySelector<HTMLButtonElement>("[data-dialog-cancel]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(s.engine.getLayers().length).toBe(2);

    dispose();
  });

  it("dialog is not shown for last layer", () => {
    const session = WorkspaceManager.createBlankDocument("test", "Test", 800, 600);
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { container, session: s, dispose } = renderLayersPanel(session);

    const deleteBtn = container.querySelector<HTMLButtonElement>("button[aria-label='Delete Layer']");
    expect(deleteBtn).toBeTruthy();
    deleteBtn!.click();

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(s.engine.getLayers().length).toBe(1);

    dispose();
  });

  it("does not delete from the original document if the active document changes while open", async () => {
    const first = WorkspaceManager.createBlankDocument("first", "First", 800, 600);
    first.engine.addLayer("Layer 2");
    const { ws, container, dispose } = renderLayersPanel(first);
    const deleteBtn = container.querySelector<HTMLButtonElement>("button[aria-label='Delete Layer']")!;
    deleteBtn.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const second = WorkspaceManager.createBlankDocument("second", "Second", 800, 600);
    ws.addDocument(second);
    document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(first.engine.getLayers()).toHaveLength(2);
    expect(second.engine.getLayers()).toHaveLength(1);
    dispose();
  });
});
