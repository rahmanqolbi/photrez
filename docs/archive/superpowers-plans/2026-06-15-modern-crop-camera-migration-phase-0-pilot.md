# Modern Crop CSS Path → Camera Image Transform — Phase 0 Pilot Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `ViewportCamera` with image transform state and `getViewProjectionMatrix()` that composes camera + image transform. No Modern Crop migration yet — just add the building blocks and verify math via golden tests.

**Architecture:** The existing `getViewProjectionMatrix()` produces an ortho + camera matrix in NDC. We extend it to optionally include an image transform (T(pivot_screen) · R(rotation) · S(zoom·imageScale) · T(-pivot_document)) for Modern Crop. When image transform is identity (no pivots), the matrix is unchanged.

**Tech Stack:** TypeScript, Vitest, SolidJS, ViewportCamera class (existing)

**Spec:** `docs/superpowers/specs/2026-06-15-modern-crop-camera-migration-design.md`

**Verification gate:**
- All 982+ frontend tests pass
- `pnpm run build` hijau
- Pre-commit pipeline green

**Bug-fixing process:** When a bug is found, use the `systematic-debugging` skill to identify root cause before patching.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/desktop/src/viewport/viewportCamera.ts` | Modify | Add `ImageTransformState` interface, `imageTransform` field, `setImageTransform`/`getImageTransform`/`resetImageTransform` methods, refactor `getViewProjectionMatrix` to compose |
| `apps/desktop/src/__tests__/viewportCamera.test.ts` | Modify | Add 7+ new unit tests for image transform behavior with golden math assertions |

No new files created. No dependencies added. No public API changes to existing callers.

---

## Background: VP Matrix Math (Reference for Tests)

Existing camera matrix (no image transform):
```
m[0]  = (2 * zoom) / w;        // scale X
m[5]  = (-2 * zoom) / h;       // scale Y (Y-flip for screen)
m[10] = 1;
m[12] = -1 + (pan.x * 2) / w;  // pan X in NDC
m[13] =  1 + (pan.y * -2) / h; // pan Y in NDC (Y-flip)
m[15] = 1;
```

New composite matrix (with image transform):
- m[0]  =  (2 * zoom * imageScale * cos(rot)) / w
- m[1]  = -(2 * zoom * imageScale * sin(rot)) / h
- m[4]  = -(2 * zoom * imageScale * sin(rot)) / w
- m[5]  = -(2 * zoom * imageScale * cos(rot)) / h
- m[12] = -1 + (2/w) * (zoom*imageScale*(-cos*pd.x + sin*pd.y) + ps.x + pan.x)
- m[13] =  1 + (2/h) * (zoom*imageScale*(sin*pd.x + cos*pd.y) - ps.y - pan.y)

Where `pd = pivot_document`, `ps = pivot_screen`. When both pivots are null, image transform is identity and the matrix reduces to existing camera-only matrix.

---

## Task 1: Add `ImageTransformState` interface and `imageTransform` field

**Files:**
- Modify: `apps/desktop/src/viewport/viewportCamera.ts:1-10` (add interface), `:21-28` (add field)

- [ ] **Step 1: Add `ImageTransformState` interface at top of file**

In `apps/desktop/src/viewport/viewportCamera.ts`, add after the existing `CameraState` interface (around line 7):

```ts
export interface ImageTransformState {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  pivotScreen: { x: number; y: number } | null;
  pivotDocument: { x: number; y: number } | null;
}
```

- [ ] **Step 2: Add `imageTransform` field to `ViewportCamera` class**

In `apps/desktop/src/viewport/viewportCamera.ts`, inside the class definition, add after the `viewportHeight` field (around line 24):

```ts
  private imageTransform: ImageTransformState = {
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1.0,
    pivotScreen: null,
    pivotDocument: null,
  };
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/desktop; pnpm.cmd exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run existing tests to verify nothing broke**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts`
Expected: All existing tests pass (no behavior change yet)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/viewport/viewportCamera.ts
git commit -m "feat(camera): add ImageTransformState interface and field"
```

---

## Task 2: TDD — `setImageTransform` and `getImageTransform`

