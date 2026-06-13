# 02 - Architecture (MVP)

> **Catatan 2026-06-02:** Dokumen ini mendeskripsikan arsitektur target. Untuk deskripsi runtime MVP saat ini, lihat **Section 11 â€” MVP Runtime Reality** di bawah.

## 1. Architecture Style

Hybrid modular desktop architecture:

- `Shell`: Tauri app + window lifecycle + command bridge.
- `Core`: Rust domain logic for image operations, document state, history (future target).
- `Renderer`: wgpu-based rendering path for canvas/layers/compositing (future target).

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
any new cross-module decision must be recorded in `docs/decisions/adr/`.

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

## 11. MVP Runtime Reality (2026-06-02)

Dokumen ini (Section 1-10) mendeskripsikan arsitektur **target** dengan Rust Core + wgpu renderer. Runtime MVP saat ini berbeda:

### 11.1 Current Stack

| Layer | MVP Runtime | Future Target |
|---|---|---|
| Desktop Shell | Tauri 2 (shell only) | Same |
| Frontend | SolidJS + TypeScript | Same |
| Core Engine | TypeScript `DocumentEngine` (`apps/desktop/src/engine/document.ts`) | Rust `photrez-core` |
| Renderer | WebGL2 (`apps/desktop/src/renderer/webgl2.ts`) | wgpu (`photrez-render`) |
| IPC (editing hot-path) | Langsung TS â†’ TS (no Tauri invoke) | Tauri command â†’ Rust Core |
| IPC (native I/O) | Tauri invoke â†’ `main.rs` (file read/write) | Same |

### 11.2 Data Flow (MVP)

```
1. User action (click/drag/shortcut) di SolidJS
  â†“
2. Tool handler memanggil DocumentEngine method langsung
3. Engine mutasi TS state + history
  â†“
4. WebGL2 renderer consume `getRenderState()` â†’ draw frame
  â†“
5. SolidJS reactivity update UI panels
```

### 11.3 Key Differences from Target Architecture

- **No Rust editing commands**: `main.rs` hanya memiliki `ping`, `get_contract_info`, `read_file_bytes`, `write_file_bytes`. Semua editing hot-path (move, transform, brush, selection, crop) via TS `DocumentEngine`.
- **No wgpu renderer**: WebGL2 backend aktif. `photrez-render` crate ada sebagai code reference + future target.
- **Bitmap ownership**: `ImageBitmap` di TS layer objects, bukan di Rust buffers.
- **History**: TS `CommandHistory` (`apps/desktop/src/engine/history.ts`) â€” snapshot-based, max 50 depth.

### 11.4 Migration Path

Migration ke Rust Core + wgpu dilakukan saat task eksplisit runtime migration. Sampai saat itu:
- Pertahankan TS `DocumentEngine` sebagai development truth.
- `photrez-core` dan `photrez-render` crates tetap di workspace sebagai reference + test coverage.
- Jangan paksa editing commands lewat Tauri invoke kecuali untuk native I/O (file open/save).
