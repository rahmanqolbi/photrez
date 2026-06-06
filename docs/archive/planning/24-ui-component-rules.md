# 24 - UI Component Rules (MVP)

Dokumen ini berisi aturan implementasi komponen agar hasil UI antar agent konsisten dengan komponen nyata yang ada di codebase saat ini.

## 1) Core Components List

Komponen prioritas desktop editor:

1. **AppTitleBar**: Header window desktop, desktop titlebar style, height `46px`.
2. **LeftToolRail**: Sidebar vertikal tool, width `52px`.
3. **RightDock**: Container sidebar ganda, side-by-side Properties + Layers.
4. **PropertiesPanel**: Panel parameter transform, anchor grid, dan basic sliders (`300px` / `336px` 2XL).
5. **LayersPanel**: Panel daftar layer kustom, eye visibility, thumbnail mask, navigator (`260px` / `298px` 2XL).
6. **Slider / SliderRow**: Slider parameter biphasic (Temp, Tint) dan monophasic (Opacity) kustom.
7. **NumField / SelectField**: Input box angka dan dropdown pilihan terdesentralisasi, height `26px`.
8. **PropRow**: Baris layout label + input control dengan label lebar `58px` (`w-[58px]`).

## 2) Component Styling Rules

### Button Rules

- Height default: `26px` (panel inputs), `28px` (RightDock Export button).
- Padding horizontal: `12px` (standard), `8px` (dense).
- **Radius**: Dilarang keras menggunakan bentuk "Pill" (`rounded-full`). Gunakan radius `--radius-md` (calc(var(--radius) - 2px) = 4px) untuk memancarkan presisi alat profesional.
- Primary action/state pakai background aksen `--editor-accent` atau text aksen.

### Tab Sizing Rules

- Seluruh tab kontrol (seperti DocumentTabsBar dan tab panel RightDock/Layers) **wajib menggunakan ukuran huruf `text-[12px] font-medium`** secara konsisten. Ini dilakukan untuk menghindari ilusi optik di mana tombol interaktif reaktif tampak lebih besar daripada teks properti biasa berukuran 13px.

### Input / Select Field Rules

- Height default: `26px` (`h-[26px]`).
- Style: **Defined Box (Recessed)**.
- Background: `--editor-field` (`oklch(0.265 0 0)`).
- Border: `1px solid var(--editor-field-border)` (`oklch(0.34 0 0)`).
- Focus: Border color berubah menjadi aksen `--editor-accent` (`oklch(0.74 0.15 55)`).
- **Typography Input**: Dilarang keras menggunakan font monospace (`font-mono`) atau `font-bold` di dalam input angka (seperti koordinat). Gunakan font UI utama biasa. Keutuhan lebar angka akan dijaga otomatis oleh CSS `tabular-nums` yang di-set di root.

### Slider Rules (Biphasic & Monophasic)

- Slider digambar menggunakan baris kustom horizontal tipis setinggi `3px` (`h-[3px] rounded-full`).
- Handle slider berbentuk bulat berdiameter `10px` (`size-[10px] rounded-full border border-black/40 bg-[#d4d4d4] shadow-[0_1px_2px_rgba(0,0,0,0.5)]`).
- Slider memiliki dukungan:
  - **Center-Tick Balance**: Titik balance tengah setinggi `3px` (`size-[3px] rounded-full bg-white/40`) pada sumbu tengah `left-1/2` untuk adjustment biphasic (seperti Temp & Tint).
  - **Horizontal Gradient Track**: Mendukung warna track bergradien melalui style inline `background-image` (seperti Temp biru-kuning dan Tint hijau-magenta).
- **Slider Row Layout**: Terdiri atas label `w-[58px]`, slider bar responsif, dan teks nilai numerik di sebelah kanan selebar `28px` / `44px` (`w-[28px] shrink-0 text-right`).

### Panel Rules (Docked Precision)

- Panel utama (Sidebar/Inspector) wajib menempel (*anchored/docked*) ke tepi window samping, atas, dan bawah.
- **Visual Separation**: Pemisahan area tidak menggunakan margin luar (`m-2`), melainkan border tipis `1px solid var(--editor-divider)` (`oklch(0.3 0 0)`) di sisi yang berbatasan dengan Canvas.
- **Rounding Strategy**: 
  - Hanya sudut yang menghadap ke arah Canvas (inner corners) yang diberikan `--radius-lg` atau `--radius-md`. 
  - Sudut yang menempel ke window (outer corners) wajib tajam (`0px`).
- **Panel Header**:
  - Background: Default panel background `bg-editor-panel` or `bg-editor-topbar`.
  - Height: `46px`.
  - Typography: `14px`, `font-semibold`.

### LeftToolRail & Color Swatches Rules

- **MVP Tools Restriction**: LeftToolRail hanya memuat **6 Alat MVP Utama** (Move, Rectangle Select, Crop, Eyedropper, Brush, Eraser) dalam satu kolom stack vertikal tanpa dividers.
- **mt-auto Spawner**: Modul warna dan tombol ellipsis didorong secara fisik menggunakan pembatas mekanis `mt-auto` di bagian paling bawah.
- **Diagonal Swatches bertumpuk**:
  - Ukuran kontainer luar: `size-[36px]` (mempet penuh untuk efisiensi ruang).
  - Terdiri atas dua elemen lingkaran absolut berukuran `size-[35px]` tumpang tindih secara diagonal.
  - Memakai properti `clip-path` diagonal: Foreground `polygon(0 0, 100% 0, 0 100%)` (top-left) dan Background `polygon(100% 100%, 100% 0, 0 100%)` (bottom-right).
  - Jarak diagonal transparan `1.4px` dihasilkan secara presisi melalui offset posisi `top-0 left-0` vs `bottom-0 right-0`.

### Layer List Item Rules

- Height item: `50px` (`h-[50px]`).
- State aktif: Menggunakan background active row `--editor-row-active` (`oklch(0.3 0 0)`). State non-aktif hover menggunakan `hover:bg-white/[0.03]`.
- Thumbnail Layer:
  - Kotak mini `34x34px` (`size-[34px] rounded-[3px]`) dengan border tipis dan background `bg-cover`.
  - Adjustment layer menggunakan thumbnail background conic kustom berwarna hitam-putih.
  - Layer dengan mask menampilkan thumbnail tambahan berupa lingkaran putih di dalam kotak hitam.
- Visibility: Eye / Sun icon di sebelah kiri (`size-4 text-editor-icon` atau `text-editor-text-dim`).

---

## 3) Component Review Checklist (Before Merge)

- [ ] Komponen menggunakan Tailwind v4 utility classes dan OKLCH CSS variables.
- [ ] Teks angka telah diamankan dengan format `tabular-nums` atau berlabuh pada width konstan.
- [ ] Semua state interaktif lengkap (default/hover/active/focus).
- [ ] Tidak ada padding atau margin luar yang memicu gap visual di tepi window desktop.
- [ ] Radius sudut mematuhi aturan Docking (outer corners 0px, inner corners rounded).
