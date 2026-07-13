import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  WebGL2Backend,
  WEBGL2_CONTEXT_RESTORED_EVENT,
  WEBGL2_CONTEXT_OPTIONS,
  getInterLayerCopyQuad,
  getRequiredUniformLocation,
} from "../webgl2";
import type { RenderLayer, RenderState, Transform2D } from "../../engine/types";

/*
 * Regression suite for the multi-layer ping-pong COPY pass.
 *
 * Bug (2026-06-18): the inter-layer COPY pass reused the camera viewProj +
 * doc-coord rect. When fit-to-screen left padding, the doc only covered the
 * central area of the FBO, but the sampler reads the WHOLE source FBO
 * (texCoord 0..1). The whole FBO (layer + transparent margins) was squeezed
 * into the doc-region of the target FBO, visually shrinking every previously-
 * composited layer by the doc/viewport ratio on each layer above it. Merging
 * masked the bug because a single layer skips the copy branch.
 *
 * These tests pin down the contract at THREE levels:
 *   1. Pure helper (`getInterLayerCopyQuad`) — edge cases.
 *   2. Render path uniforms — captures `uniform4f(u_layerRect, ...)` calls
 *      during real `render()` execution via a GL mock and asserts the
 *      sequence matches the expected (doc, viewport, doc, viewport, ...) pattern.
 *   3. Sentinel checks — explicit "must NOT equal doc bounds" asserts so a
 *      future revert to camera viewProj + doc-coord rect fails loudly.
 */

// ─── GL mock ───
// Records every gl.* call. Returns shapes that satisfy the WebGL2Backend's
// init/upload/resize/render code paths without needing a real WebGL context.
function makeGLMock() {
  const calls: Array<{ method: string; args: any[] }> = [];
  let handleSeq = 0;

  const constants: Record<string, number> = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    MAX_TEXTURE_SIZE: 3379,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    TEXTURE_MIN_FILTER: 10241,
    LINEAR: 9729,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    CLAMP_TO_EDGE: 33071,
    TEXTURE_WRAP_T: 10243,
    TEXTURE0: 33984,
    TEXTURE1: 33985,
    FRAMEBUFFER: 36160,
    COLOR_ATTACHMENT0: 36064,
    COLOR_BUFFER_BIT: 16384,
    TRIANGLES: 4,
    SCISSOR_TEST: 3089,
  };

  const handler: ProxyHandler<Record<string, any>> = {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop in target) return target[prop];
      return (...args: any[]) => {
        // Float32Array references are reused by computeViewMatrix; clone so
        // each captured call retains its own snapshot.
        const cleanArgs = args.map((a) =>
          a instanceof Float32Array ? Array.from(a) : a,
        );
        calls.push({ method: prop, args: cleanArgs });
        switch (prop) {
          case "createShader":
          case "createProgram":
          case "createTexture":
          case "createFramebuffer":
          case "createVertexArray":
            return { __mock: prop, id: ++handleSeq };
          case "getShaderParameter":
          case "getProgramParameter":
            return true;
          case "getParameter":
            return 4096;
          case "getShaderInfoLog":
          case "getProgramInfoLog":
            return "";
          case "getUniformLocation":
            // args = [program, uniformName]
            return { name: args[1] };
        }
        return undefined;
      };
    },
  };

  const gl = new Proxy(constants, handler);
  return { gl, calls };
}

function makeCanvas(gl: any): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  // Override getContext so the renderer receives the mock GL.
  (canvas as any).getContext = () => gl;
  return canvas;
}

const DEFAULT_TRANSFORM: Transform2D = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  flipH: false,
  flipV: false,
};

function makeLayer(
  id: string,
  overrides: Partial<RenderLayer> = {},
): RenderLayer {
  return {
    id,
    textureHandle: { id: `tex-${id}` } as any,
    visible: true,
    opacity: 1.0,
    blendMode: "normal",
    transform: { ...DEFAULT_TRANSFORM },
    width: 800,
    height: 600,
    ...overrides,
  };
}

function makeState(
  layers: RenderLayer[],
  docW = 800,
  docH = 600,
): RenderState {
  return {
    documentId: "test",
    viewport: { panX: 0, panY: 0, zoom: 1, rotation: 0 },
    documentSize: { width: docW, height: docH },
    layers,
    selection: null,
    checkerboard: true,
    backgroundColor: [0, 0, 0, 1],
  };
}