**Files:**
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`
- Modify: `apps/desktop/src/viewport/viewportCamera.ts`

- [ ] **Step 1: Add failing test for `setImageTransform`**

At the end of the `describe("ViewportCamera", ...)` block in `apps/desktop/src/__tests__/viewportCamera.test.ts`, add:

```ts
  it("setImageTransform stores state retrievable via getImageTransform", () => {
    camera.setImageTransform({
      offsetX: 10,
      offsetY: 20,
      rotation: 30,
      scale: 1.5,
      pivotScreen: { x: 100, y: 200 },
      pivotDocument: { x: 50, y: 60 },
    });

    const t = camera.getImageTransform();
    expect(t.offsetX).toBe(10);
    expect(t.offsetY).toBe(20);
    expect(t.rotation).toBe(30);
    expect(t.scale).toBe(1.5);
    expect(t.pivotScreen).toEqual({ x: 100, y: 200 });
    expect(t.pivotDocument).toEqual({ x: 50, y: 60 });
  });

  it("getImageTransform returns a copy (mutating result does not affect camera)", () => {
    camera.setImageTransform({ offsetX: 5 });
    const t = camera.getImageTransform();
    t.offsetX = 999;
    expect(camera.getImageTransform().offsetX).toBe(5);
  });

  it("setImageTransform defaults unspecified fields to identity", () => {
    camera.setImageTransform({ offsetX: 10 });

    const t = camera.getImageTransform();
    expect(t.offsetX).toBe(10);
    expect(t.offsetY).toBe(0);
    expect(t.rotation).toBe(0);
    expect(t.scale).toBe(1.0);
    expect(t.pivotScreen).toBeNull();
    expect(t.pivotDocument).toBeNull();
  });
```

- [ ] **Step 2: Run the new tests — expect FAIL**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "setImageTransform"`

Expected: FAIL with "setImageTransform is not a function"

- [ ] **Step 3: Add `setImageTransform` and `getImageTransform` methods**

In `apps/desktop/src/viewport/viewportCamera.ts`, add the methods to the class (after `getViewportSize` or near the other state methods):

```ts
  public setImageTransform(t: Partial<ImageTransformState>): void {
    this.imageTransform = {
      offsetX: t.offsetX ?? 0,
      offsetY: t.offsetY ?? 0,
      rotation: t.rotation ?? 0,
      scale: t.scale ?? 1.0,
      pivotScreen: t.pivotScreen ?? null,
      pivotDocument: t.pivotDocument ?? null,
    };
  }

  public getImageTransform(): ImageTransformState {
    return { ...this.imageTransform };
  }
```

- [ ] **Step 4: Run the new tests — expect PASS**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "setImageTransform"`

Expected: All 3 new tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/viewport/viewportCamera.ts apps/desktop/src/__tests__/viewportCamera.test.ts
git commit -m "feat(camera): add setImageTransform and getImageTransform methods"
```

---

## Task 3: TDD — `resetImageTransform`

**Files:**
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`
- Modify: `apps/desktop/src/viewport/viewportCamera.ts`

- [ ] **Step 1: Add failing test for `resetImageTransform`**

Add after the previous test block in `apps/desktop/src/__tests__/viewportCamera.test.ts`:

```ts
  it("resetImageTransform returns state to identity (default)", () => {
    camera.setImageTransform({
      offsetX: 10,
      offsetY: 20,
      rotation: 30,
      scale: 1.5,
      pivotScreen: { x: 100, y: 200 },
      pivotDocument: { x: 50, y: 60 },
    });
    camera.resetImageTransform();

    const t = camera.getImageTransform();
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
    expect(t.rotation).toBe(0);
    expect(t.scale).toBe(1.0);
    expect(t.pivotScreen).toBeNull();
    expect(t.pivotDocument).toBeNull();
  });
```

- [ ] **Step 2: Run the test — expect FAIL**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "resetImageTransform"`

Expected: FAIL with "resetImageTransform is not a function"

- [ ] **Step 3: Add `resetImageTransform` method**

In `apps/desktop/src/viewport/viewportCamera.ts`, add after `getImageTransform`:

