# AI History — Photrez

> Dokumen ini mencatat SEMUA perubahan signifikan yang dibuat oleh AI.
> Urutan: terbaru di atas. Jangan hapus entri lama — hanya tambahkan di atas.
> Baca juga: `AI_CONTEXT.md` (aturan), `AI_CURRENT_TASK.md` (status), `FEATURES.md` (fitur), `ARCHITECTURE.md` (arsitektur)

---

## [2026-05-28] FEATURE — M3 Completion: Transform Handles & Controls

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Mengimplementasikan seluruh kebutuhan M3 completion termasuk transform handles UI (bounding box + 8 resize handles + rotation handle), editable W/H inputs di properties panel, flip horizontal/vertical buttons + keyboard shortcuts (Ctrl+G, Ctrl+Shift+G), rotation input, commit/cancel transform (ESC), dan rotation angle snapping (15-degree with Shift).

**Perubahan:**
1. **`apps/desktop/src/App.tsx`** — Menambahkan transform state signals (transformDragging, transformDragType, transformDragStart, transformDragOriginal), bounding box overlay dengan 8 resize handles + rotation handle, mouse interaction handlers untuk resize dan rotation drag, editable W/H inputs di properties panel, rotation input, flip buttons di options bar, keyboard shortcuts Ctrl+G/Ctrl+Shift+G/ESC, rotation angle snapping, dan helper functions (handleTransformChange, handleFlip, handleTransformHandleMouseDown, getLayerCurrentTransform).
2. **`apps/desktop/src/index.css`** — Menambahkan cursor utility classes untuk resize handles (nwse, nesw, ew, ns) dan rotation cursor.
3. **`docs/32-keyboard-shortcut-map.md`** — Menambahkan Ctrl+G/Shift+G shortcuts dan Shift rotation snap behavior.

**Validasi:** ✅ Seluruh unit test Rust workspace lolos. SolidJS Vite frontend build sukses 100% tanpa error (`pnpm run build`).

## [2026-05-28] FEATURE — Tasks 9-11: Flip Shortcuts, ESC Cancel, Rotation Snapping

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Menambahkan fitur interaksi keyboard dan transform polish untuk alur kerja editing yang lebih cepat:
1. **Flip Shortcuts (Ctrl+G / Ctrl+Shift+G)**: Menambahkan shortcut keyboard Ctrl+G untuk flip horizontal dan Ctrl+Shift+G untuk flip vertical pada layer yang dipilih.
2. **ESC to Cancel Transform**: Menambahkan handler ESC untuk membatalkan transform aktif — memdeselect layer, menghentikan transform drag, dan mereset state drag.
3. **Rotation Angle Snapping**: Menambahkan snapping rotasi ke kelipatan 15 derajat saat tombol Shift ditahan selama drag rotasi, memungkinkan kontrol presisi tinggi.

**Perubahan:**
1. **`apps/desktop/src/App.tsx`** — Menambahkan shortcut Ctrl+G dan Ctrl+Shift+G di `handleKeyDown`, handler ESC untuk deselect layer, dan logic snapping 15 derajat di case rotasi `handleArtboardMouseMove`.

**Validasi:** ✅ SolidJS Vite frontend build sukses tanpa error (`pnpm run build` selesai sukses).

## [2026-05-28] FEATURE — Milestone 5: Export Pipeline & Color Selection

### Kategori: FEATURE / CORE / SHELL / UI / FRONTEND

**Deskripsi:** Mengimplementasikan seluruh kebutuhan Milestone 5 termasuk Porter-Duff alpha blending compositor dan format encoding (PNG, JPEG, WebP) di Rust Core, native OS Save File dialog via `rfd` crate, pixel-level color sampling (Eyedropper tool, hotkey `I`), dan overlapping Swatches color pickers dengan native color inputs dan Options Bar dropdown modal:
1. **Rust Core Compositing & Encoding**: Mengimplementasikan layered Porter-Duff alpha-compositing flattening bottom-to-top di `crates/core/src/export.rs` dan file format encoding (PNG, JPEG, WebP) menggunakan `image` crate. JPEG dikomposit di atas solid white background untuk sRGB.
2. **Native File Save Dialog**: Mengintegrasikan `rfd` (Rust File Dialogs) di desktop-shell Tauri backend untuk membuka save dialog OS secara native tanpa capability configuration overhead, menulis bytes ke path yang dipilih.
3. **Pixel-Level Color Sampling**: Mengimplementasikan algorithm `sample_pixel` di `crates/core/src/document.rs` untuk blend warna layered pada posisi (x,y), mendaftarkan command di Tauri backend, dan menghubungkan Left Rail Eyedropper button (hotkey `I`) untuk sampling warna secara dinamis pada drag pointer / click.
4. **Overlapping Swatches Native Pickers & Dropdown Modal**: Mengintegrasikan input native `<input type="color" class="opacity-0 absolute">` di Foreground & Background swatches untuk snappy custom color picking. Membuat dropdown modal premium di Options Bar untuk format selection (PNG/JPEG/WEBP) dan quality range slider.

