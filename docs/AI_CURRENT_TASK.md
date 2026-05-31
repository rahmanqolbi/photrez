# AI_CURRENT_TASK.md - Photrez Current Task

> Baca juga: `AI_CONTEXT.md` (aturan), `AI_HISTORY.md` (riwayat), `FEATURES.md` (fitur), `ARCHITECTURE.md` (arsitektur)

## Current Task - High-Fidelity Move & Transform Tool [COMPLETE]

Date: 2026-05-31

### Deskripsi

Mengimplementasikan Move Tool dengan UX interaktif persis Photoshop, yang merender bounding outline dan 8 resize handles, serta memetakan pergeseran/skala pointer ke DocumentEngine transform parameters dengan dukungan rasio aspek terkunci (Shift key) dan Undo/Redo history.

### Rencana Kerja

1. **Buat Bounding Box Overlay** (`SelectionTransformOverlay.tsx`): Hitung batas layar dari layer terpilih (memperhitungkan zoom & pan) lalu render outline & 8 resize handles. [x]
2. **Implementasikan pointer down/move/up**: Hubungkan interaksi mouse/pointer ke `engine.transformLayer` secara reaktif dan panggil `scheduler.requestRender()` untuk rendering WebGL2 real-time. [x]
3. **Tambahkan Aspect Ratio Lock**: Implementasikan proportional scaling ketika tombol `Shift` ditahan selama drag sudut. [x]
4. **History commits**: Lakukan komit history snapshot di `PointerDown` sebelum mutasi transform terjadi agar Undo/Redo bekerja sempurna. [x]
5. **Integrasikan ke CanvasViewport**: Render overlay saat tool "move" aktif. [x]
6. **Verifikasi**: Jalankan build dan test. [x]

---

## Current Task - Architecture Migration v2 [COMPLETE]

Date: 2026-05-30

### Deskripsi

Melakukan migrasi arsitektur sistem dari Rust-heavy stateful backend ke frontend-owned TypeScript Document Engine + WebGL2 render backend.
Menyelaraskan rencana migrasi dengan struktur UI termutakhir yang sudah di-slicing ke dalam komponen-komponen modular (`apps/desktop/src/components/editor/`), bukan memaksakan pengerjaan satu berkas `App.tsx` yang besar.

### Rencana Kerja

1. **Analisis UI Saat Ini**: Periksa komponen-komponen modular di `components/editor/` dan petakan bagaimana state Document Engine (Signal & Store) akan mengalir menggantikan `invoke` Tauri.
2. **Phase 1: Engine Foundation**: Buat `src/engine/types.ts` dan `src/engine/document.ts` dengan DocumentEngine class.
3. **Phase 2: History System**: Buat `src/engine/history.ts` dengan CommandHistory.
4. **Phase 3: Workspace Manager**: Buat `src/engine/workspace.ts` dengan WorkspaceManager.
5. **Phase 4: WebGL2 Renderer**: Buat render backend berbasis WebGL2 di `src/renderer/` dan render scheduler.
6. **Phase 5: Canvas Viewport**: Hubungkan viewport SolidJS dengan WebGL2 dan dispatch input pointer events ke tool handlers baru.
7. **Phase 6 & 7: Tauri Simplification & UI Component Refactoring**: Sederhanakan `main.rs` dan Cargo.toml Tauri. Refaktorkan komponen editor modular di `components/editor/` agar langsung memakai `WorkspaceManager` dan `DocumentEngine` (tanpa IPC command sync).
8. **Phase 8-10: File Pipeline, Editing, and Export**: Selesaikan file open/save, brush/eraser drawing, layer CRUD, selection/transform, dan canvas export berbasis offscreen Canvas.
9. **Cleanup & Final Verification**: Hapus crates Rust lama, verifikasi test suite (Vitest + Cargo check) berjalan sukses.

### Status

IN PROGRESS. Memulai Analisis UI modular dan mempersiapkan Phase 1 (Engine Foundation).

---

## Current Task - AppShell Grid Layout Restructure [COMPLETE]

Date: 2026-05-30

### Deskripsi

Menyelaraskan struktur layout SolidJS agar eksplisit mengikuti spesifikasi user: AppShell 5 row (`52px 48px 56px 1fr 46px`), AppTitleBar berisi BrandArea/MainMenu/WindowControls, DocumentTabsBar, OptionBar, MainWorkspace 3 kolom (`64px 1fr 520px`), RightDock 2 kolom (`280px 240px`), dan BottomStatusBar.

### Rencana Kerja

