# 03 - Technical Requirements Document (TRD)

## 1. Runtime Stack

- Desktop shell: Tauri.
- Core engine (MVP): TypeScript `DocumentEngine`.
- Core engine (future): Rust `photrez-core`.
- Rendering (MVP): WebGL2.
- Rendering (future): wgpu.

## 2. Functional Technical Requirements

### 2.1 Layer Engine

- Support add/delete/reorder/update-opacity operations.
- Deterministic layer composition order.

### 2.2 Selection/Move/Transform

- Rectangular selection baseline.
- Move selected region/layer with predictable snapping rules (if enabled).
- Transform API must support scale, rotate, and flip.

### 2.3 Crop/Resize

- Crop with bounds validation.
- Resize image/canvas with interpolation strategy declared.

### 2.4 Brush/Eraser

- Size control required.
- Opacity and hardness behavior explicitly defined.
- Continuous stroke handling for drag path.

### 2.5 Export

- JPG/PNG/WebP encoders wired in core.
- Quality parameter normalized and validated.

### 2.6 History and Document Defaults

- Undo/redo stack must support at least 50 steps in normal operation.
- Default document color profile for MVP is sRGB.

## 3. Non-Functional Requirements

- Installer `< 80 MB`
- Idle RAM `< 250 MB`
- Startup `< 2s` on target baseline
- Graceful error handling for failed load/export.
- History memory pressure policy must degrade safely without document corruption.

## 4. Command Contract

- Define command names, payload schema, validation errors.
- Version command payloads to reduce breaking changes.
- Include `contract_version` in every command response.
- Use deterministic response envelope:
success `{ ok: true, contract_version, data }`,
error `{ ok: false, contract_version, error: { code, message, details? } }`.
- Detailed command contract specification is defined in:
`docs/15-command-contract-spec.md`.

## 5. Error Handling

- User-facing errors: concise and actionable.
- Internal logs: structured, with operation context.
- No silent failures on save/export.

## 6. Testing Strategy

- Unit tests for core operations (layer, crop, resize, brush, export).
- Contract tests for shell-core command boundaries.
- Render smoke tests for viewport + compositing.
- Performance checks for startup and memory budget.

## 7. Security and Safety

- Validate file paths and extensions at shell boundary.
- Limit file size/memory pressure handling.
- Reject malformed input files safely.

## 8. Delivery Constraints

- Keep dependency set minimal.
- Avoid heavy runtime services.
- Prefer deterministic build and reproducible package output.

## 9. Scalability Requirements

- Core modules must remain capability-based:
`document`, `layers`, `selection`, `transform`, `brush`, `export`.
- New tools must be integrated via typed engine/adapter contracts (TS `DocumentEngine` interface + renderer adapter), not ad hoc shared mutable state. Tauri commands hanya untuk native I/O, bukan editing hot-path.
- Renderer should support region-based invalidation for changed areas.
- Feature expansions (PSD, print checker, plugin runtime) must be added as isolated modules/crates.

## 10. Maintainability Requirements

- **MVP runtime:** TypeScript `DocumentEngine` adalah mutable source of truth untuk document state. Rust `photrez-core` mempertahankan model domain sebagai reference + test coverage.
- **Future target:** Migrasi ke Rust Core sebagai single source of truth saat task eksplisit runtime migration. Kedua source tidak boleh divergen — TS engine harus passing test yang sama dengan Rust core untuk operasi identik.
- Frontend state is limited to UI/view state and must not own pixel/document truth.
- Every command must define:
name, payload schema, validation rules, and deterministic error output.
- Breaking command schema changes require version bump and ADR entry.
- Each MVP feature must include unit/contract tests before release gate completion.

## 11. Security Baseline Requirements

- Input files are treated as untrusted by default.
- File open/save operations must enforce:
allowed paths, allowed extensions, and explicit overwrite behavior.
- Import pipeline must enforce resource guardrails:
max dimensions, max decoded memory budget, and operation timeout strategy.
- On parse/decode failure, app must:
return explicit user-safe error and keep document state unchanged.
- Dependency vulnerability checks must run in CI before release builds.
