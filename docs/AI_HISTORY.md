# AI History — Photrez

> Dokumen ini mencatat SEMUA perubahan signifikan yang dibuat oleh AI.
> Urutan: terbaru di atas. Jangan hapus entri lama — hanya tambahkan di atas.
> Baca juga: `AI_CONTEXT.md` (aturan), `AI_CURRENT_TASK.md` (status), `FEATURES.md` (fitur), `ARCHITECTURE.md` (arsitektur)

---

## [2026-05-27] FEATURE — Milestone 1 Shell Foundation & Photon Amber UI Redesign

### Kategori: FEATURE / SHELL / UI / CORE

**Deskripsi:** Implementasi fondasi proyek termasuk:

1. **Core Crate (`photrez-core`)**:
   - Document model dengan layer management (add/delete/reorder)
   - Layer properties (visibility, opacity, locked, blend_mode, name)
   - History/Undo-Redo engine (snapshot-based, max 50 entries)
   - Selection, Transform, Brush, Export module stubs

2. **Render Crate (`photrez-render`)**:
   - wgpu renderer initialization stub
   - Module struktur untuk future GPU rendering

3. **Shell (Tauri 2 Backend — `src-tauri/src/main.rs`)**:
   - EditorState dengan Mutex-wrapped Document & HistoryStore
   - 8 command handlers: `ping`, `get_contract_info`, `get_document_state`, `add_layer`, `delete_layer`, `reorder_layer`, `update_layer`, `undo`, `redo`
   - Response envelope pattern (Contract v1.0.0) — `ok_response()` / `err_response()`
   - Default document bootstrap (800×600, background layer)

4. **Frontend (SolidJS + Tailwind v4)**:
   - Full desktop editor UI shell (App.tsx — 632 lines)
   - Menubar (36px) + Toolbar (42px) + Workspace + Status bar (28px)
   - Tool Rail (Raw Pro aesthetic) dengan mechanical dividers
   - Inspector panel (properties + layer stack + history tabs)
   - Photon Amber accent (`#E15A17`) design system
   - Window controls (minimize/maximize/close via Tauri API)
   - Keyboard shortcuts (Ctrl+Z undo, Ctrl+Y redo)
   - Lucide icons via CDN

5. **Documentation Suite**:
   - 37+ docs covering vision, PRD, architecture, TRD, data model, ADRs, design tokens, style guide, etc.
   - AGENTS.md, GEMINI.md, CLAUDE.md configuration files

**Validasi:**
- ✅ `pnpm tauri dev` — builds and runs successfully
- ✅ Tauri bridge confirmed (`ping` command responds)
- ✅ Layer CRUD operations functional via IPC
- ✅ Undo/Redo operational

---

## [2026-05-27] DOCS — AI Context Documentation System

### Kategori: DOCS / INFRASTRUCTURE

**Deskripsi:** Pembuatan sistem dokumentasi AI yang saling terhubung:
- `AI_CONTEXT.md` — Aturan mutlak, tech stack rules, cross-reference map
- `AI_HISTORY.md` — Log perubahan (ini)
- `AI_CURRENT_TASK.md` — Status tugas aktif
- `FEATURES.md` — Status implementasi per fitur
- `ARCHITECTURE.md` — Arsitektur runtime & diagram

Sistem dirancang agar ketika satu file di-mention, AI otomatis membaca seluruh rantai dokumen tanpa perlu disuruh satu per satu.
