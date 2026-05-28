# Current Task: Tasks 9-11: Flip Shortcuts, ESC Cancel, Rotation Snapping [COMPLETE]

> Baca juga: `AI_CONTEXT.md` (aturan), `AI_HISTORY.md` (riwayat), `FEATURES.md` (fitur), `ARCHITECTURE.md` (arsitektur)

## Deskripsi

Implementasi Tasks 9-11 dari transform polish:
- **Task 9**: Keyboard shortcuts Ctrl+G (flip horizontal), Ctrl+Shift+G (flip vertical)
- **Task 10**: ESC key to cancel transform (deselect layer + reset drag state)
- **Task 11**: Rotation angle snapping to 15-degree increments when Shift is held

**Tugas Aktif Saat Ini:** Tasks 9-11 completed successfully. Ready for next tasks!


## Status Implementasi

### Shell (Tauri 2 Backend)
- [x] `EditorState` struct dengan `Mutex<Document>` + `Mutex<HistoryStore>`
- [x] Response envelope helpers (`ok_response`, `err_response`)
- [x] Command: `ping`, `get_contract_info`
- [x] Command: `get_document_state`
- [x] Command: `add_layer`, `delete_layer`, `reorder_layer`
- [x] Command: `update_layer` (opacity, visible, locked, name, blend_mode)
- [x] Command: `undo`, `redo`
- [x] Command: `crop_canvas`, `resize_canvas`
- [x] Command: `create_selection`, `move_selection`, `clear_selection`
- [ ] Command: `brush_stroke`, `eraser_stroke`
- [ ] Command: `export_image` (JPG/PNG/WebP)
- [x] Command: `move_layer`, `scale_layer`, `rotate_layer`, `flip_layer`

### Core Crate (`photrez-core`)
- [x] Document model (id, width, height, layers, background_color)
- [x] Layer struct (id, name, order_index, visible, opacity, locked, blend_mode)
- [x] HistoryStore (commit, undo, redo, max 50 snapshots)
- [x] Module stubs: selection, transform, brush, export
- [ ] Bitmap data integration (pixel buffer per layer)
- [x] Selection engine (rectangular selection)
- [x] Transform engine (scale, rotate, flip)
- [x] Crop/Resize engine
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
- [x] Tailwind CDN conflict fix & design tokens migration (CSS v4 + lucide-solid)
- [ ] Canvas viewport (actual pixel rendering via wgpu)
- [x] Tool interaction handlers (selection, crop, move)
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

## Proportional Fix — Rail 48×36 / Top Bar 44px [COMPLETE]

- [x] Tool rail `w-[60px]`→`w-[48px]`, grid column `52px`→`48px` (sinkron)
- [x] Button `w-10 h-10`→`w-9 h-9` (36px sesuai design spec)
- [x] Icon `size={20}`→`size={18}` di semua tool buttons
- [x] Rail gap `gap-1.5`→`gap-1`
- [x] Top bar `36px`→`44px` (sesuai wireframe spec)
- [x] Update `26-wireframe-layout-spec.md` dimensi
- [x] Build verification: ✅ `tsc` + `vite build` sukses

## Remove Command Palette UI Button [COMPLETE]

- [x] Hapus button + separator dari toolbar, hapus import Terminal
- [x] Update docs/32-keyboard-shortcut-map.md dengan catatan
- [x] Build verification: ✅ `tsc` + `vite build` sukses

## Inspector Panel Polish [COMPLETE]

- [x] Collapsible Transform section dengan chevron rotate
- [x] Collapsible Opacity section dengan range slider + number input
- [x] Tab redesign dengan icon (Layers, Clock) + bottom border accent
- [x] Layer items: title tooltips, translate + opacity hover animation
- [x] History empty state dengan Clock icon
- [x] Build verification: ✅ `tsc` + `vite build` sukses

## Bug Fix — Tailwind CDN Conflict & Design Tokens Migration [COMPLETE]

- [x] Hapus CDN Tailwind + Lucide dari index.html
- [x] Install lucide-solid npm package, migrasi dari `<i data-lucide>` ke komponen SolidJS
- [x] Lengkapi design tokens di @theme (text colors, motion, shadow, animate)
- [x] Ganti hardcoded `text-[#...]` dengan token `text-text-primary/secondary/muted`
- [x] Ruler ticks pake `<For>` loop, SVG animation pake `animate-dash` class
- [x] Hapus file .jsx duplikat (App.jsx, index.jsx, ui-sanity.test.js)
- [x] Build verification: ✅ `tsc` + `vite build` sukses

## Initial Setup — Project Scaffolding [COMPLETE]

- [x] Monorepo workspace setup (pnpm)
- [x] Tauri 2 desktop app initialization
- [x] SolidJS + TypeScript + Vite frontend
- [x] Rust workspace: `photrez-core` + `photrez-render` crates
- [x] Documentation suite (37+ docs)
- [x] Agent config files (AGENTS.md, GEMINI.md, CLAUDE.md)
