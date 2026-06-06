import { describe, it, expect, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { CropOverlay } from "../CropOverlay";
import * as EditorContextModule from "../EditorContext";

describe("CropOverlay pointer capture", () => {
  it("captures pointer on its own svg root", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    const setSpy = vi.fn();
    SVGElement.prototype.setPointerCapture = setSpy;

    const origRelease = SVGElement.prototype.releasePointerCapture;
    const releaseSpy = vi.fn();
    SVGElement.prototype.releasePointerCapture = releaseSpy;

    const onCropRectChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <CropOverlay
          cropRect={{ x: 0, y: 0, w: 100, h: 100 }}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={onCropRectChange}
        />
      ),
      container,
    );

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    setSpy.mockClear();

    const moveZone = container.querySelector("[data-crop-move]");
    expect(moveZone).not.toBeNull();
    moveZone!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      }),
    );

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy.mock.instances[0]).toBe(svgEl);

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });

  it("fires onCropRectChange on move drag", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    SVGElement.prototype.releasePointerCapture = vi.fn();

    const onCropRectChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <CropOverlay
          cropRect={{ x: 10, y: 10, w: 100, h: 100 }}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={onCropRectChange}
        />
      ),
      container,
    );

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    onCropRectChange.mockClear();

    const moveZone = container.querySelector("[data-crop-move]");
    expect(moveZone).not.toBeNull();

    moveZone!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 2,
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      }),
    );

    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 2,
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 70,
      }),
    );

    expect(onCropRectChange).toHaveBeenCalled();

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });

  it("does not respond to non-captured pointer events", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    SVGElement.prototype.releasePointerCapture = vi.fn();

    const onCropRectChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <CropOverlay
          cropRect={{ x: 10, y: 10, w: 100, h: 100 }}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={onCropRectChange}
        />
      ),
      container,
    );

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    onCropRectChange.mockClear();

    const moveZone = container.querySelector("[data-crop-move]");
    moveZone!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 3,
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      }),
    );

    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 99,
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 70,
      }),
    );

    expect(onCropRectChange).not.toHaveBeenCalled();

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });

  it("releases capture and clears dragState on pointerup", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    const releaseSpy = vi.fn();
    SVGElement.prototype.releasePointerCapture = releaseSpy;

    const onCropRectChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <CropOverlay
          cropRect={{ x: 10, y: 10, w: 100, h: 100 }}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={onCropRectChange}
        />
      ),
      container,
    );

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    const moveZone = container.querySelector("[data-crop-move]");
    moveZone!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 4,
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      }),
    );

    releaseSpy.mockClear();

    svgEl!.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 4,
        bubbles: true,
        cancelable: true,
        clientX: 60,
        clientY: 60,
      }),
    );

    expect(releaseSpy).toHaveBeenCalled();

    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 4,
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 70,
      }),
    );

    expect(onCropRectChange).toHaveBeenCalledTimes(0);

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });

  it("clears dragState on lostpointercapture", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    SVGElement.prototype.releasePointerCapture = vi.fn();

    const onCropRectChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <CropOverlay
          cropRect={{ x: 10, y: 10, w: 100, h: 100 }}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={onCropRectChange}
        />
      ),
      container,
    );

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    const moveZone = container.querySelector("[data-crop-move]");
    moveZone!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 5,
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      }),
    );

    onCropRectChange.mockClear();

    svgEl!.dispatchEvent(
      new PointerEvent("lostpointercapture", {
        pointerId: 5,
        bubbles: true,
        cancelable: true,
      }),
    );

    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 5,
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 70,
      }),
    );

    expect(onCropRectChange).not.toHaveBeenCalled();

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });
});

describe("CropOverlay handle hit detection", () => {
  it("detects handle hit on pointerdown and starts drag", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    SVGElement.prototype.releasePointerCapture = vi.fn();

    const onCropRectChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <div style={{ position: "relative", width: "800px", height: "600px" }}>
          <CropOverlay
            cropRect={{ x: 100, y: 100, w: 200, h: 200 }}
            guideMode="thirds"
            canvasWidth={800}
            canvasHeight={600}
            zoom={1}
            cropMode="free"
            cropAspect={null}
            onCropRectChange={onCropRectChange}
          />
        </div>
      ),
      container,
    );

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    const rect = svgEl!.getBoundingClientRect();

    const seHandle = container.querySelector('[data-crop-handle="se"]');
    expect(seHandle).not.toBeNull();
    expect(seHandle!.getAttribute("width")).toBe("20");

    onCropRectChange.mockClear();

    seHandle!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 6,
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 300,
        clientY: rect.top + 300,
      }),
    );

    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 6,
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 320,
        clientY: rect.top + 320,
      }),
    );

    expect(onCropRectChange).toHaveBeenCalled();

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });
});

describe("CropOverlay hover handle wiring", () => {
  it("reports hover handle to parent callback", () => {
    const onHoverHandleChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <CropOverlay
          cropRect={{ x: 0, y: 0, w: 100, h: 100 }}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={vi.fn()}
          onHoverHandleChange={onHoverHandleChange}
        />
      ),
      container,
    );

    const seHandle = container.querySelector('[data-crop-handle="se"]');
    expect(seHandle).not.toBeNull();

    seHandle!.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    expect(onHoverHandleChange).toHaveBeenCalledWith("se");

    seHandle!.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    expect(onHoverHandleChange).toHaveBeenCalledWith(null);

    dispose();
    container.parentNode?.removeChild(container);
  });
});

