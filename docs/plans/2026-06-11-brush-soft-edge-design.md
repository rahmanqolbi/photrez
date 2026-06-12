# Design Doc: Soft Brush Stroke Rendering using Unified Path (2026-06-11)

## Overview
To prevent the "sausage effect" (where the soft edges of closely spaced overlapping brush stamps accumulate alpha and create a hard edge), we are replacing the stamp-based radial gradient rendering approach with a GPU-accelerated **Unified Path + shadowOffset** approach in Canvas 2D.

## Design Details

### 1. The shadowOffset Technique
To draw a soft brush stroke without overlap accumulation, we:
- Clear the overlay canvas context on every stroke draw frame.
- Draw the entire path of points (`localPoints`) using a single `stroke()` operation.
- Displace the path coordinates by a large offset (e.g. `offsetX = -20000`) so the solid core line is drawn off-screen and is invisible.
- Apply a matching shadow offset to project the soft shadow blur back to the correct canvas coordinates:
  ```typescript
  ctx.shadowColor = color;
  ctx.shadowBlur = blurRadius;
  ctx.shadowOffsetX = 20000;
  ctx.shadowOffsetY = 0;
  ```

### 2. Parameter Mapping (Size & Hardness)
The total width of the stroke (including the soft blur) must align with the brush `settings.size`:
- **Core Line Width**: $W_{\text{core}} = \text{size} \times \text{hardness}$
- **Shadow Blur**: $B = \text{size} \times (1 - \text{hardness})$
- **100% Hardness**: Fallback to drawing a standard solid line without any shadow (`ctx.lineWidth = size`, `ctx.shadowBlur = 0`) to maintain crisp solid rendering.
- **0% Hardness**: Drawn with $W_{\text{core}} = 1$ pixel (minimum possible solid core) and $B = \text{size} - 1$ shadow blur to maximize softness.

### 3. Redraw Strategy
- During drawing, we clear the canvas overlay and redraw the entire stroke from `localPoints[0]` to `localPoints[current]` in a single continuous path.
- For the eraser tool, we clear the offscreen eraser preview canvas, copy the original layer's bitmap, and redraw the entire unified path using `globalCompositeOperation = "destination-out"`.

## Verification Plan
- Verify unit tests in `paintStrokeRenderer.test.ts` pass or update them if they assert the legacy radial gradient behavior.
- Ensure the production build compiles (`pnpm run build`).
- Verify manual brush behavior.