function layerRectCalls(
  calls: Array<{ method: string; args: any[] }>,
): number[][] {
  return calls
    .filter(
      (c) =>
        c.method === "uniform4f" && c.args[0]?.name === "u_layerRect",
    )
    .map((c) => [c.args[1], c.args[2], c.args[3], c.args[4]]);
}

function layerCenterCalls(
  calls: Array<{ method: string; args: any[] }>,
): number[][] {
  return calls
    .filter(
      (c) =>
        c.method === "uniform2f" && c.args[0]?.name === "u_layerCenter",
    )
    .map((c) => [c.args[1], c.args[2]]);
}

function drawArraysCount(
  calls: Array<{ method: string; args: any[] }>,
): number {
  return calls.filter((c) => c.method === "drawArrays").length;
}

function adjustmentCalls(
  calls: Array<{ method: string; args: any[] }>,
): number[][] {
  return calls
    .filter(
      (c) =>
        c.method === "uniform3f" && c.args[0]?.name === "u_adjustment",
    )
    .map((c) => [c.args[1], c.args[2], c.args[3]]);
}

// ─── Pure helper edge cases ───

describe("getInterLayerCopyQuad — edge cases", () => {
  it("returns a rect covering the FULL logical viewport (not doc bounds)", () => {
    const q = getInterLayerCopyQuad(1000, 700);
    expect(q.rect).toEqual([0, 0, 1000, 700]);
    expect(q.center).toEqual([500, 350]);
  });

  it("handles 1-pixel viewport without NaN/zero-divide", () => {
    const q = getInterLayerCopyQuad(1, 1);
    expect(q.rect).toEqual([0, 0, 1, 1]);
    expect(q.center).toEqual([0.5, 0.5]);
  });

  it("handles zero viewport without throwing", () => {
    expect(() => getInterLayerCopyQuad(0, 0)).not.toThrow();
    const q = getInterLayerCopyQuad(0, 0);
    expect(q.rect).toEqual([0, 0, 0, 0]);
    expect(q.center).toEqual([0, 0]);
  });

  it("handles tall portrait viewport", () => {
    const q = getInterLayerCopyQuad(400, 1200);
    expect(q.rect).toEqual([0, 0, 400, 1200]);
    expect(q.center).toEqual([200, 600]);
  });

  it("handles wide landscape viewport", () => {
    const q = getInterLayerCopyQuad(1920, 1080);
    expect(q.rect).toEqual([0, 0, 1920, 1080]);
    expect(q.center).toEqual([960, 540]);
  });

  it("handles 4K-class viewport", () => {
    const q = getInterLayerCopyQuad(3840, 2160);
    expect(q.rect).toEqual([0, 0, 3840, 2160]);
    expect(q.center).toEqual([1920, 1080]);
  });

  it("handles fractional viewport (sub-pixel DPR scaling)", () => {
    const q = getInterLayerCopyQuad(800.5, 600.25);
    expect(q.rect).toEqual([0, 0, 800.5, 600.25]);
    expect(q.center).toEqual([400.25, 300.125]);
  });

  it("is pure — same inputs always yield identical structurally-equal output", () => {
    const a = getInterLayerCopyQuad(1000, 700);
    const b = getInterLayerCopyQuad(1000, 700);
    expect(a).toEqual(b);
  });

  it("output scales linearly with viewport (no hidden offset)", () => {
    const a = getInterLayerCopyQuad(500, 400);
    const b = getInterLayerCopyQuad(1000, 800);
    expect(b.rect[2]).toBe(a.rect[2] * 2);
    expect(b.rect[3]).toBe(a.rect[3] * 2);
    expect(b.center[0]).toBe(a.center[0] * 2);
    expect(b.center[1]).toBe(a.center[1] * 2);
  });
});