describe("CropOverlay reactivity", () => {
  it("updates rendered crop box while resizing", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    SVGElement.prototype.releasePointerCapture = vi.fn();

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => {
      const [cropRect, setCropRect] = createSignal({ x: 10, y: 10, w: 100, h: 100 });
      return (
        <CropOverlay
          cropRect={cropRect()}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={setCropRect}
        />
      );
    }, container);

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();
    const visualRect = container.querySelectorAll("rect")[3];
    expect(visualRect).toBeDefined();
    expect(visualRect.getAttribute("width")).toBe("100");

    const seHandle = container.querySelector('[data-crop-handle="se"]');
    expect(seHandle).not.toBeNull();
    const bounds = svgEl!.getBoundingClientRect();
    seHandle!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 7,
        bubbles: true,
        cancelable: true,
        clientX: bounds.left + 110,
        clientY: bounds.top + 110,
      }),
    );
    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 7,
        bubbles: true,
        cancelable: true,
        clientX: bounds.left + 130,
        clientY: bounds.top + 110,
      }),
    );

    expect(visualRect.getAttribute("width")).toBe("120");

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });
});

describe("CropOverlay new crop box drawing", () => {
  it("preserves outside document bounds when drawing a replacement crop box", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    SVGElement.prototype.releasePointerCapture = vi.fn();

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => {
      const [cropRect, setCropRect] = createSignal({ x: 100, y: 100, w: 200, h: 120 });
      return (
        <CropOverlay
          cropRect={cropRect()}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={setCropRect}
        />
      );
    }, container);

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    svgEl!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 12,
        bubbles: true,
        cancelable: true,
        clientX: -20,
        clientY: -10,
      }),
    );
    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 12,
        bubbles: true,
        cancelable: true,
        clientX: 900,
        clientY: 710,
      }),
    );
    svgEl!.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 12,
        bubbles: true,
        cancelable: true,
        clientX: 900,
        clientY: 710,
      }),
    );

    const visualRect = container.querySelectorAll("rect")[3];
    expect(visualRect.getAttribute("x")).toBe("-20");
    expect(visualRect.getAttribute("y")).toBe("-10");
    expect(visualRect.getAttribute("width")).toBe("920");
    expect(visualRect.getAttribute("height")).toBe("720");

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });

  it("ignores tiny new crop draws and restores the previous crop box", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    SVGElement.prototype.releasePointerCapture = vi.fn();

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => {
      const [cropRect, setCropRect] = createSignal({ x: 50, y: 60, w: 200, h: 120 });
      return (
        <CropOverlay
          cropRect={cropRect()}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={setCropRect}
        />
      );
    }, container);

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    svgEl!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 11,
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 300,
      }),
    );
    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 11,
        bubbles: true,
        cancelable: true,
        clientX: 302,
        clientY: 302,
      }),
    );
    svgEl!.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 11,
        bubbles: true,
        cancelable: true,
        clientX: 302,
        clientY: 302,
      }),
    );

    const visualRect = container.querySelectorAll("rect")[3];
    expect(visualRect.getAttribute("x")).toBe("50");
    expect(visualRect.getAttribute("y")).toBe("60");
    expect(visualRect.getAttribute("width")).toBe("200");
    expect(visualRect.getAttribute("height")).toBe("120");

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });
});

describe("CropOverlay viewport panning", () => {
  it("pans the viewport in the opposite direction on move drag", () => {
    const origSet = SVGElement.prototype.setPointerCapture;
    SVGElement.prototype.setPointerCapture = vi.fn();
    const origRelease = SVGElement.prototype.releasePointerCapture;
    SVGElement.prototype.releasePointerCapture = vi.fn();

    const setViewportSpy = vi.fn();
    const syncViewportSpy = vi.fn();
    const requestRenderSpy = vi.fn();

    const mockEngine = {
      setViewport: setViewportSpy,
    };
    const mockWorkspace = {
      getActiveEngine: () => mockEngine,
    };
    const mockScheduler = {
      requestRender: requestRenderSpy,
    };

    const mockValue = {
      workspace: mockWorkspace,
      scheduler: mockScheduler,
      syncViewport: syncViewportSpy,
      pan: () => ({ x: 100, y: 100 }),
      hoverPos: () => null,
      setHoverPos: vi.fn(),
    };

    const useEditorSpy = vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const onCropRectChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <CropOverlay
          cropRect={{ x: 10, y: 10, w: 100, h: 100 }}
          guideMode="thirds"
          canvasWidth={800}
          canvasHeight={600}
          zoom={1.5}
          cropMode="free"
          cropAspect={null}
          onCropRectChange={onCropRectChange}
        />
      ),
      container,
    );

    const svgEl = container.querySelector("svg");
    expect(svgEl).not.toBeNull();

    const moveZone = container.querySelector("[data-crop-move]");
    expect(moveZone).not.toBeNull();

    // Start drag at (50, 50)
    moveZone!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 10,
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      }),
    );

    // Move to (70, 80) => screen delta (20, 30)
    svgEl!.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 10,
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 80,
      }),
    );

    // zoom = 1.5. actualDx = 20 / 1.5. actualDy = 30 / 1.5.
    // viewport shift should be: panX = 100 - actualDx * 1.5 = 100 - 20 = 80
    // viewport shift should be: panY = 100 - actualDy * 1.5 = 100 - 30 = 70
    expect(setViewportSpy).toHaveBeenCalledTimes(1);
    const callArgs = setViewportSpy.mock.calls[0][0];
    expect(callArgs.panX).toBeCloseTo(80, 5);
    expect(callArgs.panY).toBeCloseTo(70, 5);
    expect(syncViewportSpy).toHaveBeenCalled();
    expect(requestRenderSpy).toHaveBeenCalled();

    useEditorSpy.mockRestore();
    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });
});