```ts
  public resetImageTransform(): void {
    this.setImageTransform({});
  }
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "resetImageTransform"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/viewport/viewportCamera.ts apps/desktop/src/__tests__/viewportCamera.test.ts
git commit -m "feat(camera): add resetImageTransform method"
```

---

## Task 4: TDD — `getViewProjectionMatrix` with identity image transform (sanity check)

**Files:**
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`
- Modify: `apps/desktop/src/viewport/viewportCamera.ts`

- [ ] **Step 1: Add failing test for identity case**

Add to the test file:

```ts
  it("getViewProjectionMatrix with identity image transform matches camera-only matrix", () => {
    camera.setState({ x: 100, y: 50, zoom: 2.0 });

    // Without image transform
    const m1 = camera.getViewProjectionMatrix(800, 600);

    // With identity image transform (explicit empty set)
    camera.setImageTransform({});
    const m2 = camera.getViewProjectionMatrix(800, 600);

    expect(m2).toEqual(m1);
  });

  it("getViewProjectionMatrix with null pivots matches camera-only matrix", () => {
    camera.setState({ x: 100, y: 50, zoom: 2.0 });

    const m1 = camera.getViewProjectionMatrix(800, 600);

    camera.setImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1.0,
      pivotScreen: null,
      pivotDocument: null,
    });
    const m2 = camera.getViewProjectionMatrix(800, 600);

    expect(m2).toEqual(m1);
  });
```

- [ ] **Step 2: Run the new tests — expect PASS already (because current behavior matches identity)**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "identity image transform"`

Expected: PASS (the current implementation always produces camera-only matrix; setting image transform has no effect on the matrix yet)

- [ ] **Step 3: No implementation needed yet — these tests are sanity checks**

These tests document the expected behavior. They pass because the current `getViewProjectionMatrix` ignores the image transform (which is correct for the identity case).

- [ ] **Step 4: Commit tests**

```bash
git add apps/desktop/src/__tests__/viewportCamera.test.ts
git commit -m "test(camera): add identity image transform sanity tests"
```

---

## Task 5: TDD — `getViewProjectionMatrix` with offset-only image transform

**Files:**
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`
- Modify: `apps/desktop/src/viewport/viewportCamera.ts`

- [ ] **Step 1: Add failing test for offset-only case**

Add to the test file:

```ts
  it("getViewProjectionMatrix with image transform offset shifts matrix translation by offset in screen pixels", () => {
    camera.setState({ x: 0, y: 0, zoom: 1.0 });

    // Camera-only matrix
    const m1 = camera.getViewProjectionMatrix(800, 600);
    expect(m1[12]).toBeCloseTo(-1, 5); // -1 + 0

    // With offsetX = 50, no pivots (image transform reduces to offset)
    camera.setImageTransform({
      offsetX: 50,
      offsetY: 0,
      pivotScreen: null,
      pivotDocument: null,
    });
    const m2 = camera.getViewProjectionMatrix(800, 600);

    // m2[12] should be -1 + (pan.x + offsetX) * 2 / canvasW = -1 + 50*2/800 = -0.875
    expect(m2[12]).toBeCloseTo(-0.875, 5);
    // Other translation components unchanged for this test
    expect(m2[13]).toBeCloseTo(m1[13], 5);
  });
```

- [ ] **Step 2: Run the test — expect FAIL**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "offset shifts matrix translation"`

Expected: FAIL — current matrix returns -1 (camera-only), not -0.875

- [ ] **Step 3: Refactor `getViewProjectionMatrix` to support image transform**

In `apps/desktop/src/viewport/viewportCamera.ts`, replace the existing `getViewProjectionMatrix` method with:

