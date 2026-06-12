import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../EditorContext";
import { LayersPanel } from "../LayersPanel";
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

  it("delete button calls confirm with layer name", () => {
    const session = WorkspaceManager.createBlankDocument("test", "Test", 800, 600);
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { container, session: s, dispose } = renderLayersPanel(session);

    const l1 = s.engine.getLayers()[0];
    const l2 = s.engine.addLayer("Layer 2");

    vi.spyOn(window, "confirm").mockImplementation(() => true);

    const deleteBtn = container.querySelector<HTMLButtonElement>("button[title='Delete Layer']");
    expect(deleteBtn).toBeTruthy();
    deleteBtn!.click();

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining(l2.name),
    );

    dispose();
  });

  it("cancelling confirm does not delete layer", () => {
    const session = WorkspaceManager.createBlankDocument("test", "Test", 800, 600);
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { container, session: s, dispose } = renderLayersPanel(session);

    s.engine.addLayer("Layer 2");

    vi.spyOn(window, "confirm").mockImplementation(() => false);

    const deleteBtn = container.querySelector<HTMLButtonElement>("button[title='Delete Layer']");
    expect(deleteBtn).toBeTruthy();
    deleteBtn!.click();

    expect(s.engine.getLayers().length).toBe(2);

    dispose();
  });

  it("confirm is not shown for last layer", () => {
    const session = WorkspaceManager.createBlankDocument("test", "Test", 800, 600);
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { container, session: s, dispose } = renderLayersPanel(session);

    vi.spyOn(window, "confirm").mockImplementation(() => true);

    const deleteBtn = container.querySelector<HTMLButtonElement>("button[title='Delete Layer']");
    expect(deleteBtn).toBeTruthy();
    deleteBtn!.click();

    expect(window.confirm).not.toHaveBeenCalled();
    expect(s.engine.getLayers().length).toBe(1);

    dispose();
  });
});
