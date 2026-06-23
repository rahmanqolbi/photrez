# Reference-Calibrated Round Brush Hardness Design

**Status:** Approved by user on 2026-06-22; awaiting written-spec review  
**Scope:** Brush and eraser round-tip alpha profile only

## Goal

Make Photrez's round brush hardness follow the measured reference samples supplied by the user. The implementation must preserve the supplied mathematical model rather than retune it by eye.

This work changes the radial alpha profile and finite brush-tip allocation. It does not redesign the brush UI, cursor, spacing, flow accumulation, smoothing, or renderer abstraction.

## Authoritative Calibration

For nominal radius `R`, normalized radius `rNorm = r / R`, and hardness `h` clamped to `[0, 1]`:

```text
alpha(r) = exp(-((rNorm / sigma(h)) ^ n(h)))
```

`sigma(h)` and `n(h)` use monotone cubic Hermite interpolation through the exact supplied samples:

| hardness | sigma | n |
| ---: | ---: | ---: |
| 0.00 | 0.661 | 2.00 |
| 0.10 | 0.738 | 2.68 |
| 0.25 | 0.830 | 4.07 |
| 0.50 | 0.935 | 8.23 |
| 0.75 | 0.990 | 20.22 |
| 0.90 | 1.004 | 51.20 |
| 1.00 | 1.006 | 60.00 |

The interpolation algorithm and endpoint clamping will match the provided `MonotoneCubic` implementation. No fitted replacement constants, linear interpolation, smoothstep profile, or solid-core approximation may substitute for this model.

## Special Cases

1. At `h >= 0.97`, the profile is a literal circle: alpha is one at `rNorm <= 1` and zero outside it.
2. At a render diameter below 22 pixels, the calibrated curve is bypassed. The tip uses a circle with a one-render-pixel antialiased boundary because the measured profile is not reliable at that sampling scale.
3. The small-tip branch is based on render pixels, which currently equal the generated CPU mask pixels. A future zoom-dependent or native backend must pass its actual render diameter rather than reinterpret the calibration.

## Finite Bitmap Support

The calibrated function has an infinite mathematical tail, while the cached tip is an 8-bit bitmap. Photrez will allocate enough support to retain every sample that can round to a nonzero 8-bit alpha value, using the threshold `0.5 / 255`:

```text
supportNorm = sigma * (-ln(0.5 / 255)) ^ (1 / n)
outerRadius = max(R, R * supportNorm)
```

This threshold only determines bitmap bounds. It does not modify, normalize, or taper the supplied alpha formula. Pixels are still evaluated with the exact formula and rounded to 8-bit alpha once. The nominal brush size and cursor remain `2R`; a soft tip may therefore paint a faint measured tail beyond the cursor.

## Architecture

### `brushHardnessProfile.ts`

A focused pure module will own:

- the seven calibration arrays;
- monotone cubic interpolation;
- hardness-to-`sigma`/`n` lookup;
- the exact calibrated alpha function;
- the quantization-aware support-radius calculation;
- constants for the 97% hard-edge and 22px small-tip thresholds.

The module has no DOM, Canvas, SolidJS, or renderer dependency.

### `brushTipMask.ts`

The existing production tip generator remains responsible for rasterization and caching. For the existing `soft` round curve it will:

- use the new calibrated profile for diameters at least 22px and hardness below 97%;
- allocate the dynamic support radius instead of clipping every hardness at `R`;
- use the small-tip one-pixel AA branch below 22px;
- use the literal hard-circle branch at or above 97%;
- keep the existing cache key based on rounded size, hardness percentage, and curve.

Legacy non-`soft` curves remain unchanged because they are test/support APIs, not the active round-brush production path.

### Production Path

`paintStrokeRenderer.ts` already obtains one cached tip with `getBrushTip()` before stamping the stroke. It will continue to stamp that precomputed bitmap for every dab. No exponential or interpolation work will occur per stamp or per stroke point.

The same path serves Brush and Eraser, so both tools receive the calibrated profile without duplicating logic. The WebGL2 compositor remains unchanged because CPU-generated layer pixels are still uploaded through the existing renderer boundary.

## Compatibility and UX

- Brush size continues to mean nominal diameter and continues to control cursor geometry and dab spacing.
- Hardness remains a normalized `[0, 1]` setting surfaced as 0-100% in the existing option bar/context menu.
- Opacity, flow, source-over accumulation, smoothing, history, and stroke lifecycle are unchanged.
- Low-hardness output intentionally invalidates old contracts that required zero alpha at `R` or fixed mask dimensions across hardness.
- No persistent UI surface is added, removed, merged, or relocated.

## Testing

Implementation follows red-green-refactor.

Pure profile tests will cover:

- all seven exact calibration knots;
- endpoint clamping and non-finite/input clamping behavior;
- monotone `sigma` and `n` interpolation;
- exact representative alpha values from the supplied formula;
- the 97% discontinuous hard-edge branch;
- quantization support retaining the last representable alpha and excluding the next samples.

Raster and production tests will cover:

- no flat plateau at hardness 0 for a reliable-size tip;
- measurable alpha at and beyond nominal `R` for hardness 0;
- high hardness remaining opaque through most of `R` and dropping sharply near the edge;
- one-pixel boundary AA for diameters below 22px;
- dynamic mask bounds for soft tips and nominal bounds for hard tips;
- cache identity reuse for equal size/hardness and cache separation after either setting changes;
- a real stamped dab proving the beyond-`R` tail reaches the document mask;
- existing Brush/Eraser mounted pointer-chain coverage remaining green.

A deterministic visual sanity artifact will compare radial profiles and rendered tips at 0%, 50%, 90%, and 100% hardness. It is verification evidence, not a new production UI.

