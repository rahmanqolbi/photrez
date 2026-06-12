# Design Doc: Smoothstep Brush Falloff Curve

## Context
The brush/eraser soft curve previously used a direct linear distance interpolation raised to an exponent: `Math.pow(clamp01(v), 0.7 + 0.6 * h)`. This created a discontinuity in the gradient slope at the boundaries (outer edge and inner hard core), causing a visual "sharp disk inside a soft glow" look.

## Proposed Changes
We will map the normalized distance `v` using a Hermite interpolation / Smoothstep function `3v^2 - 2v^3` to ensure that the slope (derivative) of the falloff is 0 at both boundaries, producing a perfectly smooth gradient matching professional brush engines.

### [brushTipMask.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/brushTipMask.ts)
Change the `"soft"` curve interpolation in `brushAlphaAtDistance` to:
```typescript
  const v = 1 - t;
  const vMapped = 3 * v * v - 2 * v * v * v;
  const rawAlpha = curve === "soft"
    ? Math.pow(clamp01(vMapped), 0.7 + 0.6 * h)
    : falloff(v, curve);
```

## Verification Plan
1. Run Vitest tests to ensure all pixel profile tests and brush/eraser tests pass.
2. Build the production build to ensure compilation is correct.
