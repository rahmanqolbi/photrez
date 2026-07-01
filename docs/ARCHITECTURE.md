# ARCHITECTURE.md â€” Photrez (Runtime Reference)

> âš ï¸ **IMPORTANT FOR AI:** Absolute rules reference, tech stack rules, and bug/regression prevention guidelines must be read in the central file **`AI_CONTEXT.md`**.
> Also read: `AI_CURRENT_TASK.md` (status), `AI_HISTORY.md` (history), `FEATURES.md` (features)

---

## Overview

Photrez is a lightweight desktop image editor built for practical digital and print workflows.

**MVP Runtime:** Tauri 2 (shell) + SolidJS/TypeScript (frontend) + **TypeScript DocumentEngine** (core) + **WebGL2** (renderer).
**Future target:** Rust Core via WASM (photrez-core â†’ wasm-pack) for hot-path compute (brush, transform, tile, encode) + WebGL2 remains the renderer. wgpu deferred until compute-shader features are required.

---

## Project Status

- **Phase**: Post-MVP polish & bug-fix (2026-06-13). GPU viewport migration, brush calibration, crop UX improvements, and multi-cycle bug-fix passes completed. Multi-document workspace implemented.
- **Core Crate**: Document model, layer management, bitmap buffers, selection, transform, brush/eraser, import decode, export encode, and workspace management exist. Core tests pass (`cargo test -p photrez-core`: 85 tests). Workspace total: 92 tests (`cargo test --workspace`).
- **Render Crate**: wgpu renderer crate (`photrez-render`) removed from workspace members — pre-existing `STATUS_ENTRYPOINT_NOT_FOUND` on Windows. MVP rendering remains **WebGL2** (`apps/desktop/src/renderer/webgl2.ts`). Future rendering direction: keep WebGL2; only reintroduce wgpu when compute shaders or advanced blend modes exceed WebGL2 capabilities.
- **WASM Strategy (2026-06-30)**: `photrez-core` is the source for WASM compilation (`wasm-pack` target). Hot-path operations (brush mask, tile ops, transform math, color space, export encode) will be ported from TypeScript to Rust and exposed as zero-copy WASM modules — no Tauri IPC overhead.
- **Frontend**: Full UI shell with multi-document workspace, document tabs, empty state, drag/drop, and all core editing interactions. Artboard renders via WebGL2 projection-matrix-driven camera viewport.
- **Testing**: Current verified gates are tracked in `docs/AI_CURRENT_TASK.md` and `docs/AI_HISTORY.md`. Latest recorded frontend verification on 2026-06-20 passes (86 files / 1261 tests), type-check and production build pass; the latest recorded Rust gates pass for `photrez-core` (85 tests) and the workspace.
- **Recovery Reference** (historical): `docs/archive/usable-mvp-recovery-plan.md`.

---

## Technology Stack

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------ |
| Desktop Shell    | Tauri 2                                                |
| Frontend         | SolidJS + TypeScript (TSX)                             |
| Build Tool       | Vite 8                                                 |
| Styling          | Tailwind CSS v4 (`@theme` based tokens)                |
| Core Engine (MVP) | TypeScript `DocumentEngine` (`apps/desktop/src/engine/document.ts`) |
| Core Engine (future) | Rust `photrez-core` compiled via WASM (wasm-pack) â€” zero-copy from TS, no IPC |
| GPU Renderer (MVP) | WebGL2 (`apps/desktop/src/renderer/webgl2.ts`)          |
| GPU Renderer (future) | WebGL2 remains; wgpu deferred until compute-shader features required |
| Compute (future hot-path) | Rust WASM modules: brush mask, tile split/compose, transform math, color conversion, export encode |
| State (Backend)  | `tauri::State<'_, T>` + `Mutex` (Rust managed state)  |
| State (Frontend) | SolidJS `createSignal` / `createStore`                 |
| Package Manager  | pnpm (monorepo workspace)                              |
| Icons            | `lucide-solid` package                                 |

---

## Architecture Diagram

### Active MVP Runtime (2026-06-19)

This is the current runtime ownership map. Use this diagram and the registered command table as the source of truth for review.