```ts
  public getViewProjectionMatrix(canvasW?: number, canvasH?: number): Float32Array {
    if (canvasW !== undefined) this.viewportWidth = canvasW;
    if (canvasH !== undefined) this.viewportHeight = canvasH;

    const { x, y, zoom } = this.current;
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    const m = new Float32Array(16);

    const it = this.imageTransform;

    // Identity case: pivot is null → use existing camera-only matrix
    if (it.pivotScreen === null || it.pivotDocument === null) {
      m[0]  = (2 * zoom) / w;
      m[5]  = (-2 * zoom) / h;
      m[10] = 1;
      m[12] = -1 + (x * 2) / w;
      m[13] =  1 + (y * -2) / h;
      m[15] = 1;
      return m;
    }

    // Composite matrix: camera + image transform
    // M = T(pan) * T(pivotScreen) * R(rotation) * S(zoom*imageScale) * T(-pivotDocument)
    const zs = zoom * it.scale;
    const cosR = Math.cos((it.rotation * Math.PI) / 180);
    const sinR = Math.sin((it.rotation * Math.PI) / 180);
    const pd = it.pivotDocument;
    const ps = it.pivotScreen;
    const totalOffsetX = it.offsetX;
    const totalOffsetY = it.offsetY;

    // For now, offset is applied as a translation in screen pixel space,
    // combined with pivot screen translation.
    m[0]  =  (2 * zs * cosR) / w;
    m[1]  = -(2 * zs * sinR) / h;
    m[4]  = -(2 * zs * sinR) / w;
    m[5]  = -(2 * zs * cosR) / h;
    m[10] = 1;
    m[12] = -1 + (2 / w) * (zs * (-cosR * pd.x + sinR * pd.y) + ps.x + x + totalOffsetX);
    m[13] =  1 + (2 / h) * (zs * (sinR * pd.x + cosR * pd.y) - ps.y - y - totalOffsetY);
    m[15] = 1;

    return m;
  }
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "offset shifts matrix translation"`

Expected: PASS

- [ ] **Step 5: Verify all existing camera tests still pass (regression check)**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts`

Expected: All tests pass (including the new ones)

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/viewport/viewportCamera.ts apps/desktop/src/__tests__/viewportCamera.test.ts
git commit -m "feat(camera): getViewProjectionMatrix composes image transform"
```

---

## Task 6: TDD — `getViewProjectionMatrix` with scale + pivot (golden test)

**Files:**
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`
- Modify: `apps/desktop/src/viewport/viewportCamera.ts` (if not already from Task 5)

- [ ] **Step 1: Add golden test for scale + pivot**

Add to the test file:

```ts
  it("getViewProjectionMatrix with image transform scale + pivot: pivot maps to NDC center, scaled point maps correctly", () => {
    // Setup: 1000x1000 canvas, pivot at (500, 500) screen and doc (canvas center)
    // Scale = 2 (zoom = 1)
    camera.setState({ x: 0, y: 0, zoom: 1.0 });
    camera.setImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 2.0,
      pivotScreen: { x: 500, y: 500 },
      pivotDocument: { x: 500, y: 500 },
    });

    const m = camera.getViewProjectionMatrix(1000, 1000);

    // Expected matrix (golden values from derivation in spec §6):
    // m[0] = (2 * 1 * 2 * cos(0)) / 1000 = 0.004
    expect(m[0]).toBeCloseTo(0.004, 5);
    // m[1] = -(2 * 1 * 2 * sin(0)) / 1000 = 0
    expect(m[1]).toBeCloseTo(0, 5);
    // m[4] = -(2 * 1 * 2 * sin(0)) / 1000 = 0
    expect(m[4]).toBeCloseTo(0, 5);
    // m[5] = -(2 * 1 * 2 * cos(0)) / 1000 = -0.004
    expect(m[5]).toBeCloseTo(-0.004, 5);
    // m[12] = -1 + (2/1000) * (1*2*(-cos(0)*500 + sin(0)*500) + 500 + 0)
    //       = -1 + 0.002 * (-1000 + 500) = -1 - 1 = -2
    expect(m[12]).toBeCloseTo(-2, 5);
    // m[13] = 1 + (2/1000) * (1*2*(sin(0)*500 + cos(0)*500) - 500 - 0)
    //       = 1 + 0.002 * (1000 - 500) = 1 + 1 = 2
    expect(m[13]).toBeCloseTo(2, 5);

    // Pivot itself should map to NDC origin
    // ndc.x = m[0] * 500 + m[4] * 500 + m[12] = 0.004*500 + 0 + (-2) = 0
    expect(m[0] * 500 + m[4] * 500 + m[12]).toBeCloseTo(0, 5);
    // ndc.y = m[1] * 500 + m[5] * 500 + m[13] = 0 + -0.004*500 + 2 = 0
    expect(m[1] * 500 + m[5] * 500 + m[13]).toBeCloseTo(0, 5);

    // Doc point (700, 500) (200 right of pivot in doc space)
    // After scale=2, this becomes (400, 0) offset from pivot in doc space,
    // then translated by pivot_screen (500, 500) → (900, 500) screen pixels
    // NDC: (900*2/1000 - 1, -500*2/1000 + 1) = (0.8, 0)
    expect(m[0] * 700 + m[4] * 500 + m[12]).toBeCloseTo(0.8, 5);
    expect(m[1] * 700 + m[5] * 500 + m[13]).toBeCloseTo(0, 5);
  });
