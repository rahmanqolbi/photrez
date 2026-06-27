# Brush Hardness Distance-Field Soft Edge impl Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Superseded:** This plan is superseded by `docs/superpowers/plans/2026-06-11-brush-tip-mask-engine.md`. The distance-field model fixed the visual hardness semantics, but manual UX review found it can feel laggy because its per-move cost grows with stroke length. Use the brush-tip mask engine plan for new implementation work.

**Goal:** Replace the current `shadowBlur` soft-brush approximation with a deterministic distance-field stroke mask so `hardness=0` produces a full-size feathered brush, without within-stroke alpha accumulation.

**Architecture:** Keep the MVP hot path in the SolidJS/TypeScript editor layer and preserve `useBrushOverlay.ts` as the owner of live preview and commit behavior. Move brush softness math into focused helpers in `paintStrokeRenderer.ts`, or split to `paintStrokeMask.ts` if the implementation becomes large. Render each active stroke as one per-stroke alpha mask where each pixel takes the maximum alpha contribution from the continuous path, then composite that mask once to the overlay/layer.

**Tech Stack:** SolidJS, TypeScript, Vitest, Canvas 2D `ImageData`, `OffscreenCanvas`, existing Photrez `DocumentEngine`, existing brush/eraser overlay flow.

## Context

The current soft brush code in `apps/desktop/src/components/editor/paintStrokeRenderer.ts` uses a unified path plus `shadowOffsetX`/`shadowBlur`:

```ts
const offsetX = -20000;
const coreWidth = Math.round(size * (0.4 + 0.6 * hardness) * 100) / 100;
const blur = Math.round(size * 0.2 * (1 - hardness) * 100) / 100;
ctx.shadowColor = color;
ctx.shadowBlur = blur;
ctx.shadowOffsetX = -offsetX;
ctx.lineWidth = coreWidth;
ctx.moveTo(points[0].x + offsetX, points[0].y);
```

This avoids stamp overlap, but it makes soft brush visual size depend on browser shadow behavior. At `hardness=0`, the brush still has a 40% solid core plus a Gaussian-ish shadow, so it can look like a smaller solid stroke with blur rather than a full-diameter feathered brush.

The new model must keep the important property of the unified path: during one pointer drag, overlapping parts of the same stroke must not repeatedly add alpha. The correct rule is max-alpha within a stroke, then one composite pass to the destination.

## File Structure

- Modify: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
  - Owns public paint rendering entrypoint and can host small math helpers.
  - Add pure helpers for distance-to-segment and hardness falloff.
  - Replace the `shadowBlur` soft branch with distance-field mask rendering.
- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`
  - Replace shadow-attribute tests with alpha-profile tests.
  - Keep existing hard brush, eraser composite, flow, and context restore tests.
- Optional split if `paintStrokeRenderer.ts` becomes noisy: `apps/desktop/src/components/editor/paintStrokeMask.ts`
  - Owns pure mask math and exports helpers used by `paintStrokeRenderer.ts`.
  - Use only if the renderer file grows beyond a readable single responsibility.
- Modify: `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`
  - Optional: show the inner hardness ring only for `hardness > 0`; for `hardness=0`, the absence of the inner ring is correct because the whole radius is feather.
  - If manual review shows ambiguity, add a faint center marker or update tests, but do not change UI styling without explicit approval.
- Modify: `docs/AI_CURRENT_TASK.md`
  - Mark task as active before code work and complete after verification.
- Modify: `docs/AI_HISTORY.md`
  - Append a BUG FIX entry with root cause, rationale, files changed, and verification.
- Modify: `docs/FEATURES.md`
  - Update Brush + Eraser row from `Soft edge rendering via unified path & shadowOffset falloff` to distance-field mask wording after implementation.

## Rendering Model

For each stroke point path:

1. Clamp `size`, `hardness`, `opacity`, and `flow` through existing `PaintToolSettings`.
2. Compute:

```ts
const radius = settings.size / 2;
const hardRadius = radius * settings.hardness;
const featherRadius = Math.max(0.0001, radius - hardRadius);
const strokeAlpha = settings.opacity * settings.flow;
```

3. For each pixel in a padded bounding box around the stroke path, compute distance from pixel center to the nearest segment or endpoint.
4. Convert distance to alpha:

```ts
export function brushAlphaAtDistance(distance: number, radius: number, hardness: number): number {
  if (distance >= radius) return 0;
  const hardRadius = radius * hardness;
  if (distance <= hardRadius) return 1;
  const feather = radius - hardRadius;
  if (feather <= 0) return 1;
  const t = (distance - hardRadius) / feather;
  return 1 - smoothstep01(t);
}