describe("getRequiredUniformLocation", () => {
  it("returns the uniform location when the shader exposes it", () => {
    const location = { name: "u_viewProj" } as unknown as WebGLUniformLocation;
    const gl = {
      getUniformLocation: () => location,
    } as unknown as WebGL2RenderingContext;

    expect(getRequiredUniformLocation(gl, {} as WebGLProgram, "u_viewProj")).toBe(location);
  });

  it("throws an explicit error when a required uniform is missing", () => {
    const gl = {
      getUniformLocation: () => null,
    } as unknown as WebGL2RenderingContext;

    expect(() => getRequiredUniformLocation(gl, {} as WebGLProgram, "u_missing")).toThrow(
      "Required WebGL uniform not found: u_missing",
    );
  });
});

describe("WEBGL2_CONTEXT_OPTIONS", () => {
  it("does not preserve the drawing buffer by default", () => {
    expect(WEBGL2_CONTEXT_OPTIONS.preserveDrawingBuffer).toBe(false);
  });
});

describe("WebGL2Backend context loss handling", () => {
  const BITMAP = { width: 800, height: 600, close: () => {} } as ImageBitmap;

  it("pauses GPU work while lost and rebuilds resources on restore", () => {
    const mock = makeGLMock();
    const canvas = makeCanvas(mock.gl);
    const renderer = new WebGL2Backend();
    const restored = vi.fn();
    canvas.addEventListener(WEBGL2_CONTEXT_RESTORED_EVENT, restored);

    renderer.initialize(canvas);
    renderer.resizeToViewport(1000, 700, 1);
    renderer.uploadImage("a", BITMAP);
    mock.calls.length = 0;

    const lostEvent = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lostEvent);

    expect(lostEvent.defaultPrevented).toBe(true);
    expect(renderer.readPixel(0, 0)).toBeNull();
    expect(() => renderer.uploadImage("a", BITMAP)).toThrow(
      "Renderer context is lost; upload is paused until restore",
    );

    renderer.render(makeState([makeLayer("a")]));
    expect(mock.calls).toHaveLength(0);

    canvas.dispatchEvent(new Event("webglcontextrestored"));

    expect(restored).toHaveBeenCalledTimes(1);

    mock.calls.length = 0;
    renderer.resizeToViewport(1000, 700, 1);
    renderer.uploadImage("a", BITMAP);
    renderer.render(makeState([makeLayer("a")]));

    expect(drawArraysCount(mock.calls)).toBeGreaterThan(0);
  });
});

// ─── Render-path uniforms (mock GL) ───