**Perubahan:**
1. **`crates/core/src/export.rs`** — Mengimplementasikan `flatten_document`, `export_document` dengan borrow lifetime fix, serta menulis unit test `test_document_flattening` dan `test_image_export_encoding`.
2. **`crates/core/src/document.rs`** — Mengimplementasikan method `sample_pixel` dan unit test `test_sample_pixel`.
3. **`apps/desktop/src-tauri/Cargo.toml`** — Menambahkan dependency `rfd = "0.15"`.
4. **`apps/desktop/src-tauri/src/main.rs`** — Mendaftarkan command handler `export_document` dan `sample_pixel`, serta meregister handler dan command contract info.
5. **`apps/desktop/src/App.tsx`** — Menambahkan signals untuk export settings, Eyedropper Left Rail button, keyboard hotkey `I`, pointer handlers untuk dynamic color sampling, native color picker inputs overlaying swatches, dan Options Bar contextual export dropdown modal.

**Validasi:** ✅ Seluruh unit test Rust workspace lolos sempurna tanpa error (`cargo test --workspace` dengan isolated target dir). SolidJS Vite frontend build sukses 100% bebas dari warnings/errors (`pnpm run build` selesai sukses).

## [2026-05-28] FEATURE — Milestone 4: Brush & Eraser Engine

### Kategori: FEATURE / CORE / SHELL / UI / FRONTEND

**Deskripsi:** Mengimplementasikan seluruh kebutuhan Milestone 4 termasuk raster Brush dan Eraser engine di Rust Core, mendaftarkan IPC Tauri Command, mengaktifkan tombol toolbar Left Rail & contextual Options Bar, serta membuat zero-latency `<canvas>` overlay drawing dan circular hover preview cursor:
1. **Rust Core Painting & Interpolation**: Mengimplementasikan sub-pixel brush segment interpolation di `crates/core/src/layers.rs` dan custom alpha-blending math di `crates/core/src/brush.rs` dengan testing suite untuk menjamin kelancaran brush stroke.
2. **Tauri Command draw_brush_stroke**: Mendaftarkan command Tauri `draw_brush_stroke` di `apps/desktop/src-tauri/src/main.rs`, mendukung asinkron undo/redo stack snapshot.
3. **SolidJS Toolbar & Context Options**: Mengaktifkan tombol Brush (B) dan Eraser (E) di Left Rail, global keyboard shortcuts, dan dynamic options bar signals (Hardness, Opacity, dan Size).
4. **Zero-Latency Canvas Overlay**: Menumpuk `<canvas>` overlay 2D di artboard untuk preview stroke lokal agar interaksi drag melukis instan tanpa jeda IPC, serta menggambar circular size preview div yang mengikuti kursor mouse saat tool aktif.

**Perubahan:**
1. **`crates/core/src/brush.rs`** — Mengimplementasikan method `paint_pixel` pada `BrushSettings`.
2. **`crates/core/src/layers.rs`** — Mengimplementasikan method `draw_brush_stroke` pada `Layer` dan menulis unit test `test_brush_stroke_drawing` serta `test_eraser_stroke_drawing`.
3. **`apps/desktop/src-tauri/src/main.rs`** — Mendaftarkan command Tauri `draw_brush_stroke` dan builder invoke handler.
4. **`apps/desktop/src/App.tsx`** — Mengimpor Switch/Match, menginisialisasi signal `brushHardness`, `brushOpacity`, `strokePoints`, `isDrawingStroke`, `canvasHoverPos` dan `strokeCanvasRef`, memetakan key triggers 'B' dan 'E', mendefinisikan layout contextual options bar untuk brush parameters, memperbarui pointer handlers, serta menambahkan overlay `<canvas>` dan circular div kursor preview.

