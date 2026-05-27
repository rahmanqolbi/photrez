# Current Task: M1 — Desktop Shell Foundation [IN PROGRESS]

> Baca juga: `AI_CONTEXT.md` (aturan), `AI_HISTORY.md` (riwayat), `FEATURES.md` (fitur), `ARCHITECTURE.md` (arsitektur)

## Deskripsi

Implementasi Milestone 1: Foundation & Command Contract Baseline.
Fokus pada membangun shell desktop yang fungsional dengan layer management, undo/redo, dan UI editor yang lengkap.

## Status Implementasi

### Shell (Tauri 2 Backend)
- [x] `EditorState` struct dengan `Mutex<Document>` + `Mutex<HistoryStore>`
- [x] Response envelope helpers (`ok_response`, `err_response`)
- [x] Command: `ping`, `get_contract_info`
- [x] Command: `get_document_state`
- [x] Command: `add_layer`, `delete_layer`, `reorder_layer`
- [x] Command: `update_layer` (opacity, visible, locked, name, blend_mode)
- [x] Command: `undo`, `redo`
- [ ] Command: `crop_canvas`, `resize_canvas`
- [ ] Command: `create_selection`, `move_selection`, `clear_selection`
- [ ] Command: `brush_stroke`, `eraser_stroke`
- [ ] Command: `export_image` (JPG/PNG/WebP)
- [ ] Command: `move_layer`, `scale_layer`, `rotate_layer`, `flip_layer`

### Core Crate (`photrez-core`)
- [x] Document model (id, width, height, layers, background_color)
- [x] Layer struct (id, name, order_index, visible, opacity, locked, blend_mode)
- [x] HistoryStore (commit, undo, redo, max 50 snapshots)
- [x] Module stubs: selection, transform, brush, export
- [ ] Bitmap data integration (pixel buffer per layer)
- [ ] Selection engine (rectangular selection)
- [ ] Transform engine (scale, rotate, flip)
- [ ] Crop/Resize engine
- [ ] Brush/Eraser engine (stroke handling)
- [ ] Export pipeline (JPG/PNG/WebP encoding)

### Render Crate (`photrez-render`)
- [x] Module stub dengan `init_render()`
- [ ] wgpu Device/Queue/Surface initialization
- [ ] Texture upload pipeline
- [ ] Layer compositing renderer
- [ ] Viewport transform (zoom/pan)
- [ ] Brush stroke real-time preview

### Frontend (SolidJS)
- [x] App shell layout (menubar + toolbar + workspace + statusbar)
- [x] Tool Rail dengan mechanical dividers & active state
- [x] Inspector panel (properties + layers + history tabs)
- [x] Layer stack UI (add, delete, visibility, lock, opacity, selection)
- [x] Window controls (minimize/maximize/close)
- [x] Keyboard shortcuts (Ctrl+Z/Y)
- [x] Photon Amber design system
- [ ] Canvas viewport (actual pixel rendering via wgpu)
- [ ] Tool interaction handlers (brush, selection, crop, move)
- [ ] Export dialog
- [ ] Color picker

## Verifikasi Terakhir

- ✅ `pnpm tauri dev` — app runs successfully
- ✅ Tauri bridge (`ping`) — responds correctly
- ✅ Layer CRUD — functional via IPC
- ✅ Undo/Redo — operational

## Blocker / Risiko

- wgpu renderer masih stub — perlu integrasi untuk rendering canvas sebenarnya
- Canvas viewport masih menggunakan static HTML demo, belum pixel-level rendering
- Brush/eraser/selection belum ada implementasi di core

---

# Task Log (Completed)

> Entri lama tetap di bawah untuk referensi. Tugas terbaru selalu di atas.

## Initial Setup — Project Scaffolding [COMPLETE]

- [x] Monorepo workspace setup (pnpm)
- [x] Tauri 2 desktop app initialization
- [x] SolidJS + TypeScript + Vite frontend
- [x] Rust workspace: `photrez-core` + `photrez-render` crates
- [x] Documentation suite (37+ docs)
- [x] Agent config files (AGENTS.md, GEMINI.md, CLAUDE.md)
