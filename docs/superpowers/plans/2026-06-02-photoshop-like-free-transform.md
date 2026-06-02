# Photoshop-Like Free Transform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Photrez Move Tool to Photoshop-grade Free Transform behavior.

**Architecture:** Add pure geometry helpers in `viewport/transformGeometry.ts`, update WebGL shader for center-anchored scale+rotate+flip, replace HTML overlay with SVG rotated bounding box, rewire pointer handlers to call helper math, and update cursor resolver.

**Tech Stack:** SolidJS + TypeScript, WebGL2 (via raw WebGL2RenderingContext), Tailwind CSS v4.

---

### Task 1: Transform Geometry Helpers

**Files:**
- Create: `apps/desktop/src/viewport/transformGeometry.ts`
- Create: `apps/desktop/src/__tests__/transform-geometry.test.ts`

- [ ] **Step 1: Write the failing test file**

```typescript
// apps/desktop/src/__tests__/transform-geometry.test.ts
import { describe, it, expect } from "vitest";
import {
  getLayerCenter,
  getLayerCorners,
  getLayerAabb,
  pointToLayerLocal,
  detectHandle,
  applyResizeHandle,
  applyRotationDrag,
  getCursorForHandle,
} from "../viewport/transformGeometry";
import type { Transform2D } from "../engine/types";

const BASE_TRANSFORM: Transform2D = { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false };
const LAYER_W = 200;
const LAYER_H = 100;

function makeLayer(overrides: Partial<Transform2D> = {}) {
  return { transform: { ...BASE_TRANSFORM, ...overrides }, width: LAYER_W, height: LAYER_H } as const;
}

describe("getLayerCenter", () => {
  it("returns center of unrotated layer", () => {
    const c = getLayerCenter(makeLayer());
    expect(c.x).toBe(200);
    expect(c.y).toBe(150);
  });
});

describe("getLayerCorners", () => {
  it("returns 4 corners for unrotated layer", () => {
    const c = getLayerCorners(makeLayer());
    expect(c).toHaveLength(4);
    expect(c[0]).toEqual({ x: 100, y: 100 });  // TL
    expect(c[1]).toEqual({ x: 300, y: 100 });  // TR
    expect(c[2]).toEqual({ x: 300, y: 200 });  // BR
    expect(c[3]).toEqual({ x: 100, y: 200 });  // BL
  });

  it("returns rotated corners for 90-degree rotation", () => {
    const c = getLayerCorners(makeLayer({ rotation: 90 }));
    // After 90° CW around center (200, 150):
    // TL(100,100) -> (250, 50)
    expect(c[0].x).toBeCloseTo(250);
    expect(c[0].y).toBeCloseTo(50);
    // TR(300,100) -> (350, 150)
    expect(c[1].x).toBeCloseTo(350);
    expect(c[1].y).toBeCloseTo(150);
    // BR(300,200) -> (150, 250)
    expect(c[2].x).toBeCloseTo(150);
    expect(c[2].y).toBeCloseTo(250);
    // BL(100,200) -> (50, 150)
    expect(c[3].x).toBeCloseTo(50);
    expect(c[3].y).toBeCloseTo(150);
  });

  it("handles flipped layer", () => {
    const c = getLayerCorners(makeLayer({ flipH: true, flipV: false }));
    // With flipH: TL(100,100) actually becomes TR in document
    // The visual top-left = transform.x + transform.scaleX < 0 ? width : 0
    expect(c[0].x).toBe(100);
    expect(c[0].y).toBe(100);
  });
});

describe("getLayerAabb", () => {
  it("returns unrotated width/height", () => {
    const aabb = getLayerAabb(makeLayer());
    expect(aabb.width).toBe(200);
    expect(aabb.height).toBe(100);
    expect(aabb.x).toBe(100);
    expect(aabb.y).toBe(100);
  });

  it("expands for 45-degree rotation", () => {
    const aabb = getLayerAabb(makeLayer({ rotation: 45 }));
    // sqrt(2)*200 = 282.8, sqrt(2)*100 = 141.4 -> total w/h from rotated corners
    expect(aabb.width).toBeGreaterThan(200);
    expect(aabb.height).toBeGreaterThan(100);
  });
});

describe("pointToLayerLocal", () => {
  it("returns same point for unrotated layer", () => {
    const local = pointToLayerLocal({ x: 150, y: 150 }, makeLayer());
    expect(local.x).toBe(150);
    expect(local.y).toBe(150);
  });

  it("un-rotates point for 90-degree layer", () => {
    // Global point that is right of center -> should be below center in local
    const local = pointToLayerLocal({ x: 250, y: 150 }, makeLayer({ rotation: 90 }));
    // (250,150) - center(200,150) = (50,0), rotated -90° -> (0,-50) -> local(200, 100)
    expect(local.x).toBeCloseTo(200);
    expect(local.y).toBeCloseTo(100);
  });
});

describe("detectHandle", () => {
  const zoom = 1;

  it("returns 'move' when inside unrotated layer", () => {
    const h = detectHandle({ x: 200, y: 150 }, makeLayer(), zoom);
    expect(h).toBe("move");
  });

  it("returns 'se' when near bottom-right corner", () => {
    const h = detectHandle({ x: 298, y: 198 }, makeLayer(), zoom);
    expect(h).toBe("se");
  });

  it("returns 'rotate' when outside corner zone", () => {
    const h = detectHandle({ x: 330, y: 130 }, makeLayer(), zoom);
    expect(h).toBe("rotate");
  });

  it("returns null when far outside", () => {
    const h = detectHandle({ x: 500, y: 500 }, makeLayer(), zoom);
    expect(h).toBeNull();
  });
});

describe("applyResizeHandle", () => {
  it("resizes from SE handle preserving aspect ratio by default", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, false);
    // dx=50 in screen = 50 in local for unrotated
    // newW = 200+50 = 250, aspect = 2, newH = 125
    // scaleX = 250/LAYER_W = 1.25, scaleY = 125/LAYER_H = 1.25
    expect(result.scaleX).toBeCloseTo(1.25);
    expect(result.scaleY).toBeCloseTo(1.25);
  });

  it("allows free scaling with Shift", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, true, false);
    // shift = free, dx=50, dy=0 -> scaleX=1.25, scaleY=1
    expect(result.scaleX).toBeCloseTo(1.25);
    expect(result.scaleY).toBe(1);
  });

  it("scales from center with Alt", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, true);
    // alt => center anchor, so startW += 100 (both sides) and x -= 50
    // newW = 200 + 2*50 = 300, scaleX = 1.5, x = 100 - 50 = 50
    // but with aspect lock: newH = 300/2 = 150, scaleY = 1.5, y = 100 - 25 = 75
    expect(result.scaleX).toBeCloseTo(1.5);
    expect(result.x).toBeCloseTo(50);
  });
});

describe("applyRotationDrag", () => {
  it("returns computed rotation", () => {
    const rot = applyRotationDrag({ x: 200, y: 150 }, { x: 200, y: 150 }, { x: 250, y: 150 }, 0);
    // center(200,150), start(-,-) same as center means delta=0 -> angle = 0 - 0 = 0
    expect(rot).toBe(0);
  });

  it("snaps to 15 degrees with Shift", () => {
    const rot = applyRotationDrag({ x: 200, y: 150 }, { x: 250, y: 50 }, { x: 350, y: 150 }, 0, true);
    // start angle = atan2(-100, 50) ≈ -63.4°, current angle = atan2(0, 150) = 0°
    // delta = 0 - (-63.4) = 63.4°, snapped = 60°
    expect(rot).toBeCloseTo(60);
  });
});

describe("getCursorForHandle", () => {
  it("returns ew-resize for e handle at 0°", () => {
    expect(getCursorForHandle("e", 0, 1, 1)).toBe("ew-resize");
  });
  it("returns ns-resize for n handle at 0°", () => {
    expect(getCursorForHandle("n", 0, 1, 1)).toBe("ns-resize");
  });
  it("rotates with layer at 45°", () => {
    const c = getCursorForHandle("e", 45, 1, 1);
    // base angle 0 + 45 = 45, 45/45 = 1 -> index 1 -> nwse-resize
    expect(c).toBe("nwse-resize");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run transform-geometry`
