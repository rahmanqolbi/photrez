# Brush, Eraser, And Painting

## MRR-BRUSH-001: Paint Behavior Is Split Between UI Hooks And Rendering Helpers

Severity: M2

Likely hard-to-maintain path:

- Brush and eraser behavior spans option bars, cursor overlay, pointer tools, brush overlay hook, brush state, brush-tip masks, smoothing, and stroke renderer.

Why this becomes painful in 6 months:

- Adding pressure, spacing, blend modes, or tablet support will touch many files.
- UI preview and committed bitmap output can drift.

Recommended direction:

- Introduce a typed `PaintStrokeCommand` and a `BrushEngine` boundary.
- Make preview and commit paths consume the same stroke model.
- Keep UI controls as data producers only.

## MRR-BRUSH-002: Performance Optimizations Are Easy To Regress

Severity: M2

Likely hard-to-maintain path:

- Existing decisions mention cached brush-tip alpha masks and performance-sensitive preview paths.
- Stroke behavior depends on spacing, hardness, smoothing, and subpixel stamping.

Why this becomes painful in 6 months:

- Small visual changes can reintroduce lag.
- Tests may compare output pixels but not interactive cost.

Recommended direction:

- Add a brush performance fixture with deterministic stroke length and timing budget.
- Track preview render cost separately from final bitmap commit cost.
- Keep brush mask generation cache behavior explicit and testable.

## MRR-BRUSH-003: Tool State Is Not Yet A First-Class State Machine

Severity: M2

Likely hard-to-maintain path:

- Brush/eraser state is read by pointer handlers, option bars, overlays, and cursor rendering.

Why this becomes painful in 6 months:

- Tool switch behavior can leave orphan preview/cursor/stroke state.
- New brush controls may not reset consistently.

Recommended direction:

- Model brush interaction states explicitly: idle, preview, painting, committed, cancelled.
- Add a tool switch round-trip test for brush -> another tool -> brush.

## MRR-BRUSH-004: Pixel-Level Tests Need Clear Golden Rules

Severity: M3

Likely hard-to-maintain path:

- Brush visual quality tests can become sensitive to small math changes.

Why this becomes painful in 6 months:

- Developers may update expected pixels without understanding visual intent.
- Anti-banding or softness regressions may be accepted accidentally.

Recommended direction:

- Document brush golden cases: hard edge, soft edge, diagonal stroke, subpixel stroke, eraser over alpha.
- Keep tolerance rules explicit.