export function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
```

5. Use max-alpha within the current stroke:

```ts
maskAlpha = Math.max(maskAlpha, brushAlphaAtDistance(distance, radius, hardness) * strokeAlpha);
```

6. Composite the finished mask once:
   - Brush: source color over destination using mask alpha.
   - Eraser: reduce destination alpha using mask alpha via `destination-out` semantics.
   - Preserve existing lock-transparency behavior in `useBrushOverlay.ts`; do not move that policy into mask math.

## Task 1: Add Pure Brush Alpha and Geometry Tests

- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`
- Modify: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`

- [ ] **Step 1: Write failing tests for hardness falloff math**

Add tests near the top of `paintStrokeRenderer.test.ts`:

```ts
import {
  brushAlphaAtDistance,
  distanceToSegment,
  smoothstep01,
} from "../paintStrokeRenderer";

describe("brush hardness falloff", () => {
  it("maps smoothstep from 0 to 1", () => {
    expect(smoothstep01(-1)).toBe(0);
    expect(smoothstep01(0)).toBe(0);
    expect(smoothstep01(1)).toBe(1);
    expect(smoothstep01(2)).toBe(1);
    expect(smoothstep01(0.5)).toBeCloseTo(0.5, 5);
  });

  it("feathers the entire radius when hardness is 0", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(0, radius, 0)).toBe(1);
    expect(brushAlphaAtDistance(25, radius, 0)).toBeCloseTo(0.5, 5);
    expect(brushAlphaAtDistance(49, radius, 0)).toBeGreaterThan(0);
    expect(brushAlphaAtDistance(50, radius, 0)).toBe(0);
  });

  it("keeps a solid center up to the hardness radius", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(24, radius, 0.5)).toBe(1);
    expect(brushAlphaAtDistance(25, radius, 0.5)).toBe(1);
    expect(brushAlphaAtDistance(37.5, radius, 0.5)).toBeCloseTo(0.5, 5);
    expect(brushAlphaAtDistance(50, radius, 0.5)).toBe(0);
  });

  it("is solid until the outer edge when hardness is 1", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(0, radius, 1)).toBe(1);
    expect(brushAlphaAtDistance(49.9, radius, 1)).toBe(1);
    expect(brushAlphaAtDistance(50, radius, 1)).toBe(0);
  });
});