**Validasi:** ✅ Seluruh 29 unit test Rust workspace lolos sempurna tanpa error (`cargo test --workspace`). SolidJS Vite frontend build sukses 100% bebas dari warnings/errors (`pnpm run build`).

## [2026-05-28] FEATURE — Milestone 3: Selection, Transform, Crop, and Resize

### Kategori: FEATURE / CORE / SHELL / UI / FRONTEND

**Deskripsi:** Mengimplementasikan seluruh kebutuhan Milestone 3 termasuk Canvas Cropping dan Resizing di Rust Core & Tauri, visual dashed selection overlay, visual crop boundaries overlay dragging, options bar crop actions, dan properties panel coordinate nudges:
1. **Rust Core Crop & Resize**: Mengimplementasikan logika `crop_canvas` (untuk memperbarui ukuran kanvas, menggeser koordinat layer secara relatif, dan menghapus seleksi aktif) dan `resize_canvas` di `crates/core/src/document.rs` lengkap dengan unit tests untuk TDD.
2. **Tauri IPC Command Wiring**: Mendaftarkan handler `crop_canvas` dan `resize_canvas` di `apps/desktop/src-tauri/src/main.rs`, terhubung dengan `HistoryStore` asinkron untuk dukungan undo/redo penuh (`Ctrl+Z` / `Ctrl+Y`).
3. **Dynamic Artboard Viewport**: Menghubungkan ukuran visual kanvas artboard agar dinamis mengikuti properti `width` dan `height` dokumen sebenarnya lewat SolidJS signals.
4. **Marching-Ants Selection Rendering**: Merender area seleksi piksel aktif sebagai kotak dengan border oranye orisinal beranimasi putus-putus (*marching ants keyframe animation* di `index.css`).
5. **Visual Crop Overlays & Toolbar Actions**: Mengaktifkan tombol Crop Tool di Left Rail, mendukung penggeseran pointer untuk visualisasi batas pemotongan (*crop selection box overlay*), dan menghubungkan tombol opsi contextual toolbar ("APPLY CROP", "CANCEL", serta input ukuran W & H kanvas) ke Tauri backend.
6. **Properties Coordinates Input Nudge**: Menghubungkan input `X` dan `Y` di panel properti kanan agar dapat diedit secara langsung oleh pengguna untuk memicu relokasi posisi layer aktif via perintah `move_layer`.

**Perubahan:**
1. **`crates/core/src/document.rs`** — Mengimplementasikan `crop_canvas` dan `resize_canvas`, serta menambahkan unit test `test_crop_canvas` dan `test_resize_canvas`.
2. **`apps/desktop/src-tauri/src/main.rs`** — Mendaftarkan Tauri command handler `crop_canvas` dan `resize_canvas`, mendaftarkan di generate handler, dan memperbarui contract info.
3. **`apps/desktop/src/App.tsx`** — Menambahkan state signals `docWidth`, `docHeight`, `selection`, `isDraggingCrop`, `cropStart`, `cropEnd`, mengintegrasikan ke handler pointer, memperbarui artboard markup untuk dynamic size, layers, selection, dan crop overlays, serta memetakan input koordinat properties panel.
4. **`apps/desktop/src/index.css`** — Menambahkan CSS keyframes `@keyframes dash` untuk marching-ants selection marquee.

**Validasi:** ✅ Seluruh 27 unit test Rust workspace lolos sempurna tanpa error (`cargo test --workspace`). SolidJS Vite frontend build sukses 100% bebas dari warnings/errors (`pnpm run build` selesai sukses dalam 5.36s).

---