describe("WebGL2Backend.render — inter-layer COPY pass uniforms", () => {
  // Use different doc/viewport sizes so we can tell which one the copy uses.
  const DOC_W = 800;
  const DOC_H = 600;
  const VP_W = 1000;
  const VP_H = 700;
  const BITMAP = { width: DOC_W, height: DOC_H, close: () => {} } as ImageBitmap;

  let renderer: WebGL2Backend;
  let calls: Array<{ method: string; args: any[] }>;

  beforeEach(() => {
    const mock = makeGLMock();
    calls = mock.calls;
    const canvas = makeCanvas(mock.gl);
    renderer = new WebGL2Backend();
    renderer.initialize(canvas);
    renderer.resizeToViewport(VP_W, VP_H, 1);
  });

  it("single visible layer: only firstDraw + final screen pass (no copy)", () => {
    renderer.uploadImage("l1", BITMAP);
    calls.length = 0;
    renderer.render(makeState([makeLayer("l1")], DOC_W, DOC_H));

    const rects = layerRectCalls(calls);
    // 2 quads: firstDraw (doc bounds) + final screen pass (viewport)
    expect(rects).toHaveLength(2);
    expect(rects[0]).toEqual([0, 0, DOC_W, DOC_H]);
    expect(rects[1]).toEqual([0, 0, VP_W, VP_H]);
  });

  it("2 layers: copy pass uses LOGICAL viewport, NOT doc bounds (regression)", () => {
    renderer.uploadImage("top", BITMAP);
    renderer.uploadImage("bot", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState([makeLayer("top"), makeLayer("bot")], DOC_W, DOC_H),
    );

    const rects = layerRectCalls(calls);
    // Order: firstDraw(bot), COPY, composite(top), final
    expect(rects).toHaveLength(4);
    expect(rects[0]).toEqual([0, 0, DOC_W, DOC_H]); // bottom firstDraw
    expect(rects[1]).toEqual([0, 0, VP_W, VP_H]); // COPY (the fix)
    expect(rects[2]).toEqual([0, 0, DOC_W, DOC_H]); // top composite
    expect(rects[3]).toEqual([0, 0, VP_W, VP_H]); // final screen
  });

  it("3 layers: 2 copy passes, each at LOGICAL viewport (no compounding)", () => {
    renderer.uploadImage("l1", BITMAP);
    renderer.uploadImage("l2", BITMAP);
    renderer.uploadImage("l3", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState(
        [makeLayer("l1"), makeLayer("l2"), makeLayer("l3")],
        DOC_W,
        DOC_H,
      ),
    );

    const rects = layerRectCalls(calls);
    // firstDraw(bot=l3), COPY, composite(l2), COPY, composite(l1=top), final
    expect(rects).toHaveLength(6);
    expect(rects[0]).toEqual([0, 0, DOC_W, DOC_H]); // bottom firstDraw
    expect(rects[1]).toEqual([0, 0, VP_W, VP_H]); // copy 1
    expect(rects[2]).toEqual([0, 0, DOC_W, DOC_H]); // composite l2
    expect(rects[3]).toEqual([0, 0, VP_W, VP_H]); // copy 2
    expect(rects[4]).toEqual([0, 0, DOC_W, DOC_H]); // composite top
    expect(rects[5]).toEqual([0, 0, VP_W, VP_H]); // final screen
  });

  it("5 layers: every copy uses LOGICAL viewport — no compounding shrinkage", () => {
    for (const id of ["l1", "l2", "l3", "l4", "l5"]) {
      renderer.uploadImage(id, BITMAP);
    }
    calls.length = 0;
    renderer.render(
      makeState(
        ["l1", "l2", "l3", "l4", "l5"].map((id) => makeLayer(id)),
        DOC_W,
        DOC_H,
      ),
    );

    const rects = layerRectCalls(calls);
    // 1 firstDraw + 4*(copy + composite) + 1 final = 10 rects
    expect(rects).toHaveLength(10);
    // Every odd-indexed rect (copy) must be the viewport, every even-indexed
    // rect (firstDraw or composite) must be doc bounds — except the very last
    // entry which is the final screen pass.
    expect(rects[0]).toEqual([0, 0, DOC_W, DOC_H]); // firstDraw
    for (let i = 1; i < 8; i += 2) {
      expect(rects[i]).toEqual([0, 0, VP_W, VP_H]); // copy
      expect(rects[i + 1]).toEqual([0, 0, DOC_W, DOC_H]); // composite
    }
    expect(rects[9]).toEqual([0, 0, VP_W, VP_H]); // final screen
  });

  it("copy rect is NEVER equal to doc bounds (anti-revert sentinel)", () => {
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState([makeLayer("a"), makeLayer("b")], DOC_W, DOC_H),
    );

    const rects = layerRectCalls(calls);
    const copyRect = rects[1];
    expect(copyRect[2]).not.toBe(DOC_W);
    expect(copyRect[3]).not.toBe(DOC_H);
    expect(copyRect[2]).toBe(VP_W);
    expect(copyRect[3]).toBe(VP_H);
  });

  it("copy CENTER tracks viewport, not doc (companion sentinel)", () => {
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState([makeLayer("a"), makeLayer("b")], DOC_W, DOC_H),
    );

    const centers = layerCenterCalls(calls);
    // Order matches layerRectCalls — index 1 is the copy.
    expect(centers[1]).toEqual([VP_W / 2, VP_H / 2]);
    expect(centers[1]).not.toEqual([DOC_W / 2, DOC_H / 2]);
  });

  it("hidden layer is skipped — no extra copy pass", () => {
    renderer.uploadImage("hidden", BITMAP);
    renderer.uploadImage("visible", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState(
        [makeLayer("hidden", { visible: false }), makeLayer("visible")],
        DOC_W,
        DOC_H,
      ),
    );

    const rects = layerRectCalls(calls);
    // 1 visible layer → only firstDraw + final, no copy
    expect(rects).toHaveLength(2);
  });

  it("layer without uploaded texture is skipped — no extra copy pass", () => {
    renderer.uploadImage("with-tex", BITMAP);
    // "without-tex" intentionally not uploaded
    calls.length = 0;
    renderer.render(
      makeState(
        [makeLayer("with-tex"), makeLayer("without-tex")],
        DOC_W,
        DOC_H,
      ),
    );

    const rects = layerRectCalls(calls);
    expect(rects).toHaveLength(2);
  });

  it("re-renders correctly after viewport resize (no stale logical dims)", () => {
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);

    renderer.resizeToViewport(2000, 1400, 1);
    calls.length = 0;
    renderer.render(
      makeState([makeLayer("a"), makeLayer("b")], DOC_W, DOC_H),
    );

    const rects = layerRectCalls(calls);
    expect(rects[1]).toEqual([0, 0, 2000, 1400]);
    expect(rects[3]).toEqual([0, 0, 2000, 1400]);
  });

  it("re-renders correctly after smaller viewport (shrink without artifacts)", () => {
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);

    renderer.resizeToViewport(400, 300, 1);
    calls.length = 0;
    renderer.render(
      makeState([makeLayer("a"), makeLayer("b")], DOC_W, DOC_H),
    );

    const rects = layerRectCalls(calls);
    expect(rects[1]).toEqual([0, 0, 400, 300]);
  });

  it("DPR > 1 does not leak into copy rect (logical dims, not device pixels)", () => {
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);

    renderer.resizeToViewport(VP_W, VP_H, 2); // dpr=2
    calls.length = 0;
    renderer.render(
      makeState([makeLayer("a"), makeLayer("b")], DOC_W, DOC_H),
    );

    const rects = layerRectCalls(calls);
    // Copy must use LOGICAL viewport, NOT logical*dpr device pixels.
    expect(rects[1]).toEqual([0, 0, VP_W, VP_H]);
    expect(rects[1][2]).not.toBe(VP_W * 2);
    expect(rects[1][3]).not.toBe(VP_H * 2);
  });

  it("doc larger than viewport (zoomed-in) still uses viewport for copy", () => {
    // User zoomed in: doc is larger than viewport. Copy still tracks viewport
    // because the FBO is sized to the viewport, not to doc.
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);
    calls.length = 0;
    renderer.render(makeState([makeLayer("a"), makeLayer("b")], 4000, 3000));

    const rects = layerRectCalls(calls);
    expect(rects[1]).toEqual([0, 0, VP_W, VP_H]);
  });

  it("doc smaller than viewport (zoomed-out) still uses viewport for copy", () => {
    // User zoomed out: doc is tiny inside a big viewport. Copy must cover
    // the WHOLE FBO (viewport-sized) so the empty pasteboard areas are
    // preserved at full FBO resolution — not stretched into doc-region.
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);
    calls.length = 0;
    renderer.render(makeState([makeLayer("a"), makeLayer("b")], 100, 100));

    const rects = layerRectCalls(calls);
    expect(rects[1]).toEqual([0, 0, VP_W, VP_H]);
    // And sentinel: must NOT equal doc.
    expect(rects[1][2]).not.toBe(100);
    expect(rects[1][3]).not.toBe(100);
  });

  it("zero layers: only the empty-state path runs (no copy, no firstDraw)", () => {
    calls.length = 0;
    renderer.render(makeState([], DOC_W, DOC_H));

    const rects = layerRectCalls(calls);
    // No visible layers ⇒ skip both firstDraw branch AND copy.
    // Only the final screen pass might run; but the final pass also depends
    // on visibleLayers.length > 0 (see webgl2.ts:406), so 0 rects expected.
    expect(rects).toHaveLength(0);
  });

  it("calls drawArrays exactly the right number of times for N layers", () => {
    // N=2 → 1 firstDraw + 1 copy + 1 composite + 1 checkerboard + 1 final = 5
    // (or 4 if checkerboard skipped — we enabled it in makeState)
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState([makeLayer("a"), makeLayer("b")], DOC_W, DOC_H),
    );

    // 1 firstDraw + 1 copy + 1 composite + 1 checkerboard quad + 1 final blit
    expect(drawArraysCount(calls)).toBe(5);
  });

  it("calls drawArrays exactly the right number of times for 3 layers", () => {
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);
    renderer.uploadImage("c", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState([makeLayer("a"), makeLayer("b"), makeLayer("c")], DOC_W, DOC_H),
    );

    // 1 firstDraw + 2*(copy + composite) + 1 checkerboard + 1 final = 7
    expect(drawArraysCount(calls)).toBe(7);
  });

  it("non-default layer transform does not leak into the copy rect", () => {
    // Layer has translation+scale; copy should ignore the layer's transform
    // and remain a fullscreen-FBO quad.
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState(
        [
          makeLayer("a", {
            transform: {
              ...DEFAULT_TRANSFORM,
              x: 200,
              y: 150,
              scaleX: 0.5,
              scaleY: 0.5,
            },
          }),
          makeLayer("b"),
        ],
        DOC_W,
        DOC_H,
      ),
    );

    const rects = layerRectCalls(calls);
    // Copy is rects[1] — must be viewport-sized and origin (0,0), regardless
    // of the new layer's transform.
    expect(rects[1]).toEqual([0, 0, VP_W, VP_H]);
  });

  it("layer opacity does not leak into copy rect", () => {
    renderer.uploadImage("a", BITMAP);
    renderer.uploadImage("b", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState(
        [makeLayer("a", { opacity: 0.3 }), makeLayer("b", { opacity: 0.7 })],
        DOC_W,
        DOC_H,
      ),
    );

    const rects = layerRectCalls(calls);
    expect(rects[1]).toEqual([0, 0, VP_W, VP_H]);
  });
});