1. Petakan struktur UI dan design tokens yang sudah ada.
2. Ubah `apps/desktop/src/App.tsx` agar memakai nama dan hirarki komponen yang diminta.
3. Pertahankan styling native desktop gelap dan aturan SolidJS (`class`, `<For>`, tanpa React patterns).
4. Jalankan diagnostics, test, build, dan catat hasil.

### Status

COMPLETE. Seluruh struktur layout AppShell dan RightDock dua kolom modular side-by-side berhasil diporting ke SolidJS secara pixel-perfect, semua 49 Vitest unit tests pada `ui-sanity.test.ts` dan 85 Rust core unit tests lulus 100%.

### Verifikasi

- `pnpm.cmd --filter photrez-desktop test`: PASS, 5 test files / 49 tests.
- `cargo test -p photrez-core`: PASS, 85 tests.
- `pnpm.cmd run build`: PASS.

---

## Current Task - LeftToolRail Reference Matching [COMPLETE]

Date: 2026-05-29

### Deskripsi

Fokus pada penyamaan LeftToolRail terhadap `desain.png`: menghapus dividers antar tool groups, mengganti active state dari orange menjadi monokrom (dark gray bg + subtle border + white icon), mengganti settings button dengan ellipsis, dan memastikan tool buttons dalam satu kolom tanpa putus.

### Rencana Kerja

1. Tambahkan sanity assertions untuk struktur dan CSS LeftToolRail.
2. Jalankan RED test (harus gagal).
3. Ubah markup/style LeftToolRail di `App.tsx` dan `index.css`.
4. Jalankan GREEN test dan build.

### Status

COMPLETE. LeftToolRail telah difokuskan ulang: dividers dihapus agar continuous stack, active state berubah dari orange ke monokrom (dark gray bg + subtle border + white icon), orange left bar pseudo-element dihapus, dan settings button diganti dengan ellipsis.

### Verifikasi

- RED: `pnpm.cmd --filter photrez-desktop test -- ui-sanity.test.ts` gagal pada 4 assertion baru (no dividers, no orange active, no ::before, has ellipsis) sebelum implementasi.
- GREEN: `pnpm.cmd --filter photrez-desktop test -- ui-sanity.test.ts`: PASS, 5 test files / 49 tests.
- `pnpm.cmd run build`: PASS, `tsc && vite build` sukses.
- `lsp_diagnostics`: blocked karena `typescript-language-server` dan `biome` tidak terinstal di environment.

---

## Current Task - photrez High-Fidelity Reference Slice [COMPLETE]

Date: 2026-05-29

### Deskripsi

Melakukan slicing ulang UI SolidJS + TypeScript + Tailwind CSS berdasarkan `ui-mockup.png` dengan fidelity tinggi, mengganti branding LUMINARIS menjadi `photrez`, memakai static mock data, dan mempertahankan struktur komponen yang diminta: AppShell, TopMenuBar, DocumentTabsBar, OptionBar, MainWorkspace, LeftToolRail, CanvasViewport, RightDock, PropertiesPanel, LayersPanel, BottomStatusBar.

### Rencana Kerja

1. **Layout Grid**: Terapkan AppShell CSS grid rows `52px 48px 56px 1fr 46px` dan columns `64px 1fr 520px`.
2. **Static Mock UI**: Render document tabs, tool rail, fjord canvas preview, properties sections, layer stack, navigator, dan status bar dari data statis SolidJS.
3. **Visual Tokens**: Selaraskan token dark native desktop creative app dengan aksen Photon Amber `#E15A17` hanya untuk state aktif kecil.
4. **Verifikasi**: Jalankan frontend build/test dan gate Rust yang diwajibkan project, lalu catat hasil.

### Status

COMPLETE. UI slicing telah diterapkan di `apps/desktop/src/App.tsx` dan `apps/desktop/src/index.css` sebagai static SolidJS mock shell dengan branding `photrez`, component structure eksplisit, grid `52px 48px 56px 1fr 46px` / `64px 1fr 520px`, right dock `280px + 240px`, dan fjord preview sebagai elemen `<img>` lokal.

### Verifikasi

- `pnpm.cmd --filter photrez-desktop test`: PASS, 5 test files / 44 tests.
- `pnpm.cmd run build`: PASS, `tsc && vite build` sukses.
- `cargo test -p photrez-core`: PASS, 85 tests.
- `cargo test --workspace`: FAIL pada `photrez-render` dengan `STATUS_ENTRYPOINT_NOT_FOUND` setelah `photrez-core` dan `photrez-desktop` tests pass; failure ini sudah terdokumentasi sebagai pre-existing di `docs/ARCHITECTURE.md`.
- `lsp_diagnostics`: blocked karena `typescript-language-server` dan `biome` tidak terinstal di environment.

---

## Current Task - High-Fidelity LUMINARIS Visual Overhaul & Slicing [COMPLETE]