```

- [ ] **Step 2: Run the test — expect PASS (already implemented in Task 5)**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "scale + pivot"`

Expected: PASS

- [ ] **Step 3: If failing, debug the matrix math**

Common issues:
- Sign error in m[1] or m[4] (rotation direction)
- Off-by-one in m[12]/m[13] formulas
- Wrong factor (forgot zoom in scale, or used imageScale instead of zoom*imageScale)

Use the manual verification formula in the test comment to trace.

- [ ] **Step 4: Commit tests**

```bash
git add apps/desktop/src/__tests__/viewportCamera.test.ts
git commit -m "test(camera): golden test for scale + pivot image transform"
```

---

## Task 7: TDD — `getViewProjectionMatrix` with rotation + pivot (golden test)

**Files:**
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`

- [ ] **Step 1: Add golden test for rotation + pivot**

Add to the test file:

```ts
  it("getViewProjectionMatrix with image transform rotation + pivot: doc point rotates around pivot", () => {
    // Setup: 1000x1000 canvas, pivot at (500, 500), rotation 90°
    camera.setState({ x: 0, y: 0, zoom: 1.0 });
    camera.setImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 90,
      scale: 1.0,
      pivotScreen: { x: 500, y: 500 },
      pivotDocument: { x: 500, y: 500 },
    });

    const m = camera.getViewProjectionMatrix(1000, 1000);

    // Expected matrix values for 90° rotation:
    // cos(90°) = 0, sin(90°) = 1
    // m[0] = (2 * 1 * 1 * 0) / 1000 = 0
    expect(m[0]).toBeCloseTo(0, 5);
    // m[1] = -(2 * 1 * 1 * 1) / 1000 = -0.002
    expect(m[1]).toBeCloseTo(-0.002, 5);
    // m[4] = -(2 * 1 * 1 * 1) / 1000 = -0.002
    expect(m[4]).toBeCloseTo(-0.002, 5);
    // m[5] = -(2 * 1 * 1 * 0) / 1000 = 0
    expect(m[5]).toBeCloseTo(0, 5);
    // m[12] = -1 + 0.002 * (1*(-0*500 + 1*500) + 500) = -1 + 0.002 * 1000 = -1 + 2 = 1
    expect(m[12]).toBeCloseTo(1, 5);
    // m[13] = 1 + 0.002 * (1*(1*500 + 0*500) - 500) = 1 + 0.002 * 0 = 1
    expect(m[13]).toBeCloseTo(1, 5);

    // Pivot maps to NDC center: ndc.x = 0*500 + -0.002*500 + 1 = 0, ndc.y = -0.002*500 + 0*500 + 1 = 0
    expect(m[0] * 500 + m[4] * 500 + m[12]).toBeCloseTo(0, 5);
    expect(m[1] * 500 + m[5] * 500 + m[13]).toBeCloseTo(0, 5);

    // Doc point (700, 500) (200 right of pivot in doc space)
    // After T(-pivot_doc) = (200, 0)
    // After scale=1, rotation=90°: (cos*200 - sin*0, sin*200 + cos*0) = (0, 200)
    // After T(pivot_screen) = (500, 700) screen pixels
    // NDC: (500*2/1000 - 1, -700*2/1000 + 1) = (0, -0.4)
    expect(m[0] * 700 + m[4] * 500 + m[12]).toBeCloseTo(0, 5);
    expect(m[1] * 700 + m[5] * 500 + m[13]).toBeCloseTo(-0.4, 5);
  });