// ─── Basic adjustment uniform (u_adjustment) wiring ───
// Regression suite for the non-destructive GPU adjustment shader. The
// adjustment is passed as a vec3 uniform and applied during the layer
// composite pass only — the copy pass and final screen blit must NOT re-apply
// it (the adjustment is already baked into the composited FBO).

describe("WebGL2Backend.render — basic adjustment uniform (u_adjustment)", () => {
  const DOC_W = 800;
  const DOC_H = 600;
  const VP_W = 1000;
  const VP_H = 700;
  const BITMAP = { width: DOC_W, height: DOC_H, close: () => {} } as ImageBitmap;

  let renderer: WebGL2Backend;
  let calls: Array<{ method: string; args: any[] }>;

  beforeEach(() => {
    const mock = makeGLMock();
    calls = mock.calls;
    const canvas = makeCanvas(mock.gl);
    renderer = new WebGL2Backend();
    renderer.initialize(canvas);
    renderer.resizeToViewport(VP_W, VP_H, 1);
  });

  it("applies the layer's adjustment uniform during the composite pass (single layer)", () => {
    renderer.uploadImage("l1", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState(
        [makeLayer("l1", { basicAdjustment: { brightness: 25, contrast: 10, saturation: -15 } })],
        DOC_W,
        DOC_H,
      ),
    );

    const adjs = adjustmentCalls(calls);
    // firstDraw into FBO applies the adjustment; final screen blit does not.
    expect(adjs[0]).toEqual([25, 10, -15]);
    expect(adjs[adjs.length - 1]).toEqual([0, 0, 0]);
  });

  it("renders adjustment=0 for a layer without basicAdjustment", () => {
    renderer.uploadImage("l1", BITMAP);
    calls.length = 0;
    renderer.render(makeState([makeLayer("l1")], DOC_W, DOC_H));

    const adjs = adjustmentCalls(calls);
    expect(adjs.every((a) => a[0] === 0 && a[1] === 0 && a[2] === 0)).toBe(true);
  });

  it("applies adjustment only on the composited layer, not on copy/final passes (multi-layer)", () => {
    renderer.uploadImage("top", BITMAP);
    renderer.uploadImage("bot", BITMAP);
    calls.length = 0;
    renderer.render(
      makeState(
        [
          makeLayer("top", { basicAdjustment: { brightness: 40, contrast: 0, saturation: 0 } }),
          makeLayer("bot"),
        ],
        DOC_W,
        DOC_H,
      ),
    );

    const adjs = adjustmentCalls(calls);
    // bottom firstDraw(0), copy(0), top composite(40,0,0), final(0)
    expect(adjs).toEqual([[0, 0, 0], [0, 0, 0], [40, 0, 0], [0, 0, 0]]);
  });
});