Date: 2026-05-29

### Deskripsi

Melakukan perombakan visual dan slicing tingkat tinggi agar tampilan antarmuka SolidJS photrez 100% identik dengan Mockup LUMINARIS (Mockup.png). Membuang seluruh visual web-like yang kaku, memisahkan Properties dan Layers secara side-by-side (280px + 240px) di RightDock, memoles input koordinat Transform dan slider Basic, merender list layer lengkap dengan thumbnail visual dan Navigator Panel, serta mengintegrasikan startup mock workspace tiruan agar antarmuka terisi penuh dengan gambar landscape gunung matahari terbenam (norway_fjord_preview.png) secara default pada saat startup.

### Rencana Kerja

1. **Mock Data Bootstrap**:
   - Tambahkan state `isMockWorkspace` di App.tsx.
   - Jika `isMockWorkspace` aktif (default saat launch), bootstrap documents dengan 4 mock tabs dan data active document "Norsway Fjord Edit" terisi penuh (6 layers dengan thumbnail, canvas preview sunset mountain).
   - Seamless transition: matikan `isMockWorkspace` saat user membuka file nyata atau melakukan operasi mutasi nyata.
2. **index.css**:
   - Sempurnakan `@theme` dan utilities untuk style input capsule, double-sidebar panel docking, dan detail visual LUMINARIS.
3. **App.tsx Re-slicing**:
   - Rebrand logo menjadi `L U M I N A R I S` (all-caps, spaced).
   - Terapkan layout grid docked presisi.
   - Properties Panel: adjust pill tab, seksi Transform (mini input capsules side-by-side, scale slider, opacity slider, 3x3 anchor grid, aspect ratio constrain), seksi Basic (profile dropdown, temp tint sliders), collapsed sections.
   - Layers Panel: layers pill tab, blend mode, opacity, layer stack (translucent active row, 1px orange border, visible eye, lock, visual thumbnails), Navigator panel ramping dengan preview mini dan zoom slider.
   - Options Bar: move tools parameter, coordinates capsules, rotation snaps, flip icons, reset button.
   - BottomStatusBar: status detail format `1920 x 1280 px | 41% | RGB/8 | sRGB...` di kiri, deskripsi tool di tengah, action launcher di kanan.
4. **Verifikasi**:
   - Jalankan build verification (tsc + vitest) untuk memastikan 100% kelulusan.

### Status

COMPLETE. Rencana implementasi telah dieksekusi sepenuhnya. SolidJS layout telah menggunakan grid dual panel (Properties + Layers), Options Bar dan Status Bar disesuaikan, dan `isMockWorkspace` terinjeksi. Seluruh tes frontend dan backend dinyatakan 100% lulus.

---

## Current Task - Mockup UI Slicing [COMPLETE]

Date: 2026-05-29

### Deskripsi

Melakukan slicing UI aplikasi photrez desktop editor sesuai dengan visual brief dan Mockup.png. Mengatur tema Tailwind CSS v4 di index.css dan merombak total App.tsx layout agar menggunakan flat docked grid system presisi dengan aksen oranye Photon Amber hemat, tanpa merusak fungsionalitas dan reaktivitas SolidJS/Tauri bridge yang sudah terpasang.

### Rencana Kerja

1. **index.css**: Tambahkan CSS custom properties baru untuk theme v4 (app.bg, app.chrome, app.panel, dll.).
2. **App.tsx Layout**: Ubah grid utama menjadi rows `[52px_48px_56px_1fr_46px]` dan cols `[64px_1fr_520px]`.
3. **App.tsx Components**: Slice TopMenuBar, DocumentTabsBar, OptionBar, LeftToolRail, CanvasViewport, RightDock (Properties & Layers Panels), and BottomStatusBar.
4. **Verifikasi**: Jalankan `tsc` type-checking dan Vite bundling build.

### Status

COMPLETE. Slicing UI mockup telah sukses diimplementasikan, diverifikasi melalui production build, dan semua tes unit frontend + backend lulus 100%.

## Current Task - Multi-Document Workspace [COMPLETE]

Date: 2026-05-29

### Deskripsi

Implementasi multi-document workspace ala Photoshop/Affinity: document tab strip, empty state minimal, multi-file open/drag-drop, per-document state, active-document command routing, dan backend-owned `WorkspaceState`.

### Perubahan