## [2026-05-28] FEATURE — Milestone 2, Task 2: UI Layer Reordering Controls in Right Inspector

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Mengimplementasikan kontrol pergerakan posisi layer (Z-index reordering) di Right Inspector Layers stack, menghubungkan frontend dengan command IPC `reorder_layer` di Tauri backend:
1. **Penyisipan Handler IPC**: Menambahkan fungsi `handleMoveLayer` di `App.tsx` untuk memanggil perintah backend `reorder_layer` secara asinkron dengan argumen `fromIdx` dan `toIdx`, lalu memperbarui visual layout lewat `syncDocumentState`.
2. **Tombol Mikro (Micro-Buttons) Responsif**: Mengintegrasikan tombol `ChevronUp` dan `ChevronDown` berukuran ramping (`size={14}`) ke dalam action tray setiap baris layer.
3. **Animasi Premium & Anti-Slop (Hover Slide-In)**: Membungkus tombol-tombol agar tersembunyi secara default (`opacity-0 translate-x-1`) dan slide-in dengan mulus ketika mouse menyorot baris layer (`group-hover:opacity-100 group-hover:translate-x-0`).
4. **Edge-Case Locking Dinamis**:
   - Mencegah pergerakan layer teratas visually ke atas dengan mematikan tombol `ChevronUp` (`disabled` & opacity `opacity-0 group-hover:opacity-15 cursor-not-allowed`).
   - Mencegah pergerakan layer terendah visually ke bawah dengan mematikan tombol `ChevronDown` (`disabled` & opacity `opacity-0 group-hover:opacity-15 cursor-not-allowed`).
5. **Layout Stabil & Bebas Distorsi**: Penempatan elemen tombol dirancang agar tidak mengganggu spasi visual layer row, mempertahankan grid modular berkarakter desktop native premium yang rapi.

**Perubahan:**
1. **`apps/desktop/src/App.tsx`** — Mengimpor `ChevronUp`, mendefinisikan `handleMoveLayer`, mengadaptasi loop `<For each={layers()}>` untuk menampung index getter `index()`, serta menginjeksi elemen tombol ChevronUp dan ChevronDown ke baris layout.

**Validasi:** ✅ SolidJS + Vite frontend build sukses sempurna tanpa error (`pnpm run build` selesai dalam 8.19s). Rust core workspace unit tests lolos penuh (`cargo test --workspace` selesai sukses dengan 13 passed tests).

## [2026-05-28] FEATURE — Milestone 2, Task 1: BitmapData & Memory Budget in Rust Core

### Kategori: FEATURE / CORE / BACKEND

**Deskripsi:** Membangun fondasi sistem piksel yang sesungguhnya di Rust backend (`crates/core`) untuk menggantikan visual mockup, serta mengimplementasikan batas anggaran memori piksel yang ketat demi stabilitas Tauri:
1. **Integrasi BitmapData & PixelFormat**: Memperkenalkan enum `PixelFormat` (mendukung `RGBA8` default MVP) dan struct `BitmapData` untuk menyimpan data piksel mentah (`pixel_data: Vec<u8>`).
2. **IPC Performance Guard**: Menandai field `pixel_data` dengan `#[serde(skip)]` sehingga buffer piksel berat dilewati saat serialisasi JSON. Hal ini mencegah payload IPC JSON yang sangat besar terkirim setiap kali status dokumen dimutasi, menjaga performa tetap responsif dan lancar.
3. **Penyelamat Memori (MAX_PIXEL_BUDGET)**: Menetapkan batas atas alokasi kumulatif memori piksel untuk seluruh layer dokumen sebesar **256 MB decoded RGBA** (`268_435_456` bytes).
4. **Validation Boundary**: Menambahkan helper `calculate_memory_usage` dan metode `add_layer_safe` untuk menghitung dan mencegah alokasi piksel berlebih. Tauri command handler `add_layer` diselaraskan agar menolak penambahan layer yang melebihi batas dengan pesan error `E_RESOURCE_LIMIT` murni tanpa merusak riwayat undo/redo.

**Perubahan:**
1. **`crates/core/src/layers.rs`** — Mengimplementasikan `PixelFormat`, `BitmapData` (dengan skip annotation), menyisipkan `bitmap_ref` ke `Layer`, menginisialisasi buffer dengan warna putih opaque default, dan menambahkan pengujian layer.
2. **`crates/core/src/document.rs`** — Menyisipkan konstanta batas memori budget, menambahkan `calculate_memory_usage` dan `add_layer_safe`, serta menyertakan pengujian unit `test_memory_budget_under_limit` and `test_memory_budget_over_limit`.
3. **`apps/desktop/src-tauri/src/main.rs`** — Menyelaraskan command handler `add_layer` untuk menampung pemeriksaan budget memori piksel dan mengembalikan respons error terenkapsulasi `E_RESOURCE_LIMIT` bila terlampaui.