Expected: FAIL — all tests fail with import errors (file does not exist)

- [ ] **Step 3: Write the geometry helpers**

Create `apps/desktop/src/viewport/transformGeometry.ts`:

```typescript
import type { Transform2D } from "../engine/types";

export interface Point { x: number; y: number; }

const DEG = Math.PI / 180;
const HANDLE_HIT = 16;
const ROTATE_THRESHOLD = 250;

function rotatePoint(point: Point, center: Point, deg: number): Point {
  const rad = deg * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function getLayerCenter(transform: Transform2D, w: number, h: number): Point {
  const effW = w * Math.abs(transform.scaleX);
  const effH = h * Math.abs(transform.scaleY);
  return { x: transform.x + effW / 2, y: transform.y + effH / 2 };
}

export function getLayerCorners(transform: Transform2D, w: number, h: number): Point[] {
  const effW = w * Math.abs(transform.scaleX);
  const effH = h * Math.abs(transform.scaleY);

  const sxSign = Math.sign(transform.scaleX) * (transform.flipH ? -1 : 1);
  const sySign = Math.sign(transform.scaleY) * (transform.flipV ? -1 : 1);

  const effectiveW = sxSign < 0 ? -effW : effW;
  const effectiveH = sySign < 0 ? -effH : effH;

  const rawCorners: Point[] = [
    { x: transform.x, y: transform.y },
    { x: transform.x + effectiveW, y: transform.y },
    { x: transform.x + effectiveW, y: transform.y + effectiveH },
    { x: transform.x, y: transform.y + effectiveH },
  ];

  const center = getLayerCenter(transform, w, h);
  const rot = transform.rotation;
  if (rot === 0) return rawCorners;

  return rawCorners.map((c) => rotatePoint(c, center, rot));
}

export function getLayerAabb(transform: Transform2D, w: number, h: number) {
  const corners = getLayerCorners(transform, w, h);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function pointToLayerLocal(point: Point, transform: Transform2D, w: number, h: number): Point {
  const center = getLayerCenter(transform, w, h);
  return rotatePoint(point, center, -transform.rotation);
}

export function detectHandle(
  point: Point,
  transform: Transform2D,
  w: number,
  h: number,
  zoom: number
): string | null {
  const center = getLayerCenter(transform, w, h);
  const local = rotatePoint(point, center, -transform.rotation);

  const sxSign = Math.sign(transform.scaleX) * (transform.flipH ? -1 : 1);
  const sySign = Math.sign(transform.scaleY) * (transform.flipV ? -1 : 1);
  const effW = w * Math.abs(transform.scaleX);
  const effH = h * Math.abs(transform.scaleY);
  const effectiveX = sxSign < 0 ? transform.x + effW : transform.x;
  const effectiveY = sySign < 0 ? transform.y + effH : transform.y;

  const handleHit = HANDLE_HIT / zoom;
  const rotateThresh = ROTATE_THRESHOLD / zoom;

  const corners: Array<{ id: string; x: number; y: number }> = [
    { id: "nw", x: effectiveX, y: effectiveY },
    { id: "ne", x: effectiveX + effW, y: effectiveY },
    { id: "se", x: effectiveX + effW, y: effectiveY + effH },
    { id: "sw", x: effectiveX, y: effectiveY + effH },
  ];

  for (const c of corners) {
    if (Math.hypot(local.x - c.x, local.y - c.y) <= handleHit) return c.id;
  }

  const sides: Array<{ id: string; x: number; y: number }> = [
    { id: "n", x: effectiveX + effW / 2, y: effectiveY },
    { id: "e", x: effectiveX + effW, y: effectiveY + effH / 2 },
    { id: "s", x: effectiveX + effW / 2, y: effectiveY + effH },
    { id: "w", x: effectiveX, y: effectiveY + effH / 2 },
  ];

  for (const s of sides) {
    if (Math.hypot(local.x - s.x, local.y - s.y) <= handleHit) return s.id;
  }

  const outside =
    local.x < effectiveX - rotateThresh ||
    local.x > effectiveX + effW + rotateThresh ||
    local.y < effectiveY - rotateThresh ||
    local.y > effectiveY + effH + rotateThresh;

  if (outside) {
    const expanded = {
      x: effectiveX - rotateThresh,
      y: effectiveY - rotateThresh,
      w: effW + rotateThresh * 2,
      h: effH + rotateThresh * 2,
    };
    if (
      local.x >= expanded.x &&
      local.x <= expanded.x + expanded.w &&
      local.y >= expanded.y &&
      local.y <= expanded.y + expanded.h
    ) {
      return "rotate";
    }
    return null;
  }

  return "move";
}

export function applyResizeHandle(
  transform: Transform2D,
  layerW: number,
  layerH: number,
  handle: string,
  screenDx: number,
  screenDy: number,
  shiftKey: boolean,
  altKey: boolean
): Transform2D {
  const rad = -transform.rotation * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // rotate screen delta into layer-local space
  const dx = screenDx * cos - screenDy * sin;
  const dy = screenDx * sin + screenDy * cos;

  const sxSign = Math.sign(transform.scaleX) * (transform.flipH ? -1 : 1);
  const sySign = Math.sign(transform.scaleY) * (transform.flipV ? -1 : 1);

  const absSX = Math.abs(transform.scaleX);
  const absSY = Math.abs(transform.scaleY);

  let vw = layerW * absSX;
  let vh = layerH * absSY;
  let vx = sxSign < 0 ? transform.x + vw : transform.x;
  let vy = sySign < 0 ? transform.y + vh : transform.y;

  let localDx = altKey ? dx * 2 : dx;
  let localDy = altKey ? dy * 2 : dy;

  if (handle.includes("e")) vw = Math.max(1, vw + localDx);
  if (handle.includes("w")) {
    const dw = Math.min(vw - 1, -localDx);
    vx -= dw;
    vw += dw;
  }
  if (handle.includes("s")) vh = Math.max(1, vh + localDy);
  if (handle.includes("n")) {
    const dh = Math.min(vh - 1, -localDy);
    vy -= dh;
    vh += dh;
  }

  const corner = ["nw", "ne", "se", "sw"].includes(handle);
  const shouldKeepAspect = corner && !shiftKey;

  if (shouldKeepAspect && vw > 0 && vh > 0) {
    const aspect = (layerW * absSX) / (layerH * absSY);
    if (Math.abs(localDx) > Math.abs(localDy)) {
      const oldVH = vh;
      vh = vw / aspect;
      if (handle.includes("n")) vy -= vh - oldVH;
    } else {
      const oldVW = vw;
      vw = vh * aspect;
      if (handle.includes("w")) vx -= vw - oldVW;
    }
  }

  if (altKey) {
    vx = (sxSign < 0 ? transform.x + layerW * absSX : transform.x) - (vw - layerW * absSX) / 2;
    vy = (sySign < 0 ? transform.y + layerH * absSY : transform.y) - (vh - layerH * absSY) / 2;
  }

  const newCenterX = vx + vw / 2;
  const newCenterY = vy + vh / 2;

  const newSX = sxSign * (Math.abs(transform.scaleX) * (vw / (layerW * absSX)));
  const newSY = sySign * (Math.abs(transform.scaleY) * (vh / (layerH * absSY)));

  return {
    ...transform,
    scaleX: newSX,
    scaleY: newSY,
    x: newCenterX - (newSX * layerW) / 2,
    y: newCenterY - (newSY * layerH) / 2,
  };
}

export function applyRotationDrag(
  center: Point,
  startPoint: Point,
  currentPoint: Point,
  startRotation: number,
  shiftKey = false
): number {
  const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
  const currentAngle = Math.atan2(currentPoint.y - center.y, currentPoint.x - center.x);
  let delta = ((currentAngle - startAngle) * 180) / Math.PI;
  let result = startRotation + delta;
  if (shiftKey) {
    result = Math.round(result / 15) * 15;
  }
  return result;
}

const HANDLE_BASE_ANGLES: Record<string, number> = {
  e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315,
};

const RESIZE_CURSORS = [
  "ew-resize",
  "nwse-resize",
  "ns-resize",
  "nesw-resize",
  "ew-resize",
  "nwse-resize",
  "ns-resize",
  "nesw-resize",
];

export function getCursorForHandle(
  handle: string,
  rotation: number,
  scaleX: number,
  scaleY: number
): string {
  const baseAngle = HANDLE_BASE_ANGLES[handle] ?? 0;
  const visualRotation = scaleX * scaleY < 0 ? -rotation : rotation;
  const totalAngle = (((baseAngle + visualRotation) % 360) + 360) % 360;
  const index = Math.round(totalAngle / 45) % 8;
  return RESIZE_CURSORS[index];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run transform-geometry`
