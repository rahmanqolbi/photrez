# ARCHITECTURE.md — Photrez (Runtime Reference)

> ⚠️ **PENTING UNTUK AI:** Referensi mengenai aturan mutlak, tech stack rules, dan pedoman mencegah bug/regresi wajib dibaca di berkas terpusat **`AI_CONTEXT.md`**.
> Baca juga: `AI_CURRENT_TASK.md` (status), `AI_HISTORY.md` (riwayat), `FEATURES.md` (fitur)

---

## Gambaran Umum

Photrez adalah lightweight desktop image editor yang dibangun sebagai alternatif Photoshop praktis untuk workflow digital dan print. Dibangun di atas arsitektur **hybrid modular**: Tauri 2 (shell) + Rust (core) + wgpu (renderer), dengan frontend SolidJS + TypeScript.

---

## Status Proyek

- **Phase**: Usable MVP recovery gate (2026-05-29). Multi-document workspace implemented.
- **Core Crate**: Document model, layer management, bitmap buffers, selection, transform, brush/eraser, import decode, export encode, and workspace management exist. Core tests pass (`cargo test -p photrez-core`: 85 tests).
- **Render Crate**: wgpu renderer code exists, but render crate tests currently fail with `STATUS_ENTRYPOINT_NOT_FOUND`; workspace test gate is not green.
- **Frontend**: Full UI shell with multi-document workspace, document tabs, empty state, drag/drop, and all core editing interactions. Artboard renders via IPC base64 pipeline.
- **Testing**: Frontend build and tests pass (`pnpm.cmd run build`; `pnpm.cmd --filter photrez-desktop test`: 45 tests). Core tests pass (85 tests).
- **Recovery Reference**: `docs/38-usable-mvp-recovery-plan.md`.

---

## Stack Teknologi

| Layer            | Teknologi                                              |
| ---------------- | ------------------------------------------------------ |
| Desktop Shell    | Tauri 2                                                |
| Frontend         | SolidJS + TypeScript (TSX)                             |
| Build Tool       | Vite 8                                                 |
| Styling          | Tailwind CSS v4 (`@theme` based tokens)                |
| Core Engine      | Rust (crate: `photrez-core`)                           |
| GPU Renderer     | wgpu (crate: `photrez-render`)                         |
| State (Backend)  | `tauri::State<'_, T>` + `Mutex` (Rust managed state)  |
| State (Frontend) | SolidJS `createSignal` / `createStore`                 |
| Package Manager  | pnpm (monorepo workspace)                              |
| Icons            | `lucide-solid` package                                 |

---

## Diagram Arsitektur

Note 2026-05-29: the diagram below is historical and still useful for ownership boundaries, but some file labels/status markers are stale. Use the project status and registered command table above/below as the current runtime truth until the diagram is redrawn during the usable-MVP recovery pass.