**Validasi:** ✅ Rust Workspace test suite (`cargo test --workspace`) lolos penuh dengan **12 passed unit tests** sukses. Frontend build (`pnpm run build`) selesai sukses dengan tipe TypeScript yang presisi.

---

## [2026-05-28] FEATURE — Right Inspector Idea A (Recessed Layers & History Compartment)

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Mengimplementasikan konsep "Idea A" untuk menyulap area bawah Right Inspector Panel menjadi sasis nampan fisik berkedalaman (Recessed Compartment). Menghilangkan tampilan latar belakang panel kanan yang datar, dan menggantinya dengan tray mekanis dengan detail visual:
1. **Wadah Tenggelam (Sunken Tray)**: Membungkus tab Layers dan History dalam kontainer dengan latar belakang abu-abu midnight (`#161618` / `bg-studio-canvas`) dan bayangan mekanis ke dalam (`shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]`), memberikan ilusi depth 3D yang meyakinkan layaknya Figma atau Lightroom.
2. **Bingkai Tajam Solid**: Memagari nampan dengan crisp 1px solid border (`border-studio-border`) serta sudut tumpul membulat (`rounded-lg`) agar nest sempurna dengan chassis luar.
3. **Konsistensi Visual Antar Tab**: Menerapkan wadah yang identik dan berdimensi persis sama untuk tab History, memastikan stabilitas spasial ketika berpindah tab.
4. **Optimasi Scroll & Integrasi Header**: Memisahkan panel header dari kontainer scroll agar tetap terkunci di bagian atas tray (`flex-shrink-0`), dengan warna transparan (`bg-transparent`) yang berpadu halus dengan kedalaman abu-abu midnight.

**Perubahan:**
1. **`App.tsx`** —
   - Mengubah pembungkus tab konten Layers menjadi container `flex-1 min-h-0 flex flex-col` dan memasukkan sunken tray `mx-3 mb-3 bg-studio-canvas border border-studio-border rounded-lg flex-1 flex flex-col overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]` di dalamnya.
   - Menjadikan `header.panel-header` di dalam nampan transparan (`bg-transparent border-b border-studio-border`) dan mengunci posisinya, sementara loop daftar layers dimasukkan ke sub-container scrollable (`flex-grow overflow-y-auto`).
   - Melakukan hal yang sama untuk tab konten History untuk menyelaraskan empty state secara simetris di dalam sasis nampan fisik yang identik.

**Validasi:** ✅ Build verification (`pnpm run build` tsc + vite build) sukses tanpa error dalam 6.11s.

---

## [2026-05-28] FEATURE — Inspector UX Polish (Pill Tabs & Properties Unification)

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Merombak total estetika panel kanan Inspector untuk menghilangkan visual accordion/web-form yang tebal dan melenyapkan visual noise:
1. **Unifikasi Properti**: Menyatukan collapsible Transform dan Opacity menjadi satu kartu **Properties** terpadu. Meletakkan slider Opacity langsung di bawah grid koordinat sebagai baris ramping berlabel `OPACITY` dengan persentase di sisi kanan, menghapus drawer kedua yang redundant serta kotak input teks `100` yang mubazir.
2. **Segmented Tab Bar (macOS Style)**: Mengganti tab bar penuh selebar kolom (50/50) yang kaku dengan bar kapsul rounded melayang (`mx-3 my-2 bg-studio-canvas p-1 rounded-lg`). Tab `LAYERS` dan `HISTORY` melayang di dalamnya dengan transisi halus ke warna aktif (`bg-studio-elevated shadow-sm`), meniru konvensi desktop native tingkat lanjut.

**Perubahan:**
1. **`App.tsx`** —
   - Mengubah button drawer pertama menjadi "Properties" dan menggabungkan in-line Opacity slider di bawah grid matriks koordinat.
   - Menghapus total drawer collapsible Opacity kedua.
   - Mengganti elemen `.flex.bg-studio-canvas` tab bar dengan `.p-1.bg-studio-canvas.flex.rounded-lg.mx-3.my-2` segmented tab bar.

