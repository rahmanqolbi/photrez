# ARCHITECTURE.md — Photrez (Runtime Reference)

> ⚠️ **PENTING UNTUK AI:** Referensi mengenai aturan mutlak, tech stack rules, dan pedoman mencegah bug/regresi wajib dibaca di berkas terpusat **`AI_CONTEXT.md`**.
> Baca juga: `AI_CURRENT_TASK.md` (status), `AI_HISTORY.md` (riwayat), `FEATURES.md` (fitur)

---

## Gambaran Umum

Photrez adalah lightweight desktop image editor yang dibangun sebagai alternatif Photoshop praktis untuk workflow digital dan print. Dibangun di atas arsitektur **hybrid modular**: Tauri 2 (shell) + Rust (core) + wgpu (renderer), dengan frontend SolidJS + TypeScript.

---

## Status Proyek

- **Phase**: Milestone 1 — Foundation & Command Contract Baseline
- **Core Crate**: Document model, layer management, dan history engine sudah stabil.
- **Render Crate**: Stub — wgpu integration belum dimulai.
- **Frontend**: Full UI shell fungsional, layer CRUD via IPC operational.
- **Testing**: Belum ada automated tests (planned per M1 checklist).

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
| Icons            | Lucide (CDN)                                           |

---

## Diagram Arsitektur

```text
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND PROCESS                           │
│                    (SolidJS + Vite)                           │
│                                                               │
│  ┌──────────────────┐      ┌───────────────────────────────┐ │
│  │   App Shell       │      │     Canvas Viewport           │ │
│  │  (UI Chrome)      │      │  (Future: wgpu surface)       │ │
│  │                   │      │                               │ │
│  │ - Menubar (36px)  │      │ - Ruler bars                  │ │
│  │ - Toolbar (42px)  │      │ - Artboard preview            │ │
│  │ - Tool Rail       │      │ - Transform handles           │ │
│  │ - Inspector       │      │ - Selection overlay           │ │
│  │ - Status Bar      │      │                               │ │
│  └────────┬──────────┘      └──────────┬────────────────────┘ │
│           │                            │                      │
│  ┌────────┴────────────────────────────┴──────────────────┐  │
│  │              SolidJS Reactive State                     │  │
│  │  createSignal: activeTool, zoom, mousePos, layers       │  │
│  │  createSignal: activeTab, selectedLayerId, fileMenuOpen │  │
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
│  │ Layer      │  │ Document │  │ History    │                │
│  │ Commands   │  │ Commands │  │ Commands   │                │
│  │ add_layer  │  │ get_doc  │  │ undo       │                │
│  │ delete     │  │ _state   │  │ redo       │                │
│  │ reorder    │  │          │  │            │                │
│  │ update     │  │          │  │            │                │
│  └──────┬─────┘  └────┬─────┘  └─────┬──────┘                │
│         │             │              │                        │
│  ┌──────┴─────────────┴──────────────┴────────────────────┐  │
│  │              EditorState (tauri::manage)                 │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐  │  │
│  │  │ Mutex<Document>     │  │ Mutex<HistoryStore>      │  │  │
│  │  │ (photrez-core)      │  │ (photrez-core)           │  │  │
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
│  │ ├── document.rs              │  │ ├── lib.rs (stub)       ││
│  │ │   Document, add/delete/    │  │ │   init_render()       ││
│  │ │   reorder/update layer     │  │ │                       ││
│  │ ├── layers.rs                │  │ │ TODO:                 ││
│  │ │   Layer struct, serialize  │  │ │ - wgpu Device init    ││
│  │ ├── history.rs               │  │ │ - Texture pipeline    ││
│  │ │   HistoryStore, undo/redo  │  │ │ - Layer compositing   ││
│  │ ├── selection.rs (stub)      │  │ │ - Viewport transforms ││
│  │ ├── transform.rs (stub)      │  │ │ - Brush preview       ││
│  │ ├── brush.rs (stub)          │  │ └─────────────────────────┘│
│  │ ├── export.rs (stub)         │  │                         │
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

| Command              | Params                                          | Module   | Status |
| -------------------- | ----------------------------------------------- | -------- | ------ |
| `ping`               | —                                               | Shell    | ✅     |
| `get_contract_info`  | —                                               | Shell    | ✅     |
| `get_document_state` | —                                               | Document | ✅     |
| `add_layer`          | `name: String`                                  | Layer    | ✅     |
| `delete_layer`       | `id: String`                                    | Layer    | ✅     |
| `reorder_layer`      | `from_idx: usize, to_idx: usize`               | Layer    | ✅     |
| `update_layer`       | `id, opacity?, visible?, locked?, name?, blend_mode?` | Layer | ✅     |
| `undo`               | —                                               | History  | ✅     |
| `redo`               | —                                               | History  | ✅     |

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