## Verification

Before completion:

1. Run focused profile, tip-mask, brush audit, stroke renderer, and CanvasViewport pointer-chain tests.
2. Run `pnpm.cmd --filter photrez-desktop test`.
3. Run `pnpm.cmd run build`.
4. Run `cargo test -p photrez-core`.
5. Run `cargo test --workspace`.
6. Inspect the deterministic visual sanity output for the four locked hardness levels.
7. Update `AI_CURRENT_TASK.md`, `AI_HISTORY.md`, and `FEATURES.md` without overwriting prior history.

## Non-Goals

- Recalibrating the supplied reference data.
- Adding pressure, tilt, texture, scatter, or brush presets.
- Moving brush rasterization into Rust or a GPU shader.
- Changing spacing, flow accumulation, cursor size, or UI layout.

## Approved Addendum: Terminal Dab Cursor Landing

The user reported that completed drag and Shift-connected strokes visibly stop before the cursor indicator. Investigation confirmed that the 25%-of-size spacing interpolator intentionally retains leftover distance, while commit reuses the existing sampled path without stamping its terminal coordinate. For Size 95 this can leave the final dab almost 24 document pixels—or about 59 screen pixels at 246% zoom—behind the cursor.

The approved correction is endpoint-only finalization:

- keep regular path dabs and their spacing carry unchanged during pointer movement;
- preserve the exact calibrated hardness profile and nominal cursor geometry;
- on pointer-up, include the final constrained/smoothed document coordinate in the stroke;
- before commit, stamp one terminal dab at that exact coordinate only when the regular spacing sequence did not already place one there;
- apply the same rule to Brush, Eraser, freehand drag, Shift-click straight lines, pointer cancel, and lost capture;
- never change `interpolateDabs()` to append every pointer sample, because that would make density event-rate dependent.

Regression coverage must prove both endpoint landing and duplicate suppression when an endpoint already lies on the spacing grid.

## Approved Addendum: Live Terminal Dab Preview

Release-time terminal finalization fixed the committed endpoint but exposed a visual pop: during drag the cursor may lead the last regular dab by almost one spacing interval, then the final cap appears only on pointer-up. The approved UX keeps one non-destructive terminal dab visually attached to the cursor while the pointer is down.

- The permanent stroke mask continues to contain only the initial dab, regular 25%-spaced dabs, and the single finalized endpoint.
- While a stroke is active and its last regular dab differs from the latest sampled point, a transient terminal dab is composited directly into the preview canvas.
- The transient dab is region-scoped to the tip bounds; it does not clone or clear a full-layer mask.
- Every preview refresh starts from the permanent mask/base bitmap, so the previous transient endpoint disappears rather than accumulating.
- Brush and Eraser use identical transient source-over/destination-out math, including opacity and flow.
- If a regular dab already lands at the current endpoint, no duplicate transient dab is drawn.
- Pointer-up still promotes exactly one terminal dab into the permanent mask using the existing finalization contract.

## Approved Addendum: Hardness-Aware Paint Cursor

The user supplied a final visual comparison showing that the single normal paint cursor shrinks modestly as hardness falls. The calibrated brush/eraser alpha and nominal dab size remain unchanged; only the visible cursor contour changes.

- Brush and Eraser use the same hardness-aware cursor calculation.
- Below the 97% hard-edge threshold, the cursor follows the calibrated super-Gaussian alpha contour at `alpha = 0.20`:

  ```text
  cursorRadius = nominalRadius * min(1, sigma(h) * (-ln(0.20)) ^ (1 / n(h)))
  ```

- At hardness 0%, this yields about `0.838 * nominalRadius`. The scale is capped at one so the measured `sigma > 1` knots cannot enlarge the cursor; at or above 97%, the cursor uses the full nominal radius.
- The overlay renders one cursor ring, not an additional inner/outer pair.
- The nominal brush size, dab spacing, mask support, painted output, terminal preview, and center crosshair remain unchanged.
- The cursor helper lives beside the calibrated profile so rendering and cursor geometry share the same interpolation and threshold contract without duplicating constants.

## Approved Addendum: Float Brush-Tip Rasterizer

The existing `brushTipMask.ts` remains the sole production brush-tip path and is refactored in place. No parallel rasterizer or cache is introduced.

- Canonical tips use `{ data: Float32Array, diameter, R_nominal }`; tip alpha remains normalized float through rasterization and bilinear sampling. The existing full-layer `Uint8ClampedArray` accumulation mask and final `ImageData` compositor remain unchanged.
- For calibrated tips at diameter 22px or larger, texture diameter is exactly `ceil(R_nominal * supportNorm) * 2 + 2`. The two extra pixels are an antialiasing margin.
- Texture-space center is `(diameter / 2, diameter / 2)`. Raster samples are evaluated at pixel centers `(x + 0.5, y + 0.5)`, with `rNorm = hypot(dx, dy) / R_nominal`.
- Tips smaller than 22px bypass the super-Gaussian and use a one-pixel antialiased circle with nominal support plus the same two-pixel texture margin.
- `getCachedBrushTip(brushDiameter, hardness)` keys only normalized diameter and hardness. Color and opacity are excluded and applied at composite time.
- Production strokes continue using `getBrushTip(...)`, which delegates soft tips to the exact diameter/hardness canonical cache. Their existing full-layer mask cannot clip tip support; the transient region mask is bounded from the enlarged tip diameter.
- The existing `stampBrushTip(...)` signature preserves source-over per-dab accumulation and bilinear subpixel positioning while reading the single-channel Float32 source.
- `createBrushTip` and `getBrushTip` remain temporary `@deprecated` wrappers over the canonical implementation. Production imports must not use them.
