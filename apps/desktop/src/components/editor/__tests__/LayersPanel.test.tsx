import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
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

function renderLayersPanel(session = WorkspaceManager.createBlankDocument("layers-test", "Layers Test", 800, 600)) {
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

describe("LayersPanel interactions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uploads the newly merged bitmap after Merge Down", async () => {
    const mergedBitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(mergedBitmap);

    const session = WorkspaceManager.createBlankDocument("merge-test", "Merge Test", 800, 600);
    session.engine.addLayer("Top");

    const { renderer, container, dispose } = renderLayersPanel(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mergeButton = container.querySelector('button[title="Merge Down"]') as HTMLButtonElement | null;
    if (!mergeButton) throw new Error("Merge Down button was not rendered");

    mergeButton.click();

    const mergedLayer = session.engine.getLayers()[0];
    expect(mergedLayer.imageBitmap).toBe(mergedBitmap);
    expect(renderer.uploadImage).toHaveBeenCalledWith(mergedLayer.id, mergedBitmap);

    dispose();
  });

  it("right-click selects the target layer and duplicates it through the production action", async () => {
    const session = WorkspaceManager.createBlankDocument("context-test", "Context Test", 800, 600);
    session.engine.addLayer("Top Layer");
    const target = session.engine.getLayers()[1];
    const { ws, container, dispose } = renderLayersPanel(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    container.querySelector<HTMLElement>('[data-layer-idx="1"]')!.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 40, clientY: 50 }),
    );
    expect(session.engine.getActiveLayerId()).toBe(target.id);
    const duplicate = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
      .find((button) => button.textContent?.includes("Duplicate Layer"))!;
    duplicate.click();

    expect(session.engine.getLayers()).toHaveLength(3);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    dispose();
  });

  it("starts inline rename from the target layer context menu", async () => {
    const { container, dispose } = renderLayersPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    container.querySelector<HTMLElement>('[data-layer-idx="0"]')!.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 40, clientY: 50 }),
    );
    const rename = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
      .find((button) => button.textContent?.includes("Rename Layer"))!;
    rename.click();

    expect(container.querySelector('input[type="text"]')).not.toBeNull();
    dispose();
  });

  it("uploads the newly flattened bitmap after Flatten All Layers", async () => {
    const flattenedBitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(flattenedBitmap);

    const session = WorkspaceManager.createBlankDocument("flatten-test", "Flatten Test", 800, 600);
    session.engine.addLayer("Layer 2");
    session.engine.addLayer("Layer 3");

    const { renderer, container, dispose } = renderLayersPanel(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const flattenButton = container.querySelector('button[title="Flatten All Layers"]') as HTMLButtonElement | null;
    if (!flattenButton) throw new Error("Flatten All Layers button was not rendered");

    flattenButton.click();

    const flattenedLayer = session.engine.getLayers()[0];
    expect(flattenedLayer.imageBitmap).toBe(flattenedBitmap);
    expect(renderer.uploadImage).toHaveBeenCalledWith(flattenedLayer.id, flattenedBitmap);

    dispose();
  });

  it("commits history before renaming a layer", async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { ws, session, container, dispose } = renderLayersPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const layerName = container.querySelector("span.flex-1") as HTMLSpanElement | null;
    if (!layerName) throw new Error("Layer name was not rendered");

    layerName.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));

    const input = container.querySelector("input[type='text']") as HTMLInputElement | null;
    if (!input) throw new Error("Layer rename input was not rendered");

    input.value = "Renamed Layer";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    const history = ws.getActiveHistory();
    expect(history?.canUndo()).toBe(true);

    const previous = history?.undo(session.engine.snapshot());
    expect(previous?.layers[0].name).toBe("Background");

    dispose();
  });

  it("commits history before toggling layer visibility", async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { ws, session, container, dispose } = renderLayersPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const visibilityButton = container.querySelector("[data-layer-visibility]") as HTMLButtonElement | null;
    if (!visibilityButton) throw new Error("Layer visibility button was not rendered");

    visibilityButton.click();

    const history = ws.getActiveHistory();
    expect(history?.canUndo()).toBe(true);

    const previous = history?.undo(session.engine.snapshot());
    expect(previous?.layers[0].visible).toBe(true);

    dispose();
  });

  it("commits the pre-drag opacity snapshot once for opacity changes", async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { ws, session, container, dispose } = renderLayersPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const opacityToggle = container.querySelector("[data-layer-opacity-toggle]") as HTMLButtonElement | null;
    if (!opacityToggle) throw new Error("Opacity toggle was not rendered");
    opacityToggle.click();

    const opacityInput = container.querySelector("[data-layer-opacity]") as HTMLInputElement | null;
    if (!opacityInput) throw new Error("Opacity slider was not rendered");

    opacityInput.value = "45";
    opacityInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    opacityInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(session.engine.getLayers()[0].opacity).toBe(0.45);

    const history = ws.getActiveHistory();
    expect(history?.canUndo()).toBe(true);

    const previous = history?.undo(session.engine.snapshot());
    expect(previous?.layers[0].opacity).toBe(1);

    dispose();
  });

  it("switches the layer panel to a functional history view", async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installCanvasMocks(bitmap);

    const { container, dispose } = renderLayersPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "History") as HTMLButtonElement | undefined;
    if (!historyTab) throw new Error("History tab was not rendered");

    historyTab.click();

    expect(container.textContent).toContain("Undo steps");
    expect(container.textContent).toContain("Redo steps");

    dispose();
  });
});