```

- [ ] **Step 2: Run the test — expect PASS**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "rotation + pivot"`

Expected: PASS

- [ ] **Step 3: If failing, debug rotation direction**

If doc (700, 500) maps to (0, -0.4) but the test expects (0, +0.4), the rotation direction is reversed. Verify by manually computing:
- After 90° CCW rotation: (x, y) → (-y, x). For (200, 0) → (0, 200). ✓
- Screen Y is down, so +Y in screen is "down". After rotation, the point is at screen (500, 700) which is below the pivot.
- NDC Y for screen Y=700: -700*2/1000 + 1 = -0.4 ✓

- [ ] **Step 4: Commit tests**

```bash
git add apps/desktop/src/__tests__/viewportCamera.test.ts
git commit -m "test(camera): golden test for rotation + pivot image transform"
```

---

## Task 8: TDD — `getViewProjectionMatrix` with combined image transform

**Files:**
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`

- [ ] **Step 1: Add test for combined scale + rotation + offset + camera pan**

Add to the test file:

```ts
  it("getViewProjectionMatrix composes image transform with camera pan", () => {
    // Camera with pan and image transform with rotation + scale
    camera.setState({ x: 100, y: 50, zoom: 1.0 });
    camera.setImageTransform({
      offsetX: 20,
      offsetY: 0,
      rotation: 45,
      scale: 1.5,
      pivotScreen: { x: 500, y: 500 },
      pivotDocument: { x: 400, y: 400 },
    });

    const m = camera.getViewProjectionMatrix(1000, 1000);

    // Golden values for combined case:
    // zs = 1 * 1.5 = 1.5
    // cos(45°) = sin(45°) = 0.7071
    const expected_m0 = (2 * 1.5 * Math.cos(Math.PI / 4)) / 1000;
    const expected_m1 = -(2 * 1.5 * Math.sin(Math.PI / 4)) / 1000;
    const expected_m4 = -(2 * 1.5 * Math.sin(Math.PI / 4)) / 1000;
    const expected_m5 = -(2 * 1.5 * Math.cos(Math.PI / 4)) / 1000;
    expect(m[0]).toBeCloseTo(expected_m0, 5);
    expect(m[1]).toBeCloseTo(expected_m1, 5);
    expect(m[4]).toBeCloseTo(expected_m4, 5);
    expect(m[5]).toBeCloseTo(expected_m5, 5);

    // Verify translation components combine pan + image transform
    // m[12] = -1 + (2/1000) * (1.5 * (-cos*400 + sin*400) + 500 + 100 + 20)
    //       = -1 + 0.002 * (1.5 * 0 + 620) = -1 + 1.24 = 0.24
    const expected_m12 = -1 + 0.002 * (1.5 * 0 + 500 + 100 + 20);
    expect(m[12]).toBeCloseTo(expected_m12, 5);

    // m[13] = 1 + (2/1000) * (1.5 * (sin*400 + cos*400) - 500 - 50 - 0)
    //       = 1 + 0.002 * (1.5 * 565.6854 - 550) = 1 + 0.002 * 298.53 = 1.597
    const expected_m13 = 1 + 0.002 * (1.5 * (Math.sin(Math.PI / 4) * 400 + Math.cos(Math.PI / 4) * 400) - 500 - 50);
    expect(m[13]).toBeCloseTo(expected_m13, 5);
  });
```

- [ ] **Step 2: Run the test — expect PASS**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "composes image transform with camera pan"`

Expected: PASS

- [ ] **Step 3: If failing, debug combined composition**

Most likely issues:
- Pan is not added correctly in m[12]/m[13]
- Offset is not added correctly
- Pivot + offset interaction is wrong

- [ ] **Step 4: Commit tests**