**Validasi:** ✅ Build verification (`pnpm run build` tsc + vite build) sukses tanpa error dalam 5.94s.

---

## [2026-05-27] FEATURE — Segmented Transform Matrix Coordinate Grid

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Merancang ulang baris input koordinat di seksi Transform pada Inspector menjadi gaya **Segmented Transform Grid** yang sangat presisi tinggi dan terinspirasi dari CAD/Figma. Menggabungkan 4 kotak terpisah tebal (X, Y, W, H) menjadi satu tabel matriks 2x2 modular tunggal, meletakkan label sebagai prefix mikro abu-abu di dalam kolom input yang transparan, dan membuat garis border seluruh matriks menyala oranye Photon Amber secara terpadu ketika salah satu kolom koordinat difokuskan.

**Perubahan:**
1. **`App.tsx`** — Mengganti grid input koordinat di bawah Transform section dengan kontainer tabel matriks 2x2 (`grid grid-cols-2 grid-rows-2 divide-x divide-y border border-studio-border rounded-md bg-studio-input overflow-hidden`) yang menampung prefix labels (`X`, `Y`, `W`, `H`) dan borderless transparent inputs, didukung transisi border dinamis (`focus-within:border-accent transition-colors duration-100`).

**Validasi:** ✅ Build verification (`pnpm run build` tsc + vite build) sukses tanpa error dalam 5.20s.

---

## [2026-05-27] FEATURE — Flush-Left Anchor Active Tool Indicator (Option A)

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Menerapkan Pilihan A (The Flush-Left Anchor) untuk indikator aktif Tool Rail guna melenyapkan visual noise dan menghindari kesan AI slop. Memindahkan garis vertikal oranye Photon Amber keluar dari tombol persegi dan mendudukkannya rata (docked) menempel pada batas border paling kiri sasis jendela Tool Rail. Menjadikan garis indikator lurus tajam 2px x 20px (non-rounded, non-glowing). Selain itu, memperbarui aturan CSS agar ikon SVG tool yang aktif (misal Pen/Move icon) ikut menyala warna oranye Photon Amber secara solid untuk keselarasan warna.

**Perubahan:**
1. **`index.css`** —
   - Mengubah `.tool-btn-raw.active::before` dengan `left: -6px` dan menghapus kelas `rounded-full` agar menjadi strip lurus tajam di ujung kiri.
   - Mengganti target `.tool-btn-raw.active i` menjadi `.tool-btn-raw.active svg` agar ikon SVG Lucide Solid aktif berubah warna secara solid ke Photon Amber.

**Validasi:** ✅ Build verification (`pnpm run build` tsc + vite build) sukses tanpa error dalam 5.88s.

---

## [2026-05-27] FEATURE — Left Tool Rail Polish (Mechanical Desktop Aesthetics)

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Memoles Left Tool Rail untuk meningkatkan estetika mekanis desktop profesional berkinerja tinggi. Menambahkan efek 3D inset shadow pada tombol tool aktif agar tampak masuk secara fisik ke dalam sasis panel. Merancang ulang color swatches menjadi modul interaktif gaya Photoshop lengkap dengan tombol panah melengkung ganda swap-color (pojok kanan atas), tombol default reset warna (pojok kiri bawah), dan mengaitkannya dengan hotkeys global `X` dan `D`.

**Perubahan:**
1. **`App.tsx`** —
   - Menambahkan SolidJS signals `fgColor` dan `bgColor`.
   - Mengubah kontainer swatches menjadi modul interaktif `w-11 h-11` yang merender warna primer/sekunder secara dinamis.
   - Menambahkan tombol Swap (SVG curved arrow) di top-right yang menukar warna latar depan & latar belakang saat diklik.
   - Menambahkan tombol Default (SVG overlapping box Photon Amber & White) di bottom-left yang mereset warna swatches.
   - Menambahkan listener keyboard global untuk hotkey `X` (swap warna) dan `D` (reset ke default).
2. **`index.css`** — Mengubah `.tool-btn-raw.active` agar menerapkan efek bayangan masuk `shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.5)]` yang kokoh, melepaskan drop shadow luar.

**Validasi:** ✅ Build verification (`pnpm run build` tsc + vite build) sukses tanpa error dalam 5.42s.