```text
User input / UI events
        |
        v
SolidJS editor shell
  - App chrome, tabs, panels, tools
  - Solid signals and stores for UI state
  - WorkspaceManager + TypeScript DocumentEngine for MVP document state
        |
        +--> WebGL2 renderer
        |      - texture upload
        |      - compositing / preview
        |      - viewport readback where required
        |
        +--> Rust WASM modules (future hot-path)
        |      - brush mask generation
        |      - tile split / compose
        |      - transform matrix math
        |      - color space conversion
        |      - export encode (via Rust `image` crate)
        |      - zero-copy: called directly from TS, no IPC
        |
        +--> Tauri 2 shell commands (cold-path only)
               - ping
               - get_contract_info
               - read_file_bytes  (image import allowlist, 256MB cap)
               - write_file_bytes (image export allowlist, 256MB cap)

Rust crate:
  - photrez-core: source for WASM compilation + domain model + 85 tests
```

### Historical / Future-Target Reference

Note 2026-06-19: the diagram below is historical and retained only for ownership-context archaeology. It still contains earlier workspace/layer/history command labels that are not registered in the current Tauri runtime. Do not use it as the active runtime command map.

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    FRONTEND PROCESS                           â”‚
â”‚                    (SolidJS + Vite)                           â”‚
â”‚                                                               â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   App Shell       â”‚      â”‚     Canvas Viewport           â”‚ â”‚
â”‚  â”‚  (UI Chrome)      â”‚      â”‚  (IPC base64 preview)         â”‚ â”‚
â”‚  â”‚                   â”‚      â”‚                               â”‚ â”‚
â”‚  â”‚ - Menubar (44px)  â”‚      â”‚ - Ruler bars                  â”‚ â”‚
â”‚  â”‚ - Toolbar (40px)  â”‚      â”‚ - Artboard preview            â”‚ â”‚
â”‚  â”‚ - Tab Strip (30px)â”‚      â”‚ - Transform handles           â”‚ â”‚
â”‚  â”‚ - Tool Rail       â”‚      â”‚ - Selection overlay           â”‚ â”‚
â”‚  â”‚ - Inspector       â”‚      â”‚ - Empty state (no docs)       â”‚ â”‚
â”‚  â”‚ - Status Bar      â”‚      â”‚                               â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚           â”‚                            â”‚                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚              SolidJS Reactive State                     â”‚  â”‚
â”‚  â”‚  createSignal: activeTool, zoom, mousePos, layers       â”‚  â”‚
â”‚  â”‚  createSignal: documents, activeDocumentId, limits      â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                              â”‚ invoke() from                  â”‚
â”‚                              â”‚ @tauri-apps/api/core           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚ Tauri IPC Bridge
                               â”‚ (automatic serialization/deserialization)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    TAURI SHELL (Rust)                          â”‚