```text
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND PROCESS                           │
│                    (SolidJS + Vite)                           │
│                                                               │
│  ┌──────────────────┐      ┌───────────────────────────────┐ │
│  │   App Shell       │      │     Canvas Viewport           │ │
│  │  (UI Chrome)      │      │  (IPC base64 preview)         │ │
│  │                   │      │                               │ │
│  │ - Menubar (44px)  │      │ - Ruler bars                  │ │
│  │ - Toolbar (40px)  │      │ - Artboard preview            │ │
│  │ - Tab Strip (30px)│      │ - Transform handles           │ │
│  │ - Tool Rail       │      │ - Selection overlay           │ │
│  │ - Inspector       │      │ - Empty state (no docs)       │ │
│  │ - Status Bar      │      │                               │ │
│  └────────┬──────────┘      └──────────┬────────────────────┘ │
│           │                            │                      │
│  ┌────────┴────────────────────────────┴──────────────────┐  │
│  │              SolidJS Reactive State                     │  │
│  │  createSignal: activeTool, zoom, mousePos, layers       │  │
│  │  createSignal: documents, activeDocumentId, limits      │  │
│  └───────────────────────────┬────────────────────────────┘  │
│                              │ invoke() from                  │
│                              │ @tauri-apps/api/core           │
└──────────────────────────────┼────────────────────────────────┘
                               │ Tauri IPC Bridge
                               │ (automatic serialization/deserialization)
┌──────────────────────────────┼────────────────────────────────┐
│                    TAURI SHELL (Rust)                          │
│                              │                                │
│  ┌───────────────────────────┴────────────────────────────┐  │
│  │              main.rs — Command Handlers                 │  │
│  │           #[tauri::command] functions                    │  │
│  └──────┬─────────────┬──────────────┬────────────────────┘  │
│         │             │              │                        │
│  ┌──────┴─────┐  ┌────┴─────┐  ┌─────┴──────┐                │
│  │ Workspace  │  │ Layer    │  │ History    │                │
│  │ Commands   │  │ Commands │  │ Commands   │                │
│  │ get_ws_st  │  │ add_layer│  │ undo       │                │
│  │ open_images│  │ delete   │  │ redo       │                │
│  │ switch_doc │  │ reorder  │  │            │                │
│  │ close_doc  │  │ update   │  │            │                │
│  └──────┬─────┘  └────┬─────┘  └─────┬──────┘                │
│         │             │              │                        │
│  ┌──────┴─────────────┴──────────────┴────────────────────┐  │
│  │              AppRuntime (tauri::manage)                  │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐  │  │
│  │  │ Mutex<WorkspaceState>│  │ Mutex<ViewportState>     │  │  │
│  │  │ (photrez-core)       │  │ (presentation state)     │  │  │
│  │  │ - documents[]        │  │ - artboard pos/size      │  │  │
│  │  │ - active_document_id │  │ - pan/zoom               │  │  │
│  │  │ - per-doc state      │  │                          │  │  │
│  │  └─────────────────────┘  └─────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    RUST CRATES                                 │
│                                                               │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐│
│  │ photrez-core                 │  │ photrez-render          ││
│  │ (crates/core/)               │  │ (crates/render/)        ││
│  │                              │  │                         ││
│  │ ├── document.rs              │  │ ├── lib.rs              ││
│  │ │   Document, layers,        │  │ │   init_render()       ││
│  │ │   selection, transform     │  │ │   WgpuRenderer        ││
│  │ ├── layers.rs                │  │ │                       ││
│  │ │   Layer, BitmapData        │  │ └───────────────────────┘│
│  │ ├── history.rs               │  │                         │
│  │ │   HistoryStore, undo/redo  │  │                         │
│  │ ├── workspace.rs ★ NEW       │  │                         │
│  │ │   WorkspaceState           │  │                         │
│  │ │   DocumentSession          │  │                         │
│  │ ├── brush.rs                 │  │                         │
│  │ ├── export.rs                │  │                         │
│  │ └── lib.rs                   │  │                         │
│  └──────────────────────────────┘                             │
└───────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```text
1. User action (click/drag/shortcut) di SolidJS frontend
        ↓
2. Frontend memanggil invoke("command_name", { params })
        ↓
3. Tauri IPC bridge meneruskan ke #[tauri::command] handler
        ↓
4. Handler mengakses EditorState (Mutex lock)
        ↓
5. history.commit(current_state)  ← snapshot SEBELUM mutasi
        ↓
6. Document/Layer/Core dimutasi
        ↓
7. Handler return ok_response(updated_doc) atau err_response(code, msg)
        ↓
8. Frontend menerima response, update SolidJS signals
        ↓
9. SolidJS reactivity otomatis re-render affected UI
```

---

## Response Envelope Contract (v1.0.0)

```rust
// Success
{ "ok": true,  "contract_version": "1.0.0", "data": { ... } }

