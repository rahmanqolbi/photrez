# 26 - Wireframe Layout Spec (MVP Desktop)

Dokumen ini mendefinisikan blueprint layout UI utama untuk Photrez MVP.

## 1) Target Viewport

- Primary target: desktop `1366x768` dan `1920x1080`.
- Minimum supported: `1280x720` (dengan panel collapse).

## 2) Shell Regions

1. Top Bar
2. Left Tool Rail
3. Center Canvas Viewport
4. Right Inspector
5. Bottom Status Bar

Urutan region ini dianggap locked untuk MVP.

## 3) Region Dimensions (Baseline)

### Top Bar

- Height: `44px`
- Content: file actions, quick actions, command trigger, project title.

### Left Tool Rail

- Width: `52px`
- Item size default: `28px` hit area minimum.
- Scroll allowed jika tools bertambah.

### Right Inspector

- Width default: `320px`
- Width minimum: `280px`
- Panel di dalam inspector: Layers, Properties, History (tab/section).

### Bottom Status Bar

- Height: `28px`
- Content minimum: zoom level, doc dimension summary, status hint.

### Canvas Viewport

- Mengisi sisa area shell.
- Harus tetap prioritas area terbesar.

## 4) Responsive Rules (Desktop)

- Pada `1280x720`:
1. Inspector default boleh collapse.
2. Tool labels disembunyikan, icon-only.
3. Secondary actions pindah ke menu overflow.

- Tidak ada target mobile/tablet untuk MVP.

## 5) Panel Behavior

- Inspector panel bisa collapse/expand per section.
- State panel (open/close) dipertahankan per session (opsional v1.1, bukan wajib MVP).
- Collapse tidak boleh menggeser urutan shell utama.

## 6) Keyboard and Focus Flow

- `Ctrl+K`: command launcher trigger.
- `Tab` order harus logis: top bar -> tool rail -> inspector -> status bar.
- Focus indicator wajib terlihat di elemen interaktif.

## 7) Out-of-Scope

- Multi-window editor layout.
- Docking panel bebas ala IDE.
- Split canvas multi-tab view.

## 8) Implementation Handoff Notes

- Setiap perubahan struktur region harus update dokumen ini.
- Gunakan token dan rules dari:
1. `docs/22-ui-style-guide.md`
2. `docs/23-design-tokens.md`
3. `docs/24-ui-component-rules.md`