Expected: PASS, all tests green

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/viewport/transformGeometry.ts apps/desktop/src/__tests__/transform-geometry.test.ts
git commit -m "feat(transformGeometry): add pure geometry helpers for free-transform"
```

---

### Task 2: Renderer Applies Real Transform

**Files:**
- Modify: `apps/desktop/src/renderer/shaders.ts`
- Modify: `apps/desktop/src/renderer/webgl2.ts`

- [ ] **Step 1: Back up existing shader source**

No action needed — we are editing in place and know what the old code looks like.

- [ ] **Step 2: Update vertex shader to apply center-anchored scale, flip, rotation**

In `apps/desktop/src/renderer/shaders.ts`:

```typescript
export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform mat4 u_viewProj;
uniform vec4 u_layerRect;   // x, y, width, height in document space (sized, before rotation)
uniform vec2 u_layerCenter; // center of layer (for rotation/flip pivot)
uniform float u_layerRotation; // rotation in degrees, applied around center
uniform vec2 u_flipSign;    // (1,1) normal, (-1,1) flipH, (1,-1) flipV, (-1,-1) both

out vec2 v_texCoord;

void main() {
  vec2 positions[6] = vec2[6](
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0)
  );

  vec2 pos = positions[gl_VertexID];
  v_texCoord = vec2(pos.x, 1.0 - pos.y);

  // Map to layer-local [0..w, 0..h]
  vec2 localPos = pos * u_layerRect.zw;

  // Apply flip (signed scale) in local space
  localPos *= u_flipSign;

  // Offset so pivot is at center for rotation
  vec2 centered = localPos - u_layerRect.zw * 0.5;

  // Rotation matrix
  float rad = radians(u_layerRotation);
  float c = cos(rad);
  float s = sin(rad);
  vec2 rotated = vec2(
    centered.x * c - centered.y * s,
    centered.x * s + centered.y * c
  );

  // Move back, then translate to document position
  vec2 docPos = rotated + u_layerCenter;

  gl_Position = u_viewProj * vec4(docPos, 0.0, 1.0);
}`;
```

