# 02 - Architecture (MVP)

## 1. Architecture Style

Hybrid modular desktop architecture:

- `Shell`: Tauri app + window lifecycle + command bridge.
- `Core`: Rust domain logic for image operations, document state, history.
- `Renderer`: wgpu-based rendering path for canvas/layers/compositing.

## 2. Module Boundaries

### 2.1 Shell (Tauri)

- Owns app lifecycle, file dialogs, OS integration, command routing.
- Must not contain image-processing business logic.

### 2.2 Core (Rust)

- Owns document model, layers, transforms, crop/resize, brush/eraser ops, export pipeline.
- Exposes stable command/query interfaces to shell.

### 2.3 Renderer (wgpu)

- Owns frame rendering, texture upload, compositing previews, viewport transforms.
- Avoids persistence logic and product-level state rules.

## 3. Data Flow

1. UI action triggers shell command.
2. Shell validates and forwards command to core.
3. Core mutates document state and emits patch/event.
4. Renderer consumes state/patch and draws next frame.
5. Shell updates panels/status from core state snapshots.

## 4. Storage Strategy (MVP)

- No complex DB schema required.
- Use lightweight project/document persistence format (detail in TRD).
- Keep autosave strategy bounded for low-memory devices.

## 5. Performance Strategy

- Minimize memory copies across shell/core/renderer boundaries.
- Use tiled or incremental redraw where possible.
- Keep history snapshots bounded by policy.

## 6. Architecture Validation

- Integration tests for shell-core command contracts.
- Render smoke tests for key operations.
- Performance benchmark gate in CI for startup/memory size drift.

## 7. Scalability Strategy

- Scale by capability modules in Rust core:
`document`, `layers`, `selection`, `transform`, `brush`, `export`.
- Keep shell commands thin so adding new tools does not increase UI-shell complexity linearly.
- Use renderer invalidation regions:
redraw only changed tiles/regions instead of full-frame redraw whenever possible.
- Keep PSD/print/plugin features as isolated crates in later milestones to avoid bloating MVP core.

## 8. Maintainability Strategy

- Command-first architecture:
all user edits become explicit commands with typed payloads.
- Single source of truth:
document state lives in Rust core, never duplicated as mutable source in frontend.
- Stable interfaces:
version IPC command payloads and error codes.
- Ownership boundaries:
shell owns OS integration, core owns business logic, renderer owns drawing only.
- ADR discipline:
any new cross-module decision must be recorded in `docs/05-adr/`.

## 9. Security Model (MVP)

- Treat all imported files as untrusted input.
- Enforce path and extension validation before opening or writing files.
- Bound resource usage:
maximum canvas size, layer count guardrails, and memory-pressure fail-fast behavior.
- Fail closed on parser errors:
malformed files should return clear errors without partial unsafe state mutation.
- No plugin execution in MVP path.

## 10. Delivery Sequence

1. Foundation and command contract baseline.
2. Core document + layer workflows.
3. Selection/transform/crop/resize.
4. Brush/eraser.
5. Export and perf hardening.