---

## [2026-05-27] FEATURE — UI Visual De-cluttering (Airy & Lightweight)

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Melakukan pembersihan visual (de-cluttering) menyeluruh di Photrez untuk meredakan kekakuan antarmuka, membuatnya terasa jauh lebih lega (spacious), ringan (airy), namun tetap berkarakter aplikasi desktop native profesional yang kokoh.

**Perubahan:**
1. **`App.tsx`** —
   - Menghapus pembatas `border-b` di bawah Menubar untuk meleburnya secara visual dengan Toolbar menjadi satu blok header chrome terpadu.
   - Menghapus pembatas `border-b` di sekeliling wadah collapsible Transform dan Opacity pada Inspector agar mengalir lebih halus.
   - Menghapus garis spreadsheet pembatas `border-b` di daftar stack Layer.
   - Meningkatkan tinggi baris daftar layer dari `h-7` (28px) menjadi `h-8` (32px) untuk memberikan ruang bernapas yang premium dan nyaman bagi mata.
2. **`index.css`** — Menghapus pembatas `border-b` dari kelas `.panel-header` secara global untuk menyelaraskan dengan estetika tanpa garis tebal.

**Validasi:** ✅ Build verification (`pnpm run build` tsc + vite build) sukses tanpa error dalam 6.12s.

---

## [2026-05-27] FEATURE — Modular Hardware Chassis UI Redesign

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Merombak layout area kerja utama (workspace) dari kolom kaku full-bleed menjadi estetika "Modular Hardware Chassis". Membagi workspace menjadi tiga kontainer/kartu terisolasi (Tool Rail, Canvas Viewport, Inspector) dengan margin dan celah mikro 6px, serta sudut bulat `rounded-[8px]`. Desain ini menjaga kepadatan tinggi alat profesional, meredakan kekakuan visual, tetapi terhindar dari kesan aplikasi web murahan berkat outline solid, bayangan tajam, abu-abu netral, dan struktur menubar/toolbar yang tetap menempel penuh.

**Perubahan:**
1. **`App.tsx`** — Mengubah `.workspace` menggunakan grid p-1.5, gap-1.5, dan bg-studio-bg. Mengubah `.tool-rail`, `.canvas-wrap`, dan `.inspector` menjadi kartu rounded-[8px] dengan border-studio-border dan shadow-pro.
2. **`index.css`** — Menggeser posisi bar aksen aktif `.tool-btn-raw.active::before` dari `left: -6px` ke `left: 3px` serta menambahkan `rounded-full` agar tidak terpotong oleh sudut bulat baru Tool Rail.

**Validasi:** ✅ Build verification (`pnpm run build` tsc + vite build) sukses tanpa error dalam 8.46s.

---

## [2026-05-27] FEATURE — Proportional Fix: Rail 48×36 / Top Bar 44px

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Memperbaiki proporsi layout — tool rail terlalu besar dan menimbulkan kontras visual negatif terhadap elemen inspector. Diselaraskan dengan design spec.

**Akar Masalah:**
1. Tool rail `w-[60px]` vs design spec `48px` (+25% oversize)
2. Button `40×40px` vs design spec `36×36px` (+23% oversize)
3. Grid column `52px` tidak sinkron dengan rail `60px` — menyebabkan centering error + clipping
4. Top bar `36px` vs wireframe spec `44px`
5. Rail gap `gap-1.5` (6px) terlalu longgar

**Perubahan:**
1. **`App.tsx`** — Grid `52px`→`48px`, rail `w-[60px]`→`w-[48px]`, top bar `36px`→`44px`, icon tool `20px`→`18px`
2. **`index.css`** — Button `w-10 h-10`→`w-9 h-9`, gap `gap-1.5`→`gap-1`
3. **`26-wireframe-layout-spec.md`** — Update rail width `52px`→`48px`, item size `28px min`→`36×36px`

**Validasi:** ✅ `tsc` + `vite build` sukses.

---

## [2026-05-27] CLEANUP — Remove Command Palette UI Button (Out of MVP Scope)

### Kategori: CLEANUP / UI / FRONTEND