```bash
git add apps/desktop/src/__tests__/viewportCamera.test.ts
git commit -m "test(camera): golden test for combined image transform composition"
```

---

## Task 9: TDD — Reset returns matrix to camera-only

**Files:**
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`

- [ ] **Step 1: Add test for reset behavior**

Add to the test file:

```ts
  it("resetImageTransform causes getViewProjectionMatrix to return camera-only matrix", () => {
    camera.setState({ x: 100, y: 50, zoom: 2.0 });

    // With image transform set
    camera.setImageTransform({
      scale: 1.5,
      rotation: 30,
      pivotScreen: { x: 400, y: 300 },
      pivotDocument: { x: 400, y: 300 },
    });
    const m1 = camera.getViewProjectionMatrix(800, 600);
    // m1 should include image transform (not equal to camera-only)

    // Reset
    camera.resetImageTransform();
    const m2 = camera.getViewProjectionMatrix(800, 600);

    // m2 should equal camera-only matrix
    expect(m2[0]).toBeCloseTo(0.005, 5); // 2*2/800
    expect(m2[12]).toBeCloseTo(-0.75, 5); // -1 + 200/800
  });
```

- [ ] **Step 2: Run the test — expect PASS**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts -t "resetImageTransform causes getViewProjectionMatrix"`

Expected: PASS

- [ ] **Step 3: Commit tests**

```bash
git add apps/desktop/src/__tests__/viewportCamera.test.ts
git commit -m "test(camera): resetImageTransform returns camera-only matrix"
```

---

## Task 10: Verify all tests + build green

**Files:**
- None (verification step)

- [ ] **Step 1: Run full camera test file**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/__tests__/viewportCamera.test.ts`

Expected: All tests pass (was 11, now 11 + 9 new = 20)

- [ ] **Step 2: Run full frontend test suite**

Run: `pnpm.cmd --filter photrez-desktop test --run`

Expected: 991/991 tests pass (was 982, +9 new for image transform)

- [ ] **Step 3: Run production build**

Run: `pnpm.cmd run build`

Expected: tsc + Vite production build succeed

- [ ] **Step 4: If anything fails, debug using systematic-debugging skill**

If a test fails:
1. Use the systematic-debugging skill to identify root cause
2. Fix with smallest change
3. Re-run

- [ ] **Step 5: No commit needed (all commits were per-task)**

Verify git log shows 9 commits for Phase 0:
```
$ git log --oneline -10
... (Phase 0 commits)
eb8b326 docs: record overlay container screen-space migration completion
85b28ba refactor: migrate overlay container to screen-space positioning
```

---

## Self-Review

**1. Spec coverage:**
- §5 Target State A (ImageTransformState + setImageTransform + getImageTransform + resetImageTransform + getViewProjectionMatrix with image transform): covered by Tasks 1-9
- §8 Phase 0 (Pilot) — extend camera, math verification: covered by all 10 tasks
- §9 Test Strategy — 7 unit tests for camera with image transform: covered (we have 9 tests, more than the 5-7 planned)
- §11 Feature flag — not in Phase 0 (will be added in Phase 1)
- §12 Verification pipeline — Task 10

**2. Placeholder scan:**
- No TBD, TODO, "fill in details"
- All test code blocks are complete
- All implementation code blocks are complete
- No "Similar to Task N" — each test is fully specified

**3. Type consistency:**
- `ImageTransformState` interface used consistently across all tasks
- `setImageTransform`, `getImageTransform`, `resetImageTransform` signatures consistent
- `getViewProjectionMatrix` signature unchanged
- `pivotScreen` and `pivotDocument` consistently named (both null for identity)

**Gaps identified:** None.

---

## Execution

Recommend inline execution (this session) because:
- 1 file modified (viewportCamera.ts)
- 1 test file modified (viewportCamera.test.ts)
- 10 tasks, each 2-5 min
- Pure math work, no UI integration yet
- Phase 0 is the pilot — must pass before Phase 1 can start

**Run inline:** Start with Task 1, proceed sequentially. Pause after Task 10 for user review before Phase 1.