// Error
{ "ok": false, "contract_version": "1.0.0", "error": { "code": "...", "message": "...", "details": null } }
```

Detail lengkap: `docs/15-command-contract-spec.md`

---

## Registered Commands (Active)

| Command              | Params | Module | Status |
| -------------------- | ------ | ------ | ------ |
| `ping`               | none | Shell | Active |
| `get_contract_info`  | none | Shell | Active |
| `get_workspace_state` | none | Workspace | Active |
| `get_document_state` | none | Workspace | Active (compatibility, returns active document) |
| `open_images`        | `paths: Vec<String>` | Workspace | Active |
| `switch_document`    | `documentId: String` | Workspace | Active |
| `close_document`     | `documentId: String, discardChanges: bool` | Workspace | Active |
| `set_selected_layer` | `layerId: Option<String>` | Workspace | Active |
| `add_layer`          | `name: String` | Layer | Active |
| `delete_layer`       | `id: String` | Layer | Active |
| `reorder_layer`      | `from_idx: usize, to_idx: usize` | Layer | Active |
| `update_layer`       | `id, opacity?, visible?, locked?, name?, blend_mode?` | Layer | Active |
| `undo`               | none | History | Active |
| `redo`               | none | History | Active |
| `create_selection`   | `x, y, width, height` | Selection | Active |
| `clear_selection`    | none | Selection | Active |
| `select_all`         | none | Selection | Active |
| `move_layer`         | `id, x, y` | Layer | Active |
| `transform_layer`    | `id, scale_x, scale_y, rotation, flip_h, flip_v` | Transform | Active |
| `crop_canvas`        | `x, y, width, height` | Document | Active |
| `resize_canvas`      | `width, height` | Document | Active |
| `draw_brush_stroke`  | `layer_id, path, size, hardness, color, is_eraser` | Brush | Active |
| `export_document`    | `format, quality, path` | Export | Active |
| `sample_pixel`       | `x, y` | Color | Active |
| `open_image`         | `path` | Import | Active (compatibility, delegates to open_images) |
| `trigger_render`     | none | Renderer | Active |
| `update_viewport_state` | artboard/pan/zoom params | Renderer | Active |
| `preview_frame`      | none | Renderer | Active |

---

## File Structure (Key Paths)

```
image-studio/
├── apps/
│   └── desktop/
│       ├── src/                    # SolidJS Frontend
│       │   ├── App.tsx             # Main app component (632 lines)
│       │   ├── index.css           # Tailwind v4 + design tokens
│       │   └── index.tsx           # Entry point
│       └── src-tauri/
│           ├── src/
│           │   └── main.rs         # Tauri commands + EditorState (221 lines)
│           ├── Cargo.toml          # Tauri dependencies
│           └── tauri.conf.json     # Tauri configuration
├── crates/
│   ├── core/                       # photrez-core (document model + logic)
│   │   └── src/
│   │       ├── lib.rs              # Crate root
│   │       ├── document.rs         # Document struct & operations
│   │       ├── layers.rs           # Layer struct & serialize
│   │       ├── history.rs          # HistoryStore (undo/redo)
│   │       ├── selection.rs        # Selection (stub)
│   │       ├── transform.rs        # Transform (stub)
│   │       ├── brush.rs            # Brush (stub)
│   │       └── export.rs           # Export (stub)
│   └── render/                     # photrez-render (wgpu renderer)
│       └── src/
│           └── lib.rs              # Render init (stub)
├── docs/                           # Project documentation (37+ files)
│   ├── AI_CONTEXT.md               # ★ AI strict rules (START HERE)
│   ├── AI_CURRENT_TASK.md          # ★ Active task status
│   ├── AI_HISTORY.md               # ★ Change history
│   ├── FEATURES.md                 # ★ Feature status tracker
│   ├── ARCHITECTURE.md             # ★ This file
│   ├── 00-vision-and-strategy.md   # Product vision
│   ├── 00-product-scope.md         # MVP scope lock
│   ├── 01-prd.md                   # Product requirements
│   ├── 02-architecture.md          # Architecture (planning doc)
│   ├── 03-trd.md                   # Technical requirements
│   ├── 04-erd-or-data-model.md     # Data model schemas
│   ├── 15-command-contract-spec.md # IPC contract spec
│   └── ...                         # 30+ more docs
├── AGENTS.md                       # Agent orchestration rules
├── GEMINI.md                       # Visual aesthetic rules
├── CLAUDE.md                       # Claude-specific rules
└── Cargo.toml                      # Rust workspace root
```

---

## Aturan Arsitektur (WAJIB)

### Module Boundaries

| Module          | Owns                                           | Must NOT Own                            |
| --------------- | ----------------------------------------------- | --------------------------------------- |
| Shell (Tauri)   | App lifecycle, file dialogs, command routing     | Image processing, document state logic  |
| Core (Rust)     | Document model, layers, transforms, brush, export | Rendering, UI state, window management  |
| Renderer (wgpu) | Frame rendering, texture upload, compositing     | Persistence, document rules, UI state   |
| Frontend (Solid)| UI state (tool, zoom, panel), user interaction   | Document truth, pixel manipulation      |

### Source of Truth

- **Document state**: HANYA di Rust Core (`photrez-core`), diakses via `EditorState`.
- **UI state**: Di SolidJS signals (tool selection, zoom level, panel visibility).
- **Pixel data**: Akan di Rust Core (bitmap buffers), di-render oleh wgpu.
- **TIDAK PERNAH** duplikasi document state di frontend sebagai mutable source.

---

## Performance Targets

| Metric         | Target       |
| -------------- | ------------ |
| Installer size | `< 80 MB`   |
| Idle RAM       | `< 250 MB`  |
| Startup time   | `< 2s`      |

Protocol ukur: `docs/16-performance-measurement-protocol.md`