**Deskripsi:** Menghapus tombol "Command Palette" dari toolbar kanan karena termasuk Layer B (post-MVP). Di aplikasi editor profesional (Photoshop, Figma, Affinity), command palette tidak pernah menjadi tombol eksplisit di toolbar — hanya akses via shortcut keyboard.

**Perubahan:**
1. **`apps/desktop/src/App.tsx`** — Hapus button Command Palette + separator. Hapus import `Terminal` dari lucide-solid.
2. **`docs/32-keyboard-shortcut-map.md`** — Tambah catatan bahwa UI button dihapus, `Ctrl+K` tetap reserved untuk Layer B.

**Validasi:** ✅ `tsc` + `vite build` sukses.

---

## [2026-05-27] FEATURE — Inspector Panel Polish (Collapsible Sections, Tabs, Hover Refinements)

### Kategori: FEATURE / UI / FRONTEND

**Deskripsi:** Polish inspector panel kanan untuk tampilan modern desktop tanpa AI slop:
1. **Collapsible sections** — Transform & Opacity jadi section terpisah dengan chevron toggle (`ChevronRight` rotate 90°), `hover:bg-white/5`, animasi 100ms.
2. **Input compact layout** — X/Y/W/H pakai horizontal label (`X`, `Y`, `W`, `H`) di kiri + input `h-[26px]` fill sisa. Grid 2 kolom.
3. **Opacity slider** — Section sendiri dengan range slider + input number 3 digit di kanan. Nilai % di header section.
4. **Tab redesign** — Icon (`Layers`, `Clock`) + text label. Active state: `border-b-2 border-accent`. Inactive: `border-transparent hover:border-studio-border`.
5. **Layer items** — Height `h-[30px]` (sesuai spec). `title` attribute di semua button. Lock/Trash: tambah `translate-x-1` + `opacity` transition (bukan cuma opacity).
6. **History empty state** — Icon `Clock` 32px (opacity-20) + "No history yet" + subtitle.
7. **Icon ukuran kecil** — Eye 16px (dari 18px), PenTool type 12px (dari 14px), Lock/Trash 14px (dari 16px) untuk density lebih baik.

**Validasi:** ✅ `pnpm run build` — tsc + vite build sukses.

---

## [2026-05-27] BUG FIX — Tailwind CDN Conflict & Tokens Migration

### Kategori: BUG FIX / UI / FRONTEND

**Akar Masalah:**
1. `index.html` memuat `<script src="https://cdn.tailwindcss.com">` (Tailwind Play CDN) BERSAMAAN dengan Vite plugin `@tailwindcss/vite` (Tailwind v4). Dua instance Tailwind berjalan simultan — CDN runtime override styles Vite build, menyebabkan CSS conflict dan artefak garis putih.
2. Lucide icons dimuat via CDN (`unpkg.com/lucide`) tanpa type safety.
3. File `.jsx` duplikat melanggar aturan Strict TypeScript.
4. Banyak design token dari `docs/23-design-tokens.md` belum ada di `@theme` (`--color-text-*`, `--motion-*`, `--color-accent-active`, dll).
5. Hardcoded color values (`text-[#D4D4D8]`, dll) belum menggunakan token.

**Perbaikan:**
1. **`apps/desktop/index.html`** — Hapus CDN Tailwind + Lucide scripts.
2. **`apps/desktop/src/index.css`** — Tambah token: `--color-text-primary/secondary/muted`, `--color-accent-active`, `--color-success/warning/danger`, `--shadow-sm/md/lg`, `--motion-fast/normal/slow`, `--easing-standard`, `--animate-dash`. Ganti hardcoded `border-color`/`bg` dengan token di `@layer base`.
3. **`apps/desktop/src/App.tsx`** — Migrasi dari `<i data-lucide="">` CDN ke komponen `lucide-solid` (PenTool, Move, Brush, dll). Hapus `declare const lucide` dan `lucide.createIcons()`. Ganti semua `text-[#...]` dengan token `text-text-primary/secondary/muted`. Ruler ticks pakai `<For>` loop. SVG animation pindah ke `animate-dash` class.
4. **Hapus file** `App.jsx`, `index.jsx`, `ui-sanity.test.js` (violasi Strict TS).
5. **Install** `lucide-solid@1.16.0` npm package.

**Validasi:** ✅ `pnpm run build` — tsc + vite build sukses tanpa error.

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
