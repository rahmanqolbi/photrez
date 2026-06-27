import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../shell/EditorContext";
import { Navigator } from "../Navigator";
import { WorkspaceManager } from "@/engine/workspace";

function makeCanvasContext() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    strokeRect: vi.fn(),
    set fillStyle(_value: string) {},
    set strokeStyle(_value: string) {},
    set lineWidth(_value: number) {},
  } as unknown as CanvasRenderingContext2D;
}

describe("Navigator preview rendering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("draws the document preview after a document is opened", async () => {
    const ctx = makeCanvasContext();
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(((type: string) => (type === "2d" ? ctx : null)) as any);

    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("nav-test", "Navigator Test", 800, 600);

    const renderer = {} as any;
    const scheduler = { requestRender: vi.fn() } as any;
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <Navigator />
        </EditorProvider>
      ),
      container,
    );

    ws.addDocument(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(getContextSpy).toHaveBeenCalledWith("2d");
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).toHaveBeenCalled();

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("drags the visible viewport frame as relative pan instead of recentering on pointerdown", async () => {
    const ctx = makeCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(((type: string) => (type === "2d" ? ctx : null)) as any);
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "releasePointerCapture").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 208,
      bottom: 88,
      width: 208,
      height: 88,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("nav-drag-test", "Navigator Drag Test", 800, 600);
    const setViewportSpy = vi.spyOn(session.engine, "setViewport");

    const renderer = {} as any;
    const scheduler = { requestRender: vi.fn() } as any;
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <Navigator />
        </EditorProvider>
      ),
      container,
    );

    ws.addDocument(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const navigatorSurface = container.querySelector("canvas")?.parentElement as HTMLElement | null;
    if (!navigatorSurface) throw new Error("Navigator surface not rendered");

    navigatorSurface.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      pointerId: 1,
      clientX: 60,
      clientY: 44,
    }));

    expect(setViewportSpy).not.toHaveBeenCalled();

    navigatorSurface.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      pointerId: 1,
      clientX: 70,
      clientY: 44,
    }));

    expect(setViewportSpy).toHaveBeenCalledWith({
      panX: expect.closeTo(-68.1818, 3),
      panY: expect.closeTo(0, 3),
      zoom: 1,
    });

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("ignores pointerdown in the navigator letterbox outside the document thumbnail", async () => {
    const ctx = makeCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(((type: string) => (type === "2d" ? ctx : null)) as any);
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 208,
      bottom: 88,
      width: 208,
      height: 88,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("nav-letterbox-test", "Navigator Letterbox Test", 800, 600);
    const setViewportSpy = vi.spyOn(session.engine, "setViewport");

    const renderer = {} as any;
    const scheduler = { requestRender: vi.fn() } as any;
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <Navigator />
        </EditorProvider>
      ),
      container,
    );

    ws.addDocument(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const navigatorSurface = container.querySelector("canvas")?.parentElement as HTMLElement | null;
    if (!navigatorSurface) throw new Error("Navigator surface not rendered");

    navigatorSurface.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      pointerId: 1,
      clientX: 20,
      clientY: 44,
    }));

    expect(setViewportSpy).not.toHaveBeenCalled();
    expect(HTMLElement.prototype.setPointerCapture).not.toHaveBeenCalled();

    dispose();
    container.parentNode?.removeChild(container);
  });
});