- [ ] **Step 3: Update uniform declarations and render loop**

In `apps/desktop/src/renderer/webgl2.ts`, update the `layerUniforms` interface and the `renderLayer` uniforms assignment:

Find the existing `layerUniforms` type (around line 40-70). Replace with:

```typescript
interface ShaderProgram {
  program: WebGLProgram | null;
  uniforms: Record<string, WebGLUniformLocation | null>;
}
```

Find where `this.layerUniforms` locations are being queried (around init) and add the new uniforms:

```typescript
// After existing uniform queries in init():
this.layerUniforms.layerCenter = gl.getUniformLocation(this.layerProgram!, "u_layerCenter");
this.layerUniforms.layerRotation = gl.getUniformLocation(this.layerProgram!, "u_layerRotation");
this.layerUniforms.flipSign = gl.getUniformLocation(this.layerProgram!, "u_flipSign");
```

Note: the interface should be updated to include these fields. Best approach: define the interface fully.

Modify the render loop where `gl.uniform4f(this.layerUniforms.layerRect, ...)` is called (around line 196-202):

```typescript
// Compute layer center and flip sign
const t = renderLayer.transform;
const layerW = renderLayer.width * t.scaleX;
const layerH = renderLayer.height * t.scaleY;
const cx = t.x + layerW / 2;
const cy = t.y + layerH / 2;

gl.uniform4f(
  this.layerUniforms.layerRect,
  t.x, t.y,
  renderLayer.width, renderLayer.height
);
gl.uniform2f(this.layerUniforms.layerCenter, cx, cy);
gl.uniform1f(this.layerUniforms.layerRotation, t.rotation || 0);
gl.uniform2f(
  this.layerUniforms.flipSign,
  t.flipH ? -1 : 1,
  t.flipV ? -1 : 1
);
gl.drawArrays(gl.TRIANGLES, 0, 6);
```