describe("distanceToSegment", () => {
  it("measures perpendicular distance to a horizontal segment", () => {
    expect(distanceToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3, 5);
  });

  it("measures distance to the nearest endpoint outside a segment", () => {
    expect(distanceToSegment(13, 4, 0, 0, 10, 0)).toBeCloseTo(5, 5);
  });

  it("handles zero-length segments as points", () => {
    expect(distanceToSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(5, 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected: FAIL because `brushAlphaAtDistance`, `distanceToSegment`, and `smoothstep01` are not exported yet.

- [ ] **Step 3: Add pure helper implementation**

Add these exports to `paintStrokeRenderer.ts` after `buildStrokeDabs`:

```ts
export function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function brushAlphaAtDistance(distance: number, radius: number, hardness: number): number {
  if (radius <= 0 || distance >= radius) return 0;
  const clampedHardness = Math.max(0, Math.min(1, hardness));
  const hardRadius = radius * clampedHardness;
  if (distance <= hardRadius) return 1;
  const feather = radius - hardRadius;
  if (feather <= 0) return 1;
  return 1 - smoothstep01((distance - hardRadius) / feather);
}

export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return Math.hypot(px - cx, py - cy);
}
```

- [ ] **Step 4: Run helper tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected: helper tests PASS, existing shadow tests still PASS until rendering is changed.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add apps/desktop/src/components/editor/paintStrokeRenderer.ts apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts
git commit -m "test: define brush hardness falloff math"
```

## Task 2: Implement Distance-Field Stroke Mask Rendering

- Modify: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`

- [ ] **Step 1: Add failing tests for no shadowBlur usage in soft branch**

Replace the existing tests named `uses shadow offset when hardness is less than 1`, `sets core width and blur when hardness is 0`, and `draws a single dot using arc with offset for 1-point stroke (hardness=0.5)` with tests that verify the soft branch uses pixel data instead of shadow attributes.

Use this mock pattern:

```ts
function createImageDataMock(width: number, height: number): ImageData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb",
  } as ImageData;
}

it("renders soft brush without Canvas shadowBlur", () => {
  const imageData = createImageDataMock(80, 80);
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    globalCompositeOperation: "",
    globalAlpha: 1,
    canvas: { width: 80, height: 80 },
    getImageData: vi.fn(() => imageData),
    putImageData: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D;

  renderPaintStrokeToContext(
    ctx,
    [{ x: 20, y: 40 }, { x: 60, y: 40 }],
    { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
    "#ff0000",
    false,
  );

  expect(ctx.putImageData).toHaveBeenCalledTimes(1);
  expect(ctx.stroke).not.toHaveBeenCalled();
  expect((ctx as unknown as { shadowBlur: number }).shadowBlur).toBe(0);
});
```

Add alpha sampling assertion for the center and feather:

```ts
it("keeps hardness 0 visible across the full brush diameter", () => {
  const imageData = createImageDataMock(40, 40);
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    globalCompositeOperation: "",
    globalAlpha: 1,
    canvas: { width: 40, height: 40 },
    getImageData: vi.fn(() => imageData),
    putImageData: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  renderPaintStrokeToContext(
    ctx,
    [{ x: 20, y: 20 }],
    { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
    "#ff0000",
    false,
  );

  const written = (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ImageData;
  const alphaAt = (x: number, y: number) => written.data[(y * written.width + x) * 4 + 3];
  expect(alphaAt(20, 20)).toBe(255);
  expect(alphaAt(25, 20)).toBeGreaterThan(90);
  expect(alphaAt(29, 20)).toBeGreaterThan(0);
  expect(alphaAt(30, 20)).toBe(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected: FAIL because soft rendering still uses shadow path and does not call `putImageData`.

- [ ] **Step 3: Add color parsing helper for mask compositing**

Add:

```ts
export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parsePaintColor(color: string): RgbaColor {
  const rgba = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    return {
      r: Math.max(0, Math.min(255, Number(rgba[1]))),
      g: Math.max(0, Math.min(255, Number(rgba[2]))),
      b: Math.max(0, Math.min(255, Number(rgba[3]))),
      a: rgba[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgba[4]))),
    };
  }

  const hex = color.replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}
```

- [ ] **Step 4: Add path bounds and nearest distance helpers**

Add:

```ts
interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getStrokeBounds(points: StrokePoint[], radius: number, canvasWidth: number, canvasHeight: number): Bounds | null {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    minX: Math.max(0, Math.floor(minX - radius - 1)),
    minY: Math.max(0, Math.floor(minY - radius - 1)),
    maxX: Math.min(canvasWidth, Math.ceil(maxX + radius + 1)),
    maxY: Math.min(canvasHeight, Math.ceil(maxY + radius + 1)),
  };
}

function distanceToStrokePath(px: number, py: number, points: StrokePoint[]): number {
  if (points.length === 1) return Math.hypot(px - points[0].x, py - points[0].y);
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    minDistance = Math.min(minDistance, distanceToSegment(px, py, prev.x, prev.y, next.x, next.y));
  }
  return minDistance;
}
```

- [ ] **Step 5: Add soft render function**

Add:

```ts
function renderSoftStrokeToImageData(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  settings: PaintToolSettings,
  color: string,
  isEraser: boolean,
): void {
  const canvas = ctx.canvas;
  const radius = settings.size / 2;
  const bounds = getStrokeBounds(points, radius, canvas.width, canvas.height);
  if (!bounds || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) return;

  const imageData = ctx.getImageData(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const data = imageData.data;
  const paint = parsePaintColor(color);
  const strokeAlpha = Math.max(0, Math.min(1, settings.opacity * settings.flow * paint.a));

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const docX = bounds.minX + x + 0.5;
      const docY = bounds.minY + y + 0.5;
      const distance = distanceToStrokePath(docX, docY, points);
      const alpha = brushAlphaAtDistance(distance, radius, settings.hardness) * strokeAlpha;
      if (alpha <= 0) continue;

      const idx = (y * imageData.width + x) * 4;
      if (isEraser) {
        data[idx + 3] = Math.round(data[idx + 3] * (1 - alpha));
        continue;
      }

      const dstA = data[idx + 3] / 255;
      const outA = alpha + dstA * (1 - alpha);
      if (outA <= 0) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      data[idx] = Math.round((paint.r * alpha + data[idx] * dstA * (1 - alpha)) / outA);
      data[idx + 1] = Math.round((paint.g * alpha + data[idx + 1] * dstA * (1 - alpha)) / outA);
      data[idx + 2] = Math.round((paint.b * alpha + data[idx + 2] * dstA * (1 - alpha)) / outA);
      data[idx + 3] = Math.round(outA * 255);
    }
  }

  ctx.putImageData(imageData, bounds.minX, bounds.minY);
}
```

- [ ] **Step 6: Replace soft branch in `renderPaintStrokeToContext`**

Replace the `const offsetX = -20000;` branch with:

```ts
  renderSoftStrokeToImageData(ctx, points, settings, color, isEraser);
