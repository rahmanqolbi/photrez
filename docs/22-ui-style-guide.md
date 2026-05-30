# 22 - UI Style Guide (MVP)

Dokumen ini mengunci arah visual UI Photrez agar hasil kerja AI agent konsisten dengan implementasi antarmuka yang ada saat ini.

## 1) Core Philosophy & Principles (Soft & Snappy)

Mengapa UI Photrez dirancang dengan estetika "Soft & Snappy"? Jawabannya adalah untuk mencapai keseimbangan antara **Profesionalitas** dan **Modernitas**. Berikut adalah pilar filosofis desain kita:

1. **Familiarity & Muscle Memory**: Jangan mereinventasi tata letak antarmuka. Pengguna harus langsung tahu cara menggunakan aplikasi di detik pertama berkat tata letak standar industri (Toolbar atas, Inspector kanan, Tool rail kiri).
2. **Invisible UI (Zero-Tint Neutrality)**: Antarmuka adalah alat, bukan pameran. Warna latar wajib menggunakan abu-abu netral sejati (True Neutral Gray berbasis OKLCH tanpa rona biru/kuning) agar UI tidak mendistorsi atau meracuni persepsi warna mata pengguna terhadap gambar yang sedang diedit. 
3. **Soft & Snappy Aesthetic**: Menghindari "Mechanical Rigidity" yang terlalu kaku (2px) maupun "AI Slop" yang terlalu lembut (wide blurs). Penggunaan radius modular dengan base `6px` (`--radius`) memberikan kesan modern dan ramah, namun elemen internal tetap memiliki densitas tinggi untuk efisiensi kerja.
4. **Docked Precision**: Segala hal harus terstruktur dan geometris. Panel utama menempel (*docked*) ke tepi window untuk memaksimalkan ruang kerja, memiliki **inner rounding** pada sudut yang menghadap canvas untuk menjaga kelembutan visual, dan **outer corners** yang tajam (`0px`) di sisi tepi window.
5. **Distinct Identity**: Identitas Photrez ditanamkan pada warna aksen tunggal **Photon Amber (`oklch(0.74 0.15 55)`)** yang hangat dan bertenaga, memberikan kontras tinggi pada UI yang netral.

## 2) Layout System (Editor Shell)

Struktur shell utama:

1. **AppTitleBar**: macOS/Figma style, height `46px`. Menampilkan menu compact, title file aktif terpusat di tengah ("File Name — photrez"), dan window controls native (Minimize, Maximize, Close). Logo brand "pz" berupa box mini 30px di kiri.
2. **DocumentTabsBar**: Height `44px`. Tab dokumen yang aktif memiliki indikator garis aksen Photon Amber setinggi 2px di bawahnya.
3. **OptionBar (Tool Options)**: Height `44px`. Menampung opsi parameter tool aktif (seperti brush size, opacity, blending mode) di dalam border-field penampung yang elegan.
4. **LeftToolRail**: Width `52px`. Menampung tombol tool vertikal setara `36px` (`size-9`) dengan icon berukuran `18px`. Di bawah terdapat pembatas mekanis setebal `1px` dan tombol swatch warna primer.
5. **RightDock**: Double-column docked layout dengan total lebar `560px` (atau `634px` pada resolusi 2XL). Terdiri atas dua sub-panel side-by-side:
   - **PropertiesPanel** (`300px` / `336px` 2XL): Transform coordinates, anchor grid, basic slider controls (Temp, Tint horizontal slider).
   - **LayersPanel** (`260px` / `298px` 2XL): Layers list, adjustment layer toggles, layer blending modes, and a dedicated thumbnail Navigator at the bottom.
6. **Canvas Viewport**: Area kerja utama di tengah ("The Well") yang mengisi sisa area shell secara responsif.
7. **BottomStatusBar**: Height `32px`. Menampilkan informasi zoom level, dimensi dokumen aktif, status hint, dan tombol toggle status koneksi desktop.

## 3) Visual Density

- Base spacing unit: `4px` (`gap-1` = 4px, `gap-2` = 8px).
- Panel internal padding: `12px` hingga `14px` (`px-3.5 py-3.5`).
- Compact controls dengan tinggi `26px` pada inputs, select dropdowns, dan primary actions dalam panel editor desktop untuk memaksimalkan efisiensi pixel.

## 4) Typography Rules

- UI Font Family: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **Tabular Nums**: Wajib menggunakan `font-variant-numeric: tabular-nums;` secara global agar angka tidak bergeser saat nilainya berubah (sangat krusial untuk koordinat Transform dan persentase slider).
- Base font size: `13px` (Standar OS Desktop Native yang nyaman dibaca).
- Panel Headers: `14px` font-semibold.
- Sub-labels / Input labels: `11px` atau `12px` font-medium.
- Secondary / Meta text: `12.5px` atau `12px`.
- Jangan gunakan teks lebih kecil dari `11px`.

## 5) Color and Surface Rules

- Gunakan design tokens dari `docs/23-design-tokens.md`.
- Canvas viewport menggunakan background paling gelap `oklch(0.17 0 0)` agar artboard/gambar terlihat menonjol.
- Panel-panel menggunakan background `oklch(0.235 0 0)` sedangkan control inputs di dalam panel menggunakan recessed field `oklch(0.265 0 0)` dengan border `oklch(0.34 0 0)`.

## 6) Iconography Rules

- Icon style: outline consistent.
- Tool rail icon size: `18px`.
- Panel controls icon size: `14px` atau `15px`.
- Status bar & window controls icon size: `15px` atau `16px`.

## 7) Interaction States

Setiap komponen interaktif wajib punya state:
1. `default`: Flat styling dengan subtle borders.
2. `hover`: Perubahan background `hover:bg-white/[0.045]` atau `hover:bg-white/5` yang sangat halus.
3. `active`: Background aktif atau penambahan garis aksen.
4. `focus-visible`: Border color berubah menjadi `--editor-accent` (`oklch(0.74 0.15 55)`).
5. `disabled`: Opacity redup dan kursor default.

## 8) Motion Rules

- Motion harus subtle dan cepat.
- Default transition duration: `100ms` hingga `150ms`.
- Panel open/close boleh animate ringan dengan transition properti max-width/opacity.

## 9) Accessibility Baseline

- Kontras teks utama vs background minimal memenuhi standar umum keterbacaan (menggunakan warna teks terang `oklch(0.84 0 0)` di atas panel gelap).
- Focus ring wajib terlihat jelas untuk keyboard navigation menggunakan warna Photon Amber.

## 10) Enforcement

- Semua update UI harus mengacu:
  1. `docs/23-design-tokens.md`
  2. `docs/24-ui-component-rules.md`
  3. `docs/24-b-anti-webapp-guidelines.md` (Aturan Native UX)
- Jika ada pattern baru, update dokumen ini dulu sebelum implementasi luas.