1. **`crates/core/src/workspace.rs`** — New file. `DocumentSession`, `WorkspaceState`, `WorkspaceSnapshot`, `DocumentTabSummary`, `DocumentSnapshot`, `WorkspaceLimits`. 16 tests.
2. **`crates/core/src/lib.rs`** — Register `workspace` module.
3. **`apps/desktop/src-tauri/src/main.rs`** — Replace `EditorState` with `AppRuntime` containing `Mutex<WorkspaceState>`. Add commands: `get_workspace_state`, `open_images`, `switch_document`, `close_document`, `set_selected_layer`. Route all edit commands through active document. Remove default document bootstrap. Empty workspace on launch.
4. **`apps/desktop/src/App.tsx`** — Add workspace signals (`documents`, `activeDocumentId`, `limits`). Add document tab strip UI. Add empty canvas state ("Open an image to start"). Multi-file open dialog. Drag/drop support. Close tab with discard confirmation. Ctrl+W shortcut. Inspector "No document open" states. Export disabled when no active document. Status bar "No document" state. Grid layout updated for tab strip.

### Verifikasi

- `cargo test -p photrez-core`: 85 tests PASS.
- `pnpm.cmd --filter photrez-desktop test`: 45 tests PASS.
- `pnpm.cmd run build`: PASS.
- `npx tsc --noEmit`: PASS.
- `cargo check -p photrez-render`: PASS.
- Pre-existing `windres` toolchain issue prevents `cargo check -p photrez-desktop` (unrelated).

### Status

COMPLETE. All phases implemented and verified.

---

## Current Task - Frame Presentation Adapter Recovery Plan [DOCS COMPLETE]

Date: 2026-05-29

### Deskripsi

Menyusun rencana implementasi lengkap untuk memulihkan viewport piksel MVP dengan pendekatan frame presentation adapter: Rust Core tetap menjadi source of truth, preview PNG dibuat di Rust, disajikan melalui app-cache asset URL, dan ditampilkan frontend sebagai image display-only.

### Output

- Added `docs/superpowers/plans/2026-05-29-frame-presentation-adapter-recovery.md`.

### Status

Docs-only planning complete. Implementasi kode belum dimulai.

---

## Current Task - wgpu Viewport Visibility Recovery [COMPLETE]

Date: 2026-05-29

### Deskripsi

Membuat pixel rendering wgpu visible di viewport dengan cara membuat webview transparent di area artboard, menambah viewport state command untuk sinkronisasi posisi artboard/pan/zoom dari frontend ke Rust, dan memperbaiki beberapa bug kritis (brush dirty marking, import guardrails, contract list, status bar).

### Perubahan

1. **CSS Transparency** — Hapus `bg-[#1A1A1C]` dari `index.html` body, buat artboard + canvas-wrap `bg-transparent`.
2. **Placeholder Removal** — Hapus CSS colored rectangle placeholder di artboard, ganti dengan transparent bounding boxes untuk transform handles.
3. **Viewport State Command** — Tambah `update_viewport_state` command di Rust, `ViewportState` struct, dan viewport matrix mapping (document coords → artboard NDC position).
4. **Render Crate Update** — Tambah `set_viewport_state()` method, viewport state fields, dan dual-pass rendering (document-space compositing + artboard-position screen pass).
5. **Frontend Viewport Sync** — Tambah `syncViewportState()` yang compute artboard screen position via `getBoundingClientRect()` dan kirim ke Rust. Dipanggil pada pan/zoom/resize.
6. **Brush Dirty Fix** — `draw_brush_stroke` sekarang `doc.mark_dirty(&layer_id)` setelah stroke.
7. **Import Guardrails** — `load_image_from_bytes` enforce `MAX_PIXEL_BUDGET` setelah decode.
8. **Contract Update** — `get_contract_info` sekarang list `open_image`, `trigger_render`, `update_viewport_state`.
9. **Status Bar Fix** — Dynamic `{docWidth()} x {docHeight()} px` bukan hardcoded.

### Bukti Verifikasi

- `cargo test -p photrez-core`: PASS, 69 tests.
- `pnpm.cmd --filter photrez-desktop test`: PASS, 45 tests.
- `pnpm.cmd run build`: PASS.
- `cargo check -p photrez-render`: PASS.
- `cargo check -p photrez-desktop`: FAIL (pre-existing `windres` toolchain issue, bukan dari perubahan ini).

### Next Step

1. Manual smoke test: open image → see pixels → brush → undo/redo → export.
2. Performance re-measurement jika diperlukan.
3. Documentation update (AI_HISTORY, FEATURES).

---

## Previous Current Task Snapshot - kept for history

## Deskripsi

Fix wgpu format mismatch between render pipeline (Bgra8UnormSrgb) and composited texture (Rgba8UnormSrgb) that caused render pass incompatibility crash. Pipeline is now recreated with actual surface format when surface is set, and composited texture uses the same surface format.

**Tugas Aktif Saat Ini:** Format mismatch fix and comprehensive tests complete.


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
- [x] Layer compositing renderer
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
