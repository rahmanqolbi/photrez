# 26 - Wireframe Layout Spec (MVP Desktop)

Dokumen ini mendefinisikan blueprint layout utama untuk Photrez MVP desktop berdasarkan tata letak aktual yang diimplementasikan.

## 1) Target Viewport

- Primary target: desktop `1366x768` dan `1920x1080`.
- Minimum supported: `960x640` (editor shell min-width `960px` dan min-height `640px` dengan scroll overflow panel).

## 2) Shell Regions (Docked Precision)

Photrez menggunakan sistem tata letak **Docked Precision** di mana fungsionalitas UI berlabuh langsung pada tepi window tanpa margin luar untuk stabilitas dan efisiensi ruang maksimum:

1. **AppTitleBar**: Fixed top, anchored. Menu compact hover di kiri, judul file terpusat di tengah, control tombol native di kanan. Rounding: `0px` (flat).
2. **Left Tool Rail**: Docked to left/top/bottom edges. Lebar `52px` fixed. Rounding: `0px` pada bagian luar.
3. **DocumentTabsBar**: Fixed top-bar di bawah Titlebar, height `44px`.
4. **OptionBar (Tool Options)**: Fixed top-bar di bawah TabsBar, height `44px`.
5. **Center Canvas Viewport**: Area kerja utama (The "Well") di mana artboard gambar dirender secara fleksibel.
6. **RightDock (Double Sidebar)**: Docked to right/top/bottom edges. Total lebar `560px` (`634px` pada layar lebar 2XL) yang membagi ruang secara vertikal berdampingan:
   - **PropertiesPanel**: Lebar `300px` (atau `336px` 2XL).
   - **LayersPanel**: Lebar `260px` (atau `298px` 2XL).
7. **Bottom Status Bar**: Fixed bottom, anchored. Height `32px`. Rounding: `0px`.

---

## 3) Region Dimensions (Baseline)

### Top Bar Region (AppTitleBar + TabsBar + OptionBar)
- **AppTitleBar**: Height `46px`.
- **DocumentTabsBar**: Height `44px`.
- **OptionBar**: Height `44px`.
- Total tinggi area navigasi dan opsi tool atas: `134px`.

### Left Tool Rail
- Width: `52px`.
- Item size: `36×36px` (`size-9`) dengan padding interaktif 0.5px. Icon berukuran `18px`.
- Tombol swatch warna primer di bawah pembatas mekanis vertikal.

### RightDock (Inspector Sidebar)
- **Total width**: `560px` (Standard) atau `634px` (2XL screens).
- Panel terbagi rata secara horizontal:
  - **Properties**: Lebar `300px` / `336px`. Mengatur transforms (posisi, ukuran, rotasi, skala, anchor matrix) dan basic corrections (WB, Temp, Tint).
  - **Layers & History**: Lebar `260px` / `298px`. Mengatur blending modes, layers list, layer actions, dan thumbnail Navigator.
- Docking panel ini bersifat fixed pada desktop resolusi tinggi, namun memiliki batas responsif di mana sidebar bisa disembunyikan menggunakan command `Ctrl+Shift+P`.

### Bottom Status Bar
- Height: `32px`.
- Konten: zoom indicator, status hint, status server bridge, dan deskripsi dokumen.

### Canvas Viewport
- Mengisi sisa ruang kosong secara responsif.
- Canvas background menggunakan true-dark canvas fill `oklch(0.17 0 0)` untuk memisahkan artboard secara tegas.

---

## 4) Responsive Rules (Desktop)

- **Pada resolusi <= 1280x720**:
  1. Sidebar `RightDock` tersembunyi secara default. Dapat dipicu/ditampilkan sebagai overlay floating dengan lebar maksimum `min(92vw,634px)` melalui tombol toggle di titlebar atau shortcut `Ctrl+Shift+P`.
  2. Canvas viewport beradaptasi secara otomatis untuk mengisi seluruh sisa ruang layar.
- **Pada resolusi >= 1440x900**:
  1. `RightDock` terkunci statis berdampingan secara horizontal (side-by-side) demi kemudahan alur kerja multi-panel profesional.

---

## 5) Keyboard and Focus Flow

- `Ctrl+Shift+P`: Toggle RightDock sidebar collapse/expand.
- `Tab` order mengalir logis: Titlebar Menus -> Left Tool Rail -> Option Bar Fields -> Canvas Artboard -> Properties Inputs -> Layers Actions -> Status Bar.
- Focus indicator menggunakan border aksen hangat Photon Amber yang kontras.