- [ ] **Step 4: Verify the build compiles**

Run: `pnpm.cmd run build`
Expected: SUCCESS (TypeScript + Vite build, any type errors must be fixed)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/shaders.ts apps/desktop/src/renderer/webgl2.ts
git commit -m "feat(renderer): apply center-anchored scale, rotation, and flip in shader"
```

---

### Task 3: SVG Free Transform Overlay

**Files:**
- Modify: `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`

- [ ] **Step 1: Rewrite SelectionTransformOverlay to use SVG**

Replace the entire file content with:

```tsx
import { createSignal, createMemo, Show, For, onMount, onCleanup } from "solid-js";
import { useEditor } from "./EditorContext";
import type { Transform2D } from "@/engine/types";
import {
  getLayerCorners,
  getLayerCenter,
  getLayerAabb,
  detectHandle,
  applyResizeHandle,
  applyRotationDrag,
  getCursorForHandle,
} from "@/viewport/transformGeometry";

interface SelectionTransformOverlayProps {
  isNavigationMode?: boolean;
}

const HANDLE_SIZE = 8;
const HANDLE_HIT = 20;
const ROTATE_OUTER = 24;

export function SelectionTransformOverlay(props: SelectionTransformOverlayProps = {}) {
  const { workspace, activeLayerId, layers, zoom, scheduler, setHoverHandle } = useEditor();

  const activeLayer = createMemo(() => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find((l) => l.id === id) || null;
  });

  const [dragState, setDragState] = createSignal<{
    type: string;
    startX: number;
    startY: number;
    startTransform: Transform2D;
  } | null>(null);

  const getLayer = () => {
    const layer = activeLayer();
    if (!layer || !layer.visible || layer.locked) return null;
    return layer;
  };

  const corners = createMemo(() => {
    const layer = getLayer();
    if (!layer) return [];
    return getLayerCorners(layer.transform, layer.width, layer.height);
  });

  const center = createMemo(() => {
    const layer = getLayer();
    if (!layer) return { x: 0, y: 0 };
    return getLayerCenter(layer.transform, layer.width, layer.height);
  });

  const aabb = createMemo(() => {
    const layer = getLayer();
    if (!layer) return null;
    return getLayerAabb(layer.transform, layer.width, layer.height);
  });

  const rotation = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.transform.rotation : 0;
  });

  const z = createMemo(() => zoom());

  const hs = () => HANDLE_SIZE / z();
  const ht = () => HANDLE_HIT / z();
  const ro = () => ROTATE_OUTER / z();

  const scaleX = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.transform.scaleX : 1;
  });

  const scaleY = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.transform.scaleY : 1;
  });

  const handlePointerDown = (e: PointerEvent, type: string) => {
    if (props.isNavigationMode) return;
    e.stopPropagation();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const layer = getLayer();
    if (!engine || !history || !layer) return;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    history.commit(engine.snapshot());

    setDragState({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startTransform: { ...layer.transform },
    });
  };

  const handlePointerMove = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag) return;

    const engine = workspace.getActiveEngine();
    const layer = getLayer();
    if (!engine || !layer) return;

    const z = zoom();
    const dx = (e.clientX - drag.startX) / z;
    const dy = (e.clientY - drag.startY) / z;

    const cent = getLayerCenter(drag.startTransform, layer.width, layer.height);

    if (drag.type === "move") {
      engine.transformLayer(layer.id, {
        x: drag.startTransform.x + dx,
        y: drag.startTransform.y + dy,
      });
    } else if (drag.type === "rotate") {
      const newRot = applyRotationDrag(
        cent,
        { x: drag.startX / z, y: drag.startY / z },
        { x: e.clientX / z, y: e.clientY / z },
        drag.startTransform.rotation,
        e.shiftKey
      );
      engine.transformLayer(layer.id, { rotation: newRot });
    } else {
      const newTransform = applyResizeHandle(
        drag.startTransform,
        layer.width,
        layer.height,
        drag.type,
        dx,
        dy,
        e.shiftKey,
        e.altKey
      );
      engine.transformLayer(layer.id, newTransform);
    }
    scheduler.requestRender();
  };

  const handlePointerUp = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag) return;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    setDragState(null);
  };

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const drag = dragState();
      if (e.key === "Escape" && drag) {
        const engine = workspace.getActiveEngine();
        const layer = getLayer();
        if (engine && layer) {
          engine.transformLayer(layer.id, drag.startTransform);
          scheduler.requestRender();
        }
        setDragState(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  return (
    <Show when={getLayer()}>
      {(layer) => (
        <svg
          style={{
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            overflow: "visible",
            "pointer-events": props.isNavigationMode ? "none" : "auto",
            "z-index": 40,
          }}
        >
          <g transform={`rotate(${rotation()} ${center().x} ${center().y})`}>
            {/* Bounding box stroke */}
            <Show when={aabb()}>
              {(box) => (
                <rect
                  x={box().x}
                  y={box().y}
                  width={box().width}
                  height={box().height}
                  fill="none"
                  stroke="#E15A17"
                  stroke-width={1 / z()}
                  vector-effect="non-scaling-stroke"
                  style={{ "pointer-events": "none" }}
                />
              )}
            </Show>

            {/* Center pivot dot */}
            <circle
              cx={center().x}
              cy={center().y}
              r={3 / z()}
              fill="#E15A17"
              vector-effect="non-scaling-stroke"
              style={{ "pointer-events": "none" }}
            />

            {/* 8 handles */}
            <For each={[
              { type: "nw", x: layer().transform.x, y: layer().transform.y },
              { type: "n", x: layer().transform.x + (layer().width * Math.abs(scaleX())) / 2, y: layer().transform.y },
              { type: "ne", x: layer().transform.x + layer().width * Math.abs(scaleX()), y: layer().transform.y },
              { type: "e", x: layer().transform.x + layer().width * Math.abs(scaleX()), y: layer().transform.y + (layer().height * Math.abs(scaleY())) / 2 },
              { type: "se", x: layer().transform.x + layer().width * Math.abs(scaleX()), y: layer().transform.y + layer().height * Math.abs(scaleY()) },
              { type: "s", x: layer().transform.x + (layer().width * Math.abs(scaleX())) / 2, y: layer().transform.y + layer().height * Math.abs(scaleY()) },
              { type: "sw", x: layer().transform.x, y: layer().transform.y + layer().height * Math.abs(scaleY()) },
              { type: "w", x: layer().transform.x, y: layer().transform.y + (layer().height * Math.abs(scaleY())) / 2 },
            ]}>
              {(h) => {
                const cursor = getCursorForHandle(h.type, rotation(), scaleX(), scaleY());
                return (
                  <g>
                    {/* Corner rotate zone (only for corners) */}
                    <Show when={["nw", "ne", "se", "sw"].includes(h.type)}>
                      <path
                        d={`M ${h.x} ${h.y - ro()} 
                            A ${ro()} ${ro()} 0 1 1 ${h.x} ${h.y + ro()} 
                            A ${ro()} ${ro()} 0 1 1 ${h.x} ${h.y - ro()} Z
                            M ${h.x} ${h.y - ht()} 
                            A ${ht()} ${ht()} 0 1 0 ${h.x} ${h.y + ht()} 
                            A ${ht()} ${ht()} 0 1 0 ${h.x} ${h.y - ht()} Z`}
                        fill="transparent"
                        fill-rule="evenodd"
                        style={{ cursor: "crosshair", "pointer-events": "all" }}
                        onPointerDown={(e) => handlePointerDown(e, "rotate")}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerEnter={() => setHoverHandle("rotate")}
                        onPointerLeave={() => setHoverHandle(null)}
                      />
                    </Show>

                    {/* Transparent hit zone for resize */}
                    <rect
                      x={h.x - ht() / 2}
                      y={h.y - ht() / 2}
                      width={ht()}
                      height={ht()}
                      fill="transparent"
                      style={{ cursor, "pointer-events": "all" }}
                      onPointerDown={(e) => handlePointerDown(e, h.type)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerEnter={() => setHoverHandle(h.type)}
                      onPointerLeave={() => setHoverHandle(null)}
                    />

                    {/* Visual handle */}
                    <rect
                      x={h.x - hs() / 2}
                      y={h.y - hs() / 2}
                      width={hs()}
                      height={hs()}
                      fill="white"
                      stroke="#E15A17"
                      stroke-width={1 / z()}
                      vector-effect="non-scaling-stroke"
                      style={{ "pointer-events": "none" }}
                    />
                  </g>
                );
              }}
            </For>

            {/* Move hit zone on the box interior */}
            <Show when={aabb()}>
              {(box) => (
                <rect
                  x={box().x}
                  y={box().y}
                  width={box().width}
                  height={box().height}
                  fill="transparent"
                  style={{ cursor: "move", "pointer-events": "all" }}
                  onPointerDown={(e) => handlePointerDown(e, "move")}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerEnter={() => setHoverHandle("move")}
                  onPointerLeave={() => setHoverHandle(null)}
                />
              )}
            </Show>
          </g>
        </svg>
      )}
    </Show>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm.cmd run build`
Expected: SUCCESS. Fix any type errors.

- [ ] **Step 3: Run frontend tests**

Run: `pnpm.cmd --filter photrez-desktop test`
Expected: All existing tests PASS. If any SVG-related test or import breaks, fix.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/editor/SelectionTransformOverlay.tsx
git commit -m "feat(overlay): replace HTML div overlay with SVG rotated bounding box"
```

---

### Task 4: Photoshop-Like Pointer Math (already in Task 1 + Task 3)

The pointer math for resize/rotation is already implemented in `transformGeometry.ts` (`applyResizeHandle`, `applyRotationDrag`) and wired in `SelectionTransformOverlay.tsx`. This task is essentially rolled into Tasks 1 and 3.

- [ ] **Step 1: Verify modifier behavior works**

Manual verification after Task 3:
- Corner resize preserves aspect ratio by default
- Shift + corner = free scaling
- Alt + resize = scale from center
- Rotate snap to 15 degrees with Shift
- Esc reverts to start transform

No additional code changes needed.

---

### Task 5: Dynamic Cursor UX

**Files:**
- Modify: `apps/desktop/src/viewport/cursorResolver.ts`

- [ ] **Step 1: Update cursorResolver to handle rotation-aware resize cursors**

```typescript
export type ToolType = "move" | "selection" | "crop" | "eyedropper" | "brush" | "eraser";
import { getCursorForHandle } from "./transformGeometry";

export interface CursorContext {
  isSpacePressed: boolean;
  isPanning: boolean;
  activeTool: ToolType;
  isAltPressed: boolean;
  hoverHandle: string | null;
  isLayerLocked: boolean;
  eyedropperTarget: string | null;
  /** For rotation-aware cursor: the selected layer's current rotation */
  layerRotation?: number;
  /** For rotation-aware cursor: the selected layer's current scaleX */
  layerScaleX?: number;
  /** For rotation-aware cursor: the selected layer's current scaleY */
  layerScaleY?: number;
}

export function resolveCursor(ctx: CursorContext): string {
  if (ctx.eyedropperTarget) return "crosshair";
  if (ctx.isSpacePressed) return ctx.isPanning ? "grabbing" : "grab";
  if (ctx.isAltPressed && (ctx.activeTool === "brush" || ctx.activeTool === "eraser")) return "crosshair";
  if (ctx.activeTool === "move" && ctx.isLayerLocked) return "default";

  // Rotation-aware resize cursor
  if (ctx.activeTool === "move" && ctx.hoverHandle && ctx.hoverHandle !== "move" && ctx.hoverHandle !== "rotate") {
    return getCursorForHandle(ctx.hoverHandle, ctx.layerRotation ?? 0, ctx.layerScaleX ?? 1, ctx.layerScaleY ?? 1);
  }

  if (ctx.activeTool === "move" && ctx.hoverHandle === "rotate") return "crosshair";
  if (ctx.activeTool === "move" && ctx.hoverHandle === "move") return "move";

  if (ctx.activeTool === "selection") return "crosshair";
  if (ctx.activeTool === "crop") return "crosshair";
  if (ctx.activeTool === "brush" || ctx.activeTool === "eraser") return "none";
  if (ctx.activeTool === "eyedropper") return "copy";
  return "default";
}
```

- [ ] **Step 2: Wire layer rotation/scale into CursorContext from CanvasViewport**

In `CanvasViewport.tsx`, find where `CursorContext` is constructed and add:

```typescript
const layerRotation = createMemo(() => {
  const id = activeLayerId();
  if (!id) return 0;
  const l = layers().find((l) => l.id === id);
  return l ? l.transform.rotation : 0;
});

const layerScaleX = createMemo(() => {
  const id = activeLayerId();
  if (!id) return 1;
  const l = layers().find((l) => l.id === id);
  return l ? l.transform.scaleX : 1;
});

const layerScaleY = createMemo(() => {
  const id = activeLayerId();
  if (!id) return 1;
  const l = layers().find((l) => l.id === id);
  return l ? l.transform.scaleY : 1;
});
```

Then pass them to `CursorContext`:

```typescript
const cursorClass = createMemo(() => resolveCursor({
  isSpacePressed: isSpacePressed(),
  isPanning: isPanning(),
  activeTool: activeTool() as ToolType,
  isAltPressed: isAltPressed(),
  hoverHandle: hoverHandle(),
  isLayerLocked: !!lockedLayer(),
  eyedropperTarget: eyedropperTarget() as string | null,
  layerRotation: layerRotation(),
  layerScaleX: layerScaleX(),
  layerScaleY: layerScaleY(),
}));
```

- [ ] **Step 3: Verify build compiles**

Run: `pnpm.cmd run build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/viewport/cursorResolver.ts apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat(cursor): add rotation-aware resize cursor mapping"
```

---

### Task 6: Snapping Uses Transformed AABB

**Files:**
- Modify: `apps/desktop/src/viewport/smartGuides.ts`
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx` (snap targets)

- [ ] **Step 1: Update `computeSnapAdjustment` to use transformed AABB**

In `smartGuides.ts`, import `getLayerAabb`:

```typescript
import { getLayerAabb } from "./transformGeometry";
```

Replace the existing SnapRect computation with transformed AABB when available:

```typescript
// For each visible non-active layer, use transformed AABB
const targetRects: SnapRect[] = targetLayers.map((l) => {
  const aabb = getLayerAabb(l.transform, l.width, l.height);
  return {
    x: aabb.x,
    y: aabb.y,
    w: aabb.width,
    h: aabb.height,
  };
});
```

And for the moving layer:

```typescript
const movingAabb = getLayerAabb(movingLayer.transform, movingLayer.width, movingLayer.height);
const movingRect: SnapRect = {
  x: movingAabb.x,
  y: movingAabb.y,
  w: movingAabb.width,
  h: movingAabb.height,
};
```

- [ ] **Step 2: Verify snap tests still pass**

Run: `npx vitest run snap-adjustment smart-guides`
Expected: All pass. If a test was hardcoded to old axis-aligned values, update the expectation.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/viewport/smartGuides.ts
git commit -m "feat(snap): use transformed AABB for layer snapping bounds"
```

---

### Task 7: Verification + Docs Updates

**Files:**
- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Run full verification pipeline**

Run: `pnpm.cmd run build`
Expected: SUCCESS

Run: `pnpm.cmd --filter photrez-desktop test`
Expected: All tests PASS

Run: `cargo test -p photrez-core`
Expected: 85/85 PASS (no Rust changes, regression gate only)

- [ ] **Step 2: Update `docs/AI_CURRENT_TASK.md`**

Mark current task as `[COMPLETE]` at the top.

- [ ] **Step 3: Update `docs/AI_HISTORY.md`**

Append entry:

```markdown
---
## [2026-06-02] FEATURE — Photoshop-Like Free Transform for Move Tool [COMPLETE]

### Kategori: FEATURE / VIEWPORT / MOVE TOOL / UX

**Deskripsi:** Implementasi Photoshop-like Free Transform overlay untuk Move Tool. Layer rendering, bounding box, handles, hit testing, cursor, dan resize math semuanya menggunakan true 2D transform. Rotasi, flip, dan scale diterapkan di vertex shader sehingga pixel layer mengikuti transform dengan benar. Bounding box di-render sebagai SVG rotated group, bukan HTML div axis-aligned. Resize handle menggunakan local-axis math, bukan screen-axis. Aspect ratio lock default untuk corner drag, Shift untuk free scaling, Alt untuk center-anchor, dan Esc untuk revert. Cursor resize berubah sesuai sudut handle.

**Files Changed:**
- `apps/desktop/src/viewport/transformGeometry.ts`: NEW — pure geometry helpers (getLayerCenter, getLayerCorners, getLayerAabb, pointToLayerLocal, detectHandle, applyResizeHandle, applyRotationDrag, getCursorForHandle).
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: NEW — unit tests for all geometry helpers.
- `apps/desktop/src/renderer/shaders.ts`: vertex shader now applies center-anchored flip, rotation, and scale.
- `apps/desktop/src/renderer/webgl2.ts`: new uniforms (u_layerCenter, u_layerRotation, u_flipSign) wired into render loop.
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: replaced HTML div box with SVG rotated group, handles, rotate zones, and pointer event routing via geometry helpers.
- `apps/desktop/src/viewport/cursorResolver.ts`: rotation-aware resize cursor mapping; new context fields (layerRotation, layerScaleX, layerScaleY).
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: pass layer rotation/scale to CursorContext.
- `apps/desktop/src/viewport/smartGuides.ts`: snap targets use transformed AABB.

**Verifikasi:**
- ✅ `pnpm.cmd run build`: PASS
- ✅ `pnpm.cmd --filter photrez-desktop test`: ALL PASS
- ✅ `cargo test -p photrez-core`: 85/85 PASS

**Catatan:**
- Multi-layer selection transform (group AABB) masih out of scope.
- Rotated edge-to-edge snapping (per-edge) masih out of scope.
- Committing transformed pixels back to bitmap out of scope — transform tetap 2D affine pada rendered layer.
```

- [ ] **Step 4: Update `docs/FEATURES.md`**

Update the "Selection + Move + Transform" section. Find the row `Transform handles UI (8 resize + 1 rotation)` and update:

```markdown
| ✅ DONE      | Free transform overlay (SVG rotated bounding box, local-axis resize, dynamic cursor) |
```

Or add a new row after the existing transform handles row:

```markdown
| ✅ DONE      | Photoshop-like free transform (rotated SVG overlay, center-anchored render, local-axis resize, aspect-lock, dynamic cursor) |
```

- [ ] **Step 5: Final commit**

```bash
git add docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/FEATURES.md
git commit -m "docs: update task status, history, and features for free transform"
```