â”‚                              â”‚                                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚              main.rs â€” Command Handlers                 â”‚  â”‚
â”‚  â”‚           #[tauri::command] functions                    â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚         â”‚             â”‚              â”‚                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”                â”‚
â”‚  â”‚ Workspace  â”‚  â”‚ Layer    â”‚  â”‚ History    â”‚                â”‚
â”‚  â”‚ Commands   â”‚  â”‚ Commands â”‚  â”‚ Commands   â”‚                â”‚
â”‚  â”‚ get_ws_st  â”‚  â”‚ add_layerâ”‚  â”‚ undo       â”‚                â”‚
â”‚  â”‚ open_imagesâ”‚  â”‚ delete   â”‚  â”‚ redo       â”‚                â”‚
â”‚  â”‚ switch_doc â”‚  â”‚ reorder  â”‚  â”‚            â”‚                â”‚
â”‚  â”‚ close_doc  â”‚  â”‚ update   â”‚  â”‚            â”‚                â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜                â”‚
â”‚         â”‚             â”‚              â”‚                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚              AppRuntime (tauri::manage)                  â”‚  â”‚
â”‚  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚  â”‚
â”‚  â”‚  â”‚ Mutex<WorkspaceState>â”‚  â”‚ Mutex<ViewportState>     â”‚  â”‚  â”‚
â”‚  â”‚  â”‚ (photrez-core)       â”‚  â”‚ (presentation state)     â”‚  â”‚  â”‚
â”‚  â”‚  â”‚ - documents[]        â”‚  â”‚ - artboard pos/size      â”‚  â”‚  â”‚
â”‚  â”‚  â”‚ - active_document_id â”‚  â”‚ - pan/zoom               â”‚  â”‚  â”‚
â”‚  â”‚  â”‚ - per-doc state      â”‚  â”‚                          â”‚  â”‚  â”‚
â”‚  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    RUST CRATES                                 â”‚
â”‚                                                               â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”â”‚
â”‚  â”‚ photrez-core                 â”‚  â”‚ photrez-render          â”‚â”‚
â”‚  â”‚ (crates/core/)               â”‚  â”‚ (crates/render/)        â”‚â”‚
â”‚  â”‚                              â”‚  â”‚                         â”‚â”‚
â”‚  â”‚ â”œâ”€â”€ document.rs              â”‚  â”‚ â”œâ”€â”€ lib.rs              â”‚â”‚
â”‚  â”‚ â”‚   Document, layers,        â”‚  â”‚ â”‚   init_render()       â”‚â”‚
â”‚  â”‚ â”‚   selection, transform     â”‚  â”‚ â”‚   WgpuRenderer        â”‚â”‚
â”‚  â”‚ â”œâ”€â”€ layers.rs                â”‚  â”‚ â”‚                       â”‚â”‚
â”‚  â”‚ â”‚   Layer, BitmapData        â”‚  â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜â”‚
â”‚  â”‚ â”œâ”€â”€ history.rs               â”‚  â”‚                         â”‚
â”‚  â”‚ â”‚   HistoryStore, undo/redo  â”‚  â”‚                         â”‚
â”‚  â”‚ â”œâ”€â”€ workspace.rs â˜… NEW       â”‚  â”‚                         â”‚
â”‚  â”‚ â”‚   WorkspaceState           â”‚  â”‚                         â”‚
â”‚  â”‚ â”‚   DocumentSession          â”‚  â”‚                         â”‚
â”‚  â”‚ â”œâ”€â”€ brush.rs                 â”‚  â”‚                         â”‚
â”‚  â”‚ â”œâ”€â”€ export.rs                â”‚  â”‚                         â”‚
â”‚  â”‚ â””â”€â”€ lib.rs                   â”‚  â”‚                         â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Data Flow

### Hot Path (WASM / TypeScript â€” no IPC)

```text
1. User action (click/drag/shortcut) in SolidJS frontend
        â†“
2. TS DocumentEngine mutates state synchronously (zero IPC)
        â†“
3. Future: WASM module called for compute-heavy ops:
   - brushMask(radius, hardness, size)   â†’ Uint8Array
   - splitIntoTiles(bitmap, tileSize)    â†’ Tile[]
   - composeFromTiles(tiles, w, h)        â†’ ImageBitmap
   - exportEncode(pixels, format, quality) â†’ Uint8Array
        â†“
4. history.commit(snapshot) before mutation
        â†“
5. scheduler.requestRender() â†’ WebGL2 next frame
```

### Cold Path (Tauri IPC â€” file I/O only)

```text
1. User triggers file open / save / export
        â†“
2. Frontend memanggil invoke("read_file_bytes" / "write_file_bytes")
        â†“
3. Tauri IPC bridge forwards to #[tauri::command] handler
        â†“
4. Rust reads/writes file from disk via std::fs
        â†“
5. Returns base64-encoded bytes (256MB cap)
        â†“
6. Frontend decodes, creates ImageBitmap (import) or Blob (export)
```

---

## Response Envelope Contract (v2.0.0)

```rust
// Success
{ "ok": true,  "contract_version": "2.0.0", "data": { ... } }

// Error
{ "ok": false, "contract_version": "2.0.0", "error": { "code": "...", "message": "...", "details": null } }
```

Detail lengkap: `docs/reference/command-contract-spec.md`. The current Tauri shell runtime exposes a small file-IO contract; most editor operations remain in the TypeScript MVP hot path (and future WASM compute hot path) and are not registered as Tauri commands.

---

## Registered Tauri Commands (Active Runtime)