```

Keep the existing `hardness >= 1` branch unchanged for crisp hard brush rendering.

- [ ] **Step 7: Run focused tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

Run:

```powershell
git add apps/desktop/src/components/editor/paintStrokeRenderer.ts apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts
git commit -m "fix: render soft brush with distance field mask"
```

## Task 3: Guard Against Within-Stroke Alpha Accumulation

- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`
- Modify: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`

- [ ] **Step 1: Add failing test for max-alpha behavior at overlapping segments**

Add:

```ts
it("does not accumulate alpha where one stroke path overlaps itself", () => {
  const imageData = createImageDataMock(80, 80);
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    globalCompositeOperation: "",
    globalAlpha: 1,
    canvas: { width: 80, height: 80 },
    getImageData: vi.fn(() => imageData),
    putImageData: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  renderPaintStrokeToContext(
    ctx,
    [
      { x: 20, y: 40 },
      { x: 60, y: 40 },
      { x: 20, y: 40 },
      { x: 60, y: 40 },
    ],
    { size: 20, hardness: 0, opacity: 0.5, flow: 1, smoothing: 0 },
    "#ff0000",
    false,
  );

  const written = (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ImageData;
  const alphaAt = (x: number, y: number) => written.data[(y * written.width + x) * 4 + 3];
  expect(alphaAt(40, 40)).toBeLessThanOrEqual(128);
  expect(alphaAt(40, 40)).toBeGreaterThan(110);
});
```

This test protects the main user concern: repeated coverage inside the same stroke must not turn a soft stroke into a harder, opaque result.

- [ ] **Step 2: Run test**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected: PASS if Task 2 already computes one nearest-path alpha per pixel. If it fails because alpha is composited more than once per segment, refactor `renderSoftStrokeToImageData` so each pixel calls `distanceToStrokePath` once and composites once.

- [ ] **Step 3: Add helper-level test if needed**

If the previous test fails, add this smaller test around `distanceToStrokePath` by exporting it:

```ts
expect(distanceToStrokePath(40, 40, [
  { x: 20, y: 40 },
  { x: 60, y: 40 },
  { x: 20, y: 40 },
])).toBeCloseTo(0, 5);
```

- [ ] **Step 4: Commit Task 3**

Run:

```powershell
git add apps/desktop/src/components/editor/paintStrokeRenderer.ts apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts
git commit -m "test: prevent soft brush alpha accumulation"
```

## Task 4: Preserve Eraser and Lock Transparency Behavior

- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`
- Inspect: `apps/desktop/src/components/editor/useBrushOverlay.ts`

- [ ] **Step 1: Add eraser alpha mask test**

Add:

```ts
it("uses distance-field alpha for soft eraser", () => {
  const imageData = createImageDataMock(40, 40);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = 255;
    imageData.data[i + 1] = 0;
    imageData.data[i + 2] = 0;
    imageData.data[i + 3] = 255;
  }
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    globalCompositeOperation: "",
    globalAlpha: 1,
    canvas: { width: 40, height: 40 },
    getImageData: vi.fn(() => imageData),
    putImageData: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  renderPaintStrokeToContext(
    ctx,
    [{ x: 20, y: 20 }],
    { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
    "rgba(0,0,0,1)",
    true,
  );

  const written = (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ImageData;
  const alphaAt = (x: number, y: number) => written.data[(y * written.width + x) * 4 + 3];
  expect(alphaAt(20, 20)).toBe(0);
  expect(alphaAt(25, 20)).toBeGreaterThan(0);
  expect(alphaAt(25, 20)).toBeLessThan(255);
});
```

- [ ] **Step 2: Verify `useBrushOverlay.ts` still handles lock transparency**

Confirm this block remains after soft rendering:

```ts
if (layer.lockTransparency && layer.imageBitmap) {
  overlayCtx.globalCompositeOperation = "destination-in";
  overlayCtx.drawImage(layer.imageBitmap, 0, 0);
  overlayCtx.globalCompositeOperation = "source-over";
}
```

Do not move lock transparency into `paintStrokeRenderer.ts`; it is a layer policy, not brush math.

- [ ] **Step 3: Run focused tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected: PASS.

- [ ] **Step 4: Commit Task 4**

Run:

```powershell
git add apps/desktop/src/components/editor/paintStrokeRenderer.ts apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts
git commit -m "test: preserve soft eraser falloff"
```

## Task 5: Performance Guard and Fallback

- Modify: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`

- [ ] **Step 1: Add bounded-region test**

Add a test ensuring the renderer only reads/writes the path bounding box, not the whole canvas:

```ts
it("limits soft stroke image data work to the stroke bounds", () => {
  const imageData = createImageDataMock(24, 24);
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    globalCompositeOperation: "",
    globalAlpha: 1,
    canvas: { width: 500, height: 500 },
    getImageData: vi.fn(() => imageData),
    putImageData: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  renderPaintStrokeToContext(
    ctx,
    [{ x: 50, y: 50 }],
    { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
    "#ff0000",
    false,
  );

  expect(ctx.getImageData).toHaveBeenCalledWith(39, 39, 22, 22);
  expect(ctx.putImageData).toHaveBeenCalledWith(imageData, 39, 39);
});
```

If the exact width/height differs by one due to rounding, adjust only after checking the actual bounds formula; the test should still enforce a small bounded region around the stroke.

- [ ] **Step 2: Add bailout for extremely large work areas**

If manual performance is poor for very large brushes, add a conservative fallback inside `renderSoftStrokeToImageData`:

```ts
const area = imageData.width * imageData.height;
if (area > 4_000_000) {
  drawShadowFallback(ctx, points, settings, color, isEraser);
  return;
}
```

Only add `drawShadowFallback` if profiling shows the distance-field path is too slow for giant brushes. The preferred MVP path is deterministic distance-field rendering.

- [ ] **Step 3: Run tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected: PASS.

- [ ] **Step 4: Commit Task 5**

Run:

```powershell
git add apps/desktop/src/components/editor/paintStrokeRenderer.ts apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts
git commit -m "perf: bound soft brush mask rendering"
```

## Task 6: Manual Visual QA

- Inspect: `apps/desktop/src/components/editor/BrushOptionBar.tsx`
- Inspect: `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`
- Run app: `pnpm.cmd tauri dev`

- [ ] **Step 1: Start the desktop app**

Run:

```powershell
pnpm.cmd tauri dev
```

Expected: Photrez launches.

- [ ] **Step 2: Verify hardness 0 at size 100**

Manual steps:

1. Open a test image or blank document.
2. Select Brush Tool.
3. Set Size `100`, Hardness `0`, Strength `100`, Flow `100`, Smooth `0`.
4. Draw a single straight stroke over a high-contrast background.

Expected:

- The visible stroke fills the cursor diameter as a feathered mark.
- The center is strongest.
- The edge fades smoothly to transparent.
- The result does not look like a narrow solid stripe with blur.
- No visible repeated circular dab pattern appears along the stroke.

- [ ] **Step 3: Verify hardness 50 and 100**

Manual steps:

1. Set Hardness `50`.
2. Draw a second stroke.
3. Set Hardness `100`.
4. Draw a third stroke.

Expected:

- Hardness `50` has a clear solid center and feathered edge.
- Hardness `100` remains crisp and solid.
- Cursor outer radius still matches the visible stroke diameter.

- [ ] **Step 4: Verify eraser parity**

Manual steps:

1. Paint a solid colored region.
2. Select Eraser.
3. Set Size `100`, Hardness `0`, Strength `100`, Flow `100`.
4. Erase across the colored region.

Expected:

- Eraser feather matches brush feather.
- No repeated circular eraser artifacts appear.
- Partial alpha edges remain smooth.

- [ ] **Step 5: Capture screenshots for review**

Store screenshots in the normal manual QA location used by the project, or attach them to the task thread. Do not commit screenshots unless the project already tracks manual QA artifacts for this area.

## Task 7: Documentation Updates

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/decisions/id-decision-log.md`

- [ ] **Step 1: Update `FEATURES.md`**

In Brush + Eraser, replace:

```md
| âœ… DONE      | Soft edge rendering via unified path & shadowOffset falloff (no alpha accumulation) |
```

with:

```md
| âœ… DONE      | Soft edge rendering via per-stroke distance-field alpha mask (full-diameter hardness=0 feather, no within-stroke alpha accumulation) |
```

- [ ] **Step 2: Append `AI_HISTORY.md` entry**

Append near the top:

```md
## [2026-06-11] BUG FIX â€” Brush Hardness Distance-Field Soft Edge [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / RENDERER / UX

**Root Cause:**
The previous `shadowBlur` soft-brush approximation prevented dab overlap accumulation, but it delegated softness and visible diameter to browser shadow rendering. At `hardness=0`, Photrez still drew a substantial solid core plus blur, which made the brush look smaller than the cursor instead of producing a full-diameter feathered brush.

**Fix Rationale:**
Render each soft stroke as a deterministic distance-field alpha mask. Hardness controls the solid inner radius, the outer radius always remains `size / 2`, and pixels inside the feather band use smoothstep falloff. Each pixel is composited once per stroke based on nearest path distance, preventing within-stroke alpha buildup.

**Rincian Perubahan:**
1. `paintStrokeRenderer.ts` â€” Added hardness falloff helpers and distance-field mask rendering for soft brush/eraser strokes.
2. `paintStrokeRenderer.test.ts` â€” Added alpha-profile, overlap, eraser, and bounded-region regression tests.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run`
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1`
- PASS: `cargo test --workspace`
```

- [ ] **Step 3: Update `AI_CURRENT_TASK.md`**

Mark the task complete and include actual verification results from the implementation run.

- [ ] **Step 4: Update decision log**

Append:

```md
## Tambahan Keputusan 2026-06-11

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Brush hardness rendering | Soft brush/eraser hardness uses a deterministic per-stroke distance-field alpha mask in the TypeScript MVP hot path. Browser `shadowBlur` is not the primary softness model because it makes perceived diameter and feather behavior browser-dependent. | Planned 2026-06-11 |
```

- [ ] **Step 5: Verify markdown encoding and diff**

Run:

```powershell
git diff -- docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/FEATURES.md docs/decisions/id-decision-log.md
```

Expected: textual diff only. If Git reports `Binary files differ`, stop and fix encoding before continuing.

- [ ] **Step 6: Commit Task 7**

Run:

```powershell
git add docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/FEATURES.md docs/decisions/id-decision-log.md
git commit -m "docs: record brush hardness mask rendering"
```

## Full Verification Gate

Run after all implementation tasks:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
pnpm.cmd run build
pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1
cargo test --workspace
```

Expected:

- Focused brush renderer tests PASS.
- Frontend production build PASS.
- Frontend test suite PASS.
- Rust workspace tests PASS or any unrelated pre-existing Rust failure is documented with exact failure text.

Manual app-level check:

```powershell
pnpm.cmd tauri dev
```

Expected: App launches; manual brush QA in Task 6 passes.

## Risks and Mitigations

- **Risk: CPU cost for large brushes.** Mitigation: render only the stroke bounding box and keep a documented fallback threshold if profiling proves it necessary.
- **Risk: alpha math differs from Canvas `source-over`.** Mitigation: test color/alpha output and use standard source-over formula inside the mask composite.
- **Risk: eraser preview diverges from brush preview.** Mitigation: route both through the same mask renderer with only the composite operation changed.
- **Risk: lock transparency behavior changes.** Mitigation: keep lock-transparency clipping in `useBrushOverlay.ts`, after the overlay stroke is rendered.
- **Risk: hard brush loses crispness.** Mitigation: preserve the existing `hardness >= 1` Canvas path stroke branch.

## Self-Review

- Spec coverage: The plan covers the visual bug (`hardness=0` too small), the alpha accumulation concern, brush and eraser parity, performance bounding, docs, and verification.
- Placeholder scan: No task contains unresolved placeholder tokens or unspecified implementation steps.
- Type consistency: The plan uses existing `StrokePoint`, `PaintToolSettings`, `renderPaintStrokeToContext`, and `CanvasRenderingContext2D` naming from the current code.
- Scope check: This is one subsystem: brush/eraser soft-edge rendering. It does not change UI layout, presets, document truth, export, or WebGL compositor behavior.
