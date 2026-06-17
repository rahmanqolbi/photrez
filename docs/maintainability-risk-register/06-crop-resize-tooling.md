# Crop And Resize Tooling

## MRR-CROP-001: Crop UI State Is Dense And Easy To Duplicate

Severity: M1

Likely hard-to-maintain path:

- `CropOptionBar.tsx` is close to 900 lines.
- Crop state includes mode, aspect ratio, target size, unit, guide mode, fill behavior, hidden preview, modern frame, image transform, and GPU camera flags.

Why this becomes painful in 6 months:

- UI changes can accidentally change crop semantics.
- Tests need many context fields to exercise one option.
- It becomes hard to know whether old crop state or modern crop state is authoritative.

Recommended direction:

- Extract crop option state into a typed `CropSettingsModel`.
- Keep UI components shallow and call crop commands.
- Document which state fields are legacy, modern, or compatibility-only.

## MRR-CROP-002: Crop Has Multiple Render And Interaction Paths

Severity: M1

Likely hard-to-maintain path:

- Crop behavior spans `CropOverlay`, `ModernCropOverlay`, crop drag hooks, crop geometry helpers, option bar controls, engine crop operations, and renderer/camera state.

Why this becomes painful in 6 months:

- A bug can be fixed in one overlay path but remain in another.
- GPU camera and CSS/overlay alignment can diverge again.

Recommended direction:

- Choose one authoritative crop interaction model for new work.
- Keep compatibility paths behind named adapters.
- Add a regression suite that runs the same crop scenario through fit, zoom, pan, rotate, and apply.

## MRR-CROP-003: Apply Crop Mixes User Intent, Geometry, And Pixel Mutation

Severity: M2

Likely hard-to-maintain path:

- Crop apply depends on delete-cropped-pixels, target size, rotation, fill background, and bitmap mutation.

Why this becomes painful in 6 months:

- Adding non-destructive crop, presets, or batch operations will require touching several layers.
- History snapshots and pixel mutation rules can become inconsistent.

Recommended direction:

- Define crop apply as a command object with explicit intent fields.
- Add engine-level tests for each command variant.
- Keep UI labels and command semantics in sync through a shared type.

## MRR-CROP-004: Crop Tests Are Large Enough To Become A Maintenance Project

Severity: M2

Likely hard-to-maintain path:

- Crop test files are among the largest in the app.
- Many tests need deep mock setup to reach one behavior.

Why this becomes painful in 6 months:

- Refactoring crop UI will require broad test rewrites.
- Test failures may not indicate whether geometry, UI, or engine behavior broke.

Recommended direction:

- Split crop tests into small layers:
  - geometry,
  - settings model,
  - command behavior,
  - viewport wiring,
  - full user journey.
- Create one official crop test fixture.