| Command | Params | Module | Status |
| --- | --- | --- | --- |
| `ping` | none | Shell | Active |
| `get_contract_info` | none | Shell | Active |
| `read_file_bytes` | `path: String` | Shell file IO | Active, image import extension allowlist, 256MB cap |
| `write_file_bytes` | `path: String, data: String` | Shell file IO | Active, image export extension allowlist, base64 payload, 256MB cap |

Historical workspace, layer, crop, and export command names describe earlier Rust-command plans and current product capabilities, but they are not registered in `apps/desktop/src-tauri/src/main.rs` in the MVP runtime. Their active implementation path is the SolidJS/TypeScript editor engine plus WebGL2 renderer, with Tauri used for shell file IO and dialogs.

---

## File Structure (Key Paths)

```
photrez/
â”œâ”€â”€ apps/
â”‚   â””â”€â”€ desktop/
â”‚       â”œâ”€â”€ src/                    # SolidJS Frontend
â”‚       â”‚   â”œâ”€â”€ App.tsx             # Main app component (51 lines, delegates to EditorShell)
â”‚       â”‚   â”œâ”€â”€ index.css           # Tailwind v4 + design tokens
â”‚       â”‚   â”œâ”€â”€ styles.css          # Additional component styles
â”‚       â”‚   â”œâ”€â”€ index.tsx           # Entry point
â”‚       â”‚   â”œâ”€â”€ engine/             # TypeScript DocumentEngine
â”‚       â”‚   â”‚   â”œâ”€â”€ document.ts     # Core document model + operations
â”‚       â”‚   â”‚   â”œâ”€â”€ history.ts      # Command history (undo/redo)
â”‚       â”‚   â”‚   â”œâ”€â”€ workspace.ts    # Multi-document workspace
â”‚       â”‚   â”‚   â””â”€â”€ ...             # cropApply, layerComposite, etc.
â”‚       â”‚   â”œâ”€â”€ renderer/           # WebGL2 rendering pipeline
â”‚       â”‚   â”‚   â”œâ”€â”€ webgl2.ts       # WebGL2Backend renderer
â”‚       â”‚   â”‚   â”œâ”€â”€ shaders.ts      # GLSL ES 3.0 shaders
â”‚       â”‚   â”‚   â””â”€â”€ scheduler.ts    # Render scheduling + continuous mode
â”‚       â”‚   â”œâ”€â”€ viewport/           # Viewport camera + geometry modules
â”‚       â”‚   â”‚   â”œâ”€â”€ viewportCamera.ts      # ViewportCamera class + easing
â”‚       â”‚   â”‚   â”œâ”€â”€ modernCropGeometry.ts  # Modern crop frame geometry
â”‚       â”‚   â”‚   â”œâ”€â”€ cropGeometry.ts        # Classic crop geometry
â”‚       â”‚   â”‚   â”œâ”€â”€ cropSnap.ts            # Crop snap targets
â”‚       â”‚   â”‚   â”œâ”€â”€ smartGuides.ts         # Smart guide line system
â”‚       â”‚   â”‚   â”œâ”€â”€ transformGeometry.ts   # Transform handle geometry
â”‚       â”‚   â”‚   â””â”€â”€ ...                    # coords, easing, hitTest, etc.
â”‚       â”‚   â””â”€â”€ components/editor/  # 67 editor components + 31 test files
â”‚       â””â”€â”€ src-tauri/
â”‚           â”œâ”€â”€ src/
â”‚           â”‚   â””â”€â”€ main.rs         # Tauri commands + EditorState (198 lines)
â”‚           â”œâ”€â”€ Cargo.toml          # Tauri dependencies
â”‚           â””â”€â”€ tauri.conf.json     # Tauri configuration
â”œâ”€â”€ crates/
â”‚   â”œâ”€â”€ core/                       # photrez-core (document model + logic, 85 tests)
â”‚   â”‚   â””â”€â”€ src/
â”‚   â”‚       â”œâ”€â”€ lib.rs              # Crate root
â”‚   â”‚       â”œâ”€â”€ document.rs         # Document struct & operations
â”‚   â”‚       â”œâ”€â”€ layers.rs           # Layer struct & serialize
â”‚   â”‚       â”œâ”€â”€ history.rs          # HistoryStore (undo/redo)
â”‚   â”‚       â”œâ”€â”€ workspace.rs        # WorkspaceState + DocumentSession
â”‚   â”‚       â”œâ”€â”€ selection.rs        # Selection operations
â”‚   â”‚       â”œâ”€â”€ transform.rs        # Transform operations
â”‚   â”‚       â”œâ”€â”€ brush.rs            # Brush stroke operations
â”‚   â”‚       â””â”€â”€ export.rs           # Export encode (JPG/PNG/WebP)
â”‚   â””â”€â”€ render/                     # photrez-render (wgpu renderer, future target)
â”‚       â””â”€â”€ src/
â”‚           â””â”€â”€ lib.rs              # Render init (deferred)
â”œâ”€â”€ docs/                           # Project documentation (see INDEX.md)
â”‚   â”œâ”€â”€ INDEX.md                    # â˜… Documentation routing guide
â”‚   â”œâ”€â”€ AI_CONTEXT.md               # â˜… AI strict rules (START HERE)
â”‚   â”œâ”€â”€ AI_CURRENT_TASK.md          # â˜… Active task status
â”‚   â”œâ”€â”€ AI_HISTORY.md               # â˜… Change history
â”‚   â”œâ”€â”€ FEATURES.md                 # â˜… Feature status tracker
â”‚   â”œâ”€â”€ ARCHITECTURE.md             # â˜… This file
â”‚   â”œâ”€â”€ CONVENTIONS.md              # â˜… Code patterns & domain knowledge
â”‚   â”œâ”€â”€ UI_GUIDE.md                 # â˜… Consolidated UI design reference
â”‚   â”œâ”€â”€ 00-product-scope.md         # MVP scope lock
â”‚   â”œâ”€â”€ 01-prd.md                   # Product requirements
â”‚   â”œâ”€â”€ 23-design-tokens.md         # Design token values
â”‚   â”œâ”€â”€ 15-command-contract-spec.md # IPC contract spec
â”‚   â”œâ”€â”€ ...                         # Reference docs (see INDEX.md)
â”‚   â””â”€â”€ archive/                    # Archived planning & history docs
â”œâ”€â”€ AGENTS.md                       # Agent orchestration rules
â”œâ”€â”€ GEMINI.md                       # Visual aesthetic rules
â”œâ”€â”€ CLAUDE.md                       # Claude-specific rules
â””â”€â”€ Cargo.toml                      # Rust workspace root
```

---

## Architecture Rules (MANDATORY)

### Module Boundaries

| Module            | Owns                                                    | Must NOT Own                            |
| ----------------- | ------------------------------------------------------- | --------------------------------------- |
| Shell (Tauri)     | App lifecycle, file dialogs, cold-path file I/O          | Image processing, document state logic  |
| Core (Rust WASM)  | Hot-path compute: brush mask, tile ops, transform math, color conversion, export encode | Rendering, UI state, file I/O |
| Renderer (WebGL2) | Frame rendering, texture upload, compositing             | Persistence, document rules, UI state   |
| Frontend (Solid)  | UI state (tool, zoom, panel), user interaction, TS DocumentEngine | Document truth (MVP), pixel manipulation (future: WASM) |

### Source of Truth

- **Document state (MVP)**: In TypeScript `DocumentEngine` (`apps/desktop/src/engine/document.ts`). Rust `photrez-core` retains the domain model as reference + test coverage.
- **Document state (future)**: Stays in TS `DocumentEngine`. Rust WASM modules are called for compute, not ownership — no dual-state synchronization problem.
- **UI state**: In SolidJS signals (tool selection, zoom level, panel visibility).
- **Pixel data (MVP)**: `ImageBitmap` per layer in `DocumentEngine`, rendered by WebGL2. Future WASM modules operate on `Uint8Array` zero-copy from JS.
- **NEVER** duplicate document state in the frontend as a mutable source.

---

## Performance Targets

| Metric         | Target       |
| -------------- | ------------ |
| Installer size | `< 80 MB`   |
| Idle RAM       | `< 250 MB`  |
| Startup time   | `< 2s`      |

Measurement protocol: `docs/reference/performance-measurement-protocol.md`
