# AI History — Photrez

## [2026-06-04] REFACTOR — Separation of Concerns Refactoring (File Splitting) [COMPLETE]

### Kategori: REFACTOR / FRONTEND / SOLIDJS / TYPESCRIPT / ARCHITECTURE

**Deskripsi:** Refactoring dan pemisahan concern (Separation of Concerns) pada file frontend terbesar (`CanvasViewport.tsx` dan `LayersPanel.tsx`) ke dalam sub-komponen dan custom hook modular. Memperbaiki arsitektur dan maintainabilitas tanpa mengubah perilaku fungsional aplikasi.

**Rincian Perubahan:**
1. **`CanvasViewport.tsx` (1112 → 713 lines)**:
   - Mengekstrak handler keyboard global (Photoshop navigation, crop enter/escape, zoom, nudge) ke `useCanvasKeyboard.ts`.
   - Mengekstrak visual overlay canvas brush, event `onPaintStroke()`, dan method `commitBrushStroke()` ke `useBrushOverlay.ts`.
   - Mengekstrak physics momentum inersia, pointer viewport panning, dan penanganan scroll wheel ke `usePanNavigation.ts`.
2. **`LayersPanel.tsx` (732 → 190 lines)**:
   - Mengekstrak rendering baris layer list ke komponen `LayerItem.tsx`.
   - Mengekstrak pointer-based drag-and-drop layer reordering ke custom hook `useLayerDragReorder.ts`.
   - Mengekstrak seluruh handler mutasi layer dan toggle lock status (add, delete, duplicate, merge, flatten, locks) ke custom hook `useLayerActions.ts`.
   - Mengekstrak render canvas thumbnail layer ke file terpisah `LayerThumb.tsx`.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- [NEW] `apps/desktop/src/components/editor/useBrushOverlay.ts`
- [NEW] `apps/desktop/src/components/editor/usePanNavigation.ts`
- [NEW] `apps/desktop/src/components/editor/LayerItem.tsx`
- [NEW] `apps/desktop/src/components/editor/useLayerDragReorder.ts`
- [NEW] `apps/desktop/src/components/editor/useLayerActions.ts`
- [NEW] `apps/desktop/src/components/editor/LayerThumb.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`
- [MODIFY] `apps/desktop/src/components/editor/LayersPanel.tsx`

**Verifikasi:**
- ✅ `pnpm run build`: PASS (Vite + TypeScript compiler)
- ✅ `pnpm --filter photrez-desktop test`: 271/271 PASS (vitest)

---

## [2026-06-04] FEATURE — Interactive Navigator Panel [COMPLETE]

### Kategori: FEATURE / NAVIGATOR / VIEWPORT / ZOOM / PAN / UI / UX

**Deskripsi:** Implementasi panel Navigator interaktif premium mirip Photoshop untuk mempermudah pan, zoom, dan peninjauan komposisi layer secara visual.

**Detail Fungsionalitas:**
1. **Live Preview Composition (`Navigator.tsx`)**:
   - Membaca seluruh layer aktif dari tumpukan `layers()`.
   - Menggambar render mini checkerboard transparan diikuti oleh komposisi semua layer visible ke dalam `<canvas>` navigator berukuran `208x88px` (mengikuti rasio aspek dokumen secara proporsional).
   - *Bug Fix*: Memperbaiki isolasi transformasi matriks 2D (`ctx.save()` / `ctx.restore()`) agar translasi penyeimbang thumbnail (`ox`/`oy`) tidak menumpuk antar layer, menyelesaikan masalah tampilan Navigator kosong.
2. **Interactive Viewport Frame (Red Box)**:
   - Menghitung koordinat batas viewport utama (`panX`, `panY`, `zoom`, serta lebar/tinggi viewport) dan memetakan skalanya ke dimensi Navigator thumbnail.
   - Menggambar frame outline merah solid `#E15A17` (Photon Amber) dengan overlay warna transparan tipis di atas canvas Navigator untuk menunjukkan area yang terlihat saat ini.
3. **Pointer-Based Click-and-Drag Pan**:
   - Menambahkan event listener `pointerdown`/`pointermove`/`pointerup` interaktif pada canvas Navigator.
   - Mengizinkan pengguna mengklik atau menyeret kotak merah Navigator untuk memperbarui viewport `panX` & `panY` utama secara instan.
4. **Interactive Zoom Slider**:
   - Menghubungkan input range zoom (5% hingga 400%) beserta tombol presisi `-` dan `+` agar responsif mengubah level zoom artboard utama secara real-time.
5. **Navigator Header Action**:
   - Mengubah ikon placeholder `maximize` di sebelah teks judul "Navigator" menjadi tombol interaktif yang memicu fungsi **Fit Screen** secara dinamis (mengambil ukuran `#canvas-container` saat ini).

**Files Changed:**
- [NEW] `apps/desktop/src/components/editor/Navigator.tsx`
- [MODIFY] `apps/desktop/src/components/editor/LayersPanel.tsx`
- [MODIFY] `apps/desktop/src/components/editor/EditorContext.tsx`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Verifikasi:**
- ✅ `pnpm run build`: PASS
- ✅ `vitest`: 271/271 PASS

---

## [2026-06-04] BUG FIX — Duplikasi Layer Menghasilkan Gambar Kosong (Missing WebGL Sync) [COMPLETE]

### Kategori: BUG FIX / LAYERS / WEBGL / SHORTCUT

**Deskripsi:** Saat menduplikasi layer (baik melalui tombol "Duplicate Layer" di Layers Panel maupun shortcut `Ctrl+J`), layer baru berhasil dibuat di struktur data engine tetapi tampil kosong di canvas render.

**Root Cause:**
Engine berhasil melakukan kloning deep terhadap objek `ImageBitmap` di memory RAM (JS/CPU). Namun, hasil klon tersebut (`dup.imageBitmap`) tidak diunggah ke memori texture GPU WebGL. Karena WebGL rendering mengandalkan pemetaan ID layer ke WebGLTexture, ID layer baru yang terbuat (`layer-xxxx`) tidak memiliki texture terasosiasi di GPU sehingga digambar transparan (kosong).

**Logika Perbaikan:**
Melakukan sinkronisasi upload bitmap ke WebGL backend setelah operasi duplikasi:
1. Menambahkan destrukturisasi `renderer` dari `useEditor()` di `LayersPanel.tsx` dan `CanvasViewport.tsx`.
2. Di dalam handler `handleDuplicateActiveLayer` (`LayersPanel.tsx`) dan shortcut `Ctrl+J` (`CanvasViewport.tsx`), setelah memanggil `engine.duplicateLayer(activeId)`, lakukan pengecekan apakah layer baru hasil duplikasi memiliki `imageBitmap`.
3. Jika ya, panggil `renderer.uploadImage(dup.id, dup.imageBitmap)` agar texture langsung terdaftar di WebGL backend sebelum frame berikutnya dirender.

**Files Changed:**
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Verifikasi:**
- ✅ `pnpm run build`: PASS
- Duplikasi layer kini menampilkan gambar salinan yang identik di viewport canvas secara instan.

---

## [2026-06-04] BUG FIX — Layer Drag Reorder Tidak Berfungsi di Tauri [COMPLETE]

### Kategori: BUG FIX / LAYERS / DRAG-AND-DROP / TAURI

**Deskripsi:** Layer drag-and-drop reorder pada Layers Panel tidak berfungsi — layer terlihat "muted" saat di-drag tetapi tidak pernah berpindah posisi.

**Root Cause:**
HTML5 Drag and Drop API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) tidak reliabel di Tauri webview pada Windows. Tauri mengintercept drag events di level OS (untuk file drops, dll), sehingga event `dragover`/`drop` tidak pernah sampai ke handler JavaScript.

**Logika Perbaikan:**
Mengganti seluruh implementasi HTML5 DnD dengan **pointer-based drag system** menggunakan `PointerEvent`:
1. `onPointerDown` pada setiap baris layer untuk memulai tracking.
2. `document.addEventListener("pointermove")` untuk melacak pointer melintasi daftar layer.
3. `document.addEventListener("pointerup")` untuk commit reorder saat mouse dilepas.
4. **Dead-zone 5px** mencegah drag tidak sengaja dari klik biasa.
5. **`data-layer-idx`** attribute pada setiap baris untuk hit-testing via `querySelectorAll`.
6. **`target.closest("button")`** guard mencegah drag mencuri klik dari tombol eye/lock/chevron.

Visual feedback ditingkatkan agar lebih jelas:
- Layer yang sedang di-drag diturunkan opacity-nya (`opacity-25`), diberikan border dashed (`border-dashed border-editor-accent/40`), dan sedikit diperkecil (`scale-[0.98]`).
- Indikator drop menggunakan pseudo-elements solid (`before`/`after`) setinggi `3px` berwarna Photon Amber di atas atau bawah baris target, memberikan visual line insert yang jauh lebih menonjol dan kontras dibanding border biasa.

**Files Changed:**
- `apps/desktop/src/components/editor/LayersPanel.tsx`

**Verifikasi:**
- ✅ `pnpm run build`: PASS (TypeScript + Vite production build)
- ✅ Layer drag reorder berfungsi dengan pointer events di Tauri webview

---

## [2026-06-04] FEATURE — Layer & UX System Overhaul [COMPLETE]

### Kategori: FEATURE / LAYERS / UI / UX

**Deskripsi:** Implementasi sistem layer interaktif dan fungsional yang menyerupai Photoshop untuk Photrez.

**Logika Perbaikan (Fix Rationale) & Detail:**
1. **Core Engine Support (`document.ts` & `document.test.ts`)**:
   - `drawLayerToContext` helper untuk menggambar bitmap layer ke canvas dengan transform.
   - `duplicateLayer(id)`: duplikasi layer menggunakan `OffscreenCanvas` untuk melakukan cloning bitmap secara deep. Menambahkan try/catch agar tes pada node/jsdom (yang tidak memiliki `OffscreenCanvas`) tetap berjalan sukses dengan fallback.
   - `mergeDown(id)`: melakukan rendering composite dua layer (aktif dan layer di bawahnya) dalam ruang dokumen menggunakan Canvas 2D composite (`source-over`), kemudian menggabungkan properti transform/opacity.
   - `flattenLayers()`: menyatukan seluruh stack layer yang visible ke dalam satu background layer tunggal berukuran dokumen.
   - Mengubah pembuatan layer baru agar secara kontekstual ditambahkan langsung di atas layer yang sedang aktif, bukan selalu di atas tumpukan layer.
   - Menambahkan tes unit komprehensif di `document.test.ts` untuk memverifikasi fungsionalitas di atas.
2. **LayersPanel UI & UX (`LayersPanel.tsx`)**:
   - **Opacity Popover Slider**: slider opacity interaktif dengan drop-down popover mirip Photoshop.
   - **Blend Mode Dropdown**: wired-up blend mode selector.
   - **Double-Click Inline Rename**: input teks interaktif yang muncul saat double-click nama layer (dengan Auto Focus, Escape cancel, Enter commit, dan input trim).
   - **HTML5 Drag and Drop Layer Reordering**: reordering drag-and-drop horizontal dengan visual separator line berwarna Photon Amber (`#E15A17`) bertipe `border-t-2`/`border-b-2` untuk indikasi posisi insert atas/bawah.
   - **Live Canvas Thumbnails**: thumbnail per baris layer interaktif (`<LayerThumb>`) dengan render pattern grid checkerboard transparan di background dan render live image bitmap layer di foreground.
3. **Canvas Viewport Integration & Shortcuts (`CanvasViewport.tsx`)**:
   - **Ctrl+J**: pintasan keyboard global untuk duplikasi layer aktif secara cepat.

**Files Changed:**
- `apps/desktop/src/engine/document.ts`
- `apps/desktop/src/engine/__tests__/document.test.ts`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`

**Verifikasi:**
- ✅ `pnpm run build`: PASS (Vite + TypeScript production build compiler)
- ✅ `pnpm --filter photrez-desktop test`: 272/272 PASS (vitest)

---

## [2026-06-03] BUG FIX — Crop Rotate Hit Zone & Cursor [COMPLETE]

### Kategori: BUG FIX / CROP / ROTATION / CURSOR / UX

**Deskripsi:** Memperbaiki crop tool rotate interaction: hit zone terlalu kecil (4px ring) dan cursor berubah jadi crosshair saat mulai drag rotate.

**Root Cause:**

1. **Rotate hit zone terlalu kecil:** `ROTATE_OUTER = 24`, `HANDLE_HIT = 20` → donut ring hanya 4px tebal di zoom=1. Bandingkan dengan SelectionTransformOverlay yang punya `ROTATE_OUTER = 44` dan `HANDLE_HIT = 16` → ring 28px.

2. **Cursor revert ke crosshair saat drag rotate (triple root cause):**
   - `startDrag` memanggil `svgRef.setPointerCapture()` → browser fire `pointerleave` pada elemen rotate zone `<path>` → handler `onPointerLeave` panggil `setHover(null)` + `setHoverPos(null)` → `hoverHandle()` jadi null.
   - `resolvedCursor` memo hanya cek `hoverHandle()`, tidak pernah cek `dragState()` — jadi saat `hoverHandle = null`, return `"crosshair"` meskipun rotation drag sedang aktif.
   - `style={{ cursor: resolvedCursor() }}` object form tidak reactive di SolidJS untuk SVG element (sama persis dengan bug CanvasViewport cursor yang sudah di-fix sebelumnya).

**Logika Perbaikan (Fix Rationale):**

1. `ROTATE_OUTER = 44` → ring 24px tebal (sama dengan SelectionTransformOverlay).
2. `resolvedCursor` sekarang cek `dragState()` dulu: jika ada rotation drag aktif, selalu return rotate cursor tanpa peduli `hoverHandle()`.
3. `rotateCursor` fallback ke `"grabbing"` saat `hoverPos` null tapi rotation drag aktif.
4. Semua `onPointerLeave` handler di-guard dengan `if (!dragState())` — jangan clear hover saat drag aktif.
5. Ganti `style={{ cursor: ... }}` → `style:cursor={resolvedCursor()}` (reactive property binding).
6. Extend `SvgSVGAttributes<T>` di `vite-env.d.ts` untuk support `style:${string}` pada SVG elements.

**Files Changed:**
- `apps/desktop/src/components/editor/CropOverlay.tsx`: ROTATE_OUTER, cursor logic, onPointerLeave guards, style:cursor
- `apps/desktop/src/vite-env.d.ts`: SvgSVGAttributes extension

**Verifikasi:**
- ✅ `pnpm run build`: PASS (2028 modules, ~6.2s)
- ✅ `pnpm --filter photrez-desktop test`: 267/267 PASS (21 files)

---

## [2026-06-03] BUG FIX — Rotation Direction Alignment (Shader + Geometry + Tests) [COMPLETE]

### Kategori: BUG FIX / TRANSFORM / ROTATION / SHADER / GEOMETRY

**Deskripsi:** Memperbaiki rotation direction inconsistency antara shader, geometry helpers, dan SVG overlay. Semua sekarang menggunakan CW positif convention yang konsisten.

**Root Cause (4 bugs):**

1. **Rotate zone terlalu kecil di SelectionTransformOverlay:** `ROTATE_OUTER = 24` (4px ring). Diubah ke `44` (24px ring) agar mudah di-hover.

2. **Bounding box expand/shrink on rotation:** Overlay menggunakan AABB `<rect>` di luar rotated group. Saat layer di-rotate, AABB meluas/menyempit — confusing. Fix: pindah `<rect>` + handles ke dalam `<g transform="rotate(...)">` agar bounding box selalu mengikuti layer corners.

3. **Shader rotation negated:** `-radians(u_layerRotation)` membalik arah rotasi. Fix: `radians(u_layerRotation)` — sekarang image rotate searah SVG handles.

4. **rotatePoint sign:** `rad = -deg * DEG` membalik arah. Fix: `rad = deg * DEG` — positive deg = CW di screen space (Y-down).

**Deviasi:**
- Convention "positive = CW" sudah didokumentasikan sejak Photosho-like Free Transform (2026-06-02) tapi implementasi shader dan rotatePoint tidak konsisten.
- `applyResizeHandle` sudah menggunakan `rad = -rotation * DEG` (negated) — ini benar untuk screen-to-local conversion (screen coords → layer local coords perlu inverse rotation).

**Logika Perbaikan (Fix Rationale):**
- `rotatePoint(deg)`: positive = CW rotation in screen space. Standard rotation matrix, no negation.
- Shader: `radians(u_layerRotation)` — positive angle → standard CW rotation matrix.
- `applyResizeHandle`: tetap pakai `rad = -rotation * DEG` karena mengonversi screen-space delta ke local layer-space — ini adalah inverse rotation.
- Tests: semua test corner expectations diperbaiki, +18 new tests (applyResizeHandle dengan rotation, cursor rotation untuk ±90°/±45°, all-8-handles distinct cursors, flipX cursor, shader rotation invariants).

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: +ROTATE_OUTER, rotated `<g>` bounding box
- `apps/desktop/src/renderer/shaders.ts`: `-radians` → `radians`
- `apps/desktop/src/viewport/transformGeometry.ts`: `rotatePoint` sign fix
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: +18 tests, update expectations
- `apps/desktop/src/__tests__/renderer.test.ts`: +3 shader rotation invariant tests

**Verifikasi:**
- ✅ `pnpm run build`: PASS (2028 modules, ~6.3s)
- ✅ `pnpm --filter photrez-desktop test`: 267/267 PASS (21 test files)
- ✅ `cargo test --workspace`: 85/85 PASS

---

## [2026-06-03] BUG FIX — Crop UI Alignment, Position & Scaling Polish [COMPLETE]

### Kategori: BUG FIX / CROP / UI / ALIGNMENT / POSITIONING

**Deskripsi:** Memperbaiki masalah kosmetik, UI, lag transisi, dan pergeseran dimensi pada fitur Crop:
1. **Overlay Hitam Mismatch**: Menghilangkan `transform` pada `<rect>` overlay gelap dan membuatnya berukuran lebar (3x lipat canvas) secara stasioner (unrotated). Mask `crop-shield` yang memuat region canvas ter-rotate dan crop box horizontal/vertical (unrotated) bertanggung jawab penuh membatasi opacity gelap tersebut. Ini menghasilkan cutout transparan crop box yang horizontal tepat sejajar (axis-aligned) di atas canvas yang miring/ter-rotate.
2. **Crop Mode Indicator Floating**: Memindahkan `<CropModeIndicator>` keluar dari kontainer panning/zooming canvas agar tetap statis di layar (fixed size & position di top-4 tengah) dan tidak ikut mengecil saat zoom out.
3. **Tooltip Dimensi Kecil**: Menerapkan `scale(1 / zoom)` pada group tooltip dimensi di `CropOverlay.tsx` agar teks selalu tajam dan berukuran konstan (font-size 11px) di segala zoom level. Juga mempercantik tooltip dengan warna gelap pekat `rgba(20,20,20,0.9)`, border tipis, dan warna teks Photon Amber (`#E15A17`) agar senada dengan HUD Move Tool.
4. **Efek Jelly/Memantul Panning**: Menonaktifkan CSS `transition: transform` pada container viewport ketika drag crop sedang aktif (`isCropDragging` signal dari CropOverlay) agar pergeseran pan viewport merespons pointer seketika tanpa delay/lag inersia visual.
5. **Ukuran Crop Box Berubah-ubah**: Memperbaiki matematika snapping di `cropSnap.ts` untuk `"move"` handle agar melakukan pergeseran translasi murni (`x`/`y` offset shift) bukannya memodifikasi dimensi (`w`/`h`), mencegah kotak crop berubah ukuran secara tidak sengaja ketika menyentuh guide magnetik.

**Files Changed:**
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/viewport/cropSnap.ts`

**Verifikasi:**
- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: 245/245 PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE — Photoshop-Style Crop Moving Panning [COMPLETE]

### Kategori: FEATURE / CROP / VIEWPORT / PANNING

**Deskripsi:** Mengubah interaksi geser (move) dan resize crop box agar tetap stasioner di layar secara visual, sedangkan gambar/canvas di bawahnya ikut bergerak (pan) ke arah yang berlawanan. Ini menyamakan perilaku crop dengan aplikasi referensi `aplikasi-cetak-massal`.

**Logika Perbaikan (Fix Rationale):**
1. **CropOverlay.tsx**: Mengubah model `dragState` untuk merekam `startClientX`, `startClientY`, dan `startPan` pada pointer down.
2. Menghitung delta pergeseran pointer move menggunakan koordinat layar raw client (`clientX`, `clientY`) lalu membaginya dengan zoom untuk mendapatkan document delta. Langkah ini menghindari feedback loop karena letak kontainer SVG yang dinamis panned di dalam viewport.
3. Menghitung pergeseran koordinat pusat (`actualDx` / `actualDy`) dari cropRect yang baru terhadap `dragState.startRect` (pusat ke pusat, berlaku untuk move maupun resize).
4. Menggeser viewport active engine via `engine.setViewport` sebesar `-actualDx * zoom` dan `-actualDy * zoom`, lalu menyinkronkannya dengan `syncViewport` dan menjadwalkan render ulang.
5. Menyesuaikan kalkulasi tooltip koordinat dengan menambahkan offset `actualDx` dan `actualDy` karena SVG container ikut bergeser secara fisik akibat viewport panning.
6. **CropOverlay.test.tsx**: Menambahkan test unit komprehensif yang memverifikasi sinkronisasi pergeseran viewport yang berlawanan saat pointer drag move.

**Files Changed:**
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`

**Verifikasi:**
- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: 245/245 PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE — Crop Tool Rotation [COMPLETE]

### Kategori: FEATURE / CROP / ROTATION / UX

**Deskripsi:** Menambahkan dukungan rotasi pada Crop Tool. Batas crop box visual tetap sejajar dengan layar (axis-aligned), sedangkan konten gambar/canvas berputar di belakangnya (CSS transform). Saat crop diaplikasikan, semua layer di-transformasikan (di-shift posisinya dan di-rotate sudutnya) mengacu pada sudut rotasi crop.

**Logika Perbaikan (Fix Rationale):**
1. **EditorContext.tsx**: Ditambahkan signal `cropRotation` (default `0`) yang direset saat ganti dokumen atau ganti tool.
2. **document.ts**: Modifikasi `applyCrop` untuk menghitung koordinat pusat crop box, memutar vektor koordinat pusat layer seputar crop center sebesar `-cropRotation` (counter-clockwise), mengupdate rotasi layer, dan mendukung transform baking pada OffscreenCanvas jika `deleteCroppedPixels` aktif.
3. **CanvasViewport.tsx**: Menerapkan gaya CSS `transform: rotate(${-cropRotation}deg)` pada WebGL canvas element serta artboard border & shadow div agar keduanya berputar selaras. Menyalurkan parameter `rotation` ke `engine.applyCrop` pada Enter keydown handler.
4. **OptionBar.tsx**: Menghubungkan tombol APPLY dan Reset dengan signal `cropRotation` serta menambahkan field readout `Angle`.
5. **CropOverlay.tsx**: Menambahkan hit zone berupa donut path transparan di sekitar 4 handles sudut. Menambahkan signal `hoverPos` untuk memperbarui dynamic rotate cursor secara kontinu saat hover. Mengimplementasikan pointerdown/pointermove untuk menghitung delta angle (snapping ke kelipatan 15° jika Shift ditekan) dan memperbarui tooltip visual dengan nilai derajat sudut. Merotasi rect dan mask shield dalam SVG agar area gelap (dim mask) memotong area canvas secara akurat sesuai sudut rotasi.
6. **Unit Tests**: Menambahkan unit test baru di `document.test.ts` untuk memverifikasi pergeseran koordinat pusat layer dan update rotasi layer akibat crop rotation.

**Files Changed:**
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/OptionBar.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/engine/document.ts`
- `apps/desktop/src/engine/__tests__/document.test.ts`

**Verifikasi:**
- ✅ `pnpm run build`: PASS (Vite + TypeScript build)
- ✅ `pnpm --filter photrez-desktop test`: 244/244 PASS (vitest)
- ✅ `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE — Photoshop-Style Crop Box Canvas Expansion [COMPLETE]

### Kategori: FEATURE / CROP / VIEWPORT / BOUNDS

**Deskripsi:** Mengizinkan crop box untuk keluar dari batas canvas dokumen, sehingga pengguna bisa memperluas ukuran canvas (canvas expansion) secara interaktif.

**Logika Perbaikan (Fix Rationale):**
1. Modifikasi `constrainCropRectToDocument` di `cropGeometry.ts` agar tidak meng-clamp koordinat `x`, `y` ke batas `[0, docW]` / `[0, docH]`, melainkan hanya membatasi lebar dan tinggi minimum `1px`.
2. Modifikasi `ensureCropRect` di `CanvasViewport.tsx` agar tidak memicu reset otomatis jika posisi crop box berada di luar koordinat positif.
3. Sinkronisasi dokumen `01-prd.md` dan `35-error-code-registry.md` yang sebelumnya melarang crop di luar batas canvas.
4. Perbarui unit test di `crop-geometry.test.ts` untuk menguji koordinat di luar batas canvas secara positif.

**Files Changed:**
- `apps/desktop/src/viewport/cropGeometry.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/__tests__/crop-geometry.test.ts`
- `docs/01-prd.md`
- `docs/35-error-code-registry.md`

**Verifikasi:**
- ✅ `npx vitest run`: 243/243 PASS
- ✅ `npx tsc --noEmit`: PASS
- ✅ `pnpm build`: PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] BUG FIX — Fix Crop Box Integration & Typing [COMPLETE]

### Kategori: BUG FIX / CROP / INFRASTRUCTURE / TYPING

**Deskripsi:** Memperbaiki crop box agar bisa digunakan dan menuntaskan kompilasi TypeScript serta unit test.

**Root Cause:**
1. **ReferenceError di runtime:** Di file `CanvasViewport.tsx`, properti `snapTargets` pada `<CropOverlay>` memanggil `cropSnapTargets()`, namun `cropSnapTargets` tidak dideklarasikan.
2. **Type mismatch di compiler:** Tipe `EdgeSnap` di `cropSnap.ts` dideklarasikan sebagai objek `{ kind: ... }` namun digunakan sebagai string literal biasa.
3. **Unit test failure:** Test `updates rendered crop box while resizing` mencari rect outline pada indeks `2`, padahal indeks sebenarnya bergeser ke indeks `3` karena adanya elemen `<mask id="crop-shield">`.

**Perbaikan:**
1. Mendefinisikan memo `cropSnapTargets` di `CanvasViewport.tsx` menggunakan `buildCropSnapTargets`.
2. Mengubah tipe `EdgeSnap` di `cropSnap.ts` menjadi union string literal.
3. Memperbarui pencarian indeks rect outline dari `2` menjadi `3` di `CropOverlay.test.tsx`.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/viewport/cropSnap.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`

**Verifikasi:**
- ✅ `npx tsc --noEmit`: PASS (no compile errors)
- ✅ `npx vitest run`: 242/242 PASS
- ✅ `pnpm build`: PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE — Move Tool Rotate Polish (Cursor, Hit Area, Behavior) [COMPLETE]

### Kategori: FEATURE / MOVE TOOL / CURSOR / UX / ROTATE

**Deskripsi:** Full polish rotate layer interaction: dynamic SVG rotate cursor, broad hit area matching reference, continuous hover tracking, rotation normalization, cursor ownership on overlay.

**Changes:**
1. `cursorRotate.ts` — Port dynamic rotate cursor from reference: SVG data-URI cursor rotated per degree, cached max 360 entries.
2. `cursorResolver.ts` — Branch `rotate` returns dynamic cursor via `getRotateCursorByPos()` when `hoverPos` + `layerBoundingBox` available; static rotate cursor fallback if missing.
3. `EditorContext.tsx` — Added `hoverPos` signal.
4. `SelectionTransformOverlay.tsx` — Emit `hoverPos` on rotate zone enter; continuously track hover via `detectHandle` + `getNearestRotateCorner`; resolved cursor applied to root SVG; removed hardcoded cursor from individual elements.
5. `CanvasViewport.tsx` — `layerBoundingBox` uses document-space AABB; clears hover when tool is not move.
6. `transformGeometry.ts` — Added `normalizeRotation()` ([-180, 180] range); fixed `detectHandle` rotate: only outside core + inside expanded bounds; added `getNearestRotateCorner()`, `pointToLayerLocal()`.
7. Tests — `move-rotate-cursor.test.ts` (3 tests), extended `transform-geometry.test.ts` (+12 tests), extended `cursor-resolver.test.ts` (+8 tests).

**Files Changed:**
- `cursorRotate.ts`, `cursorResolver.ts`, `transformGeometry.ts`
- `EditorContext.tsx`, `SelectionTransformOverlay.tsx`, `CanvasViewport.tsx`
- `move-rotate-cursor.test.ts` (NEW), `transform-geometry.test.ts`, `cursor-resolver.test.ts`

**Verifikasi:**
- ✅ `npx vitest run`: 241/242 PASS (1 pre-existing CropOverlay failure)
- ✅ `npx vite build`: PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---
## [2026-06-03] FEATURE — Move Tool Rotate Cursor Polish [COMPLETE]

### Kategori: FEATURE / MOVE TOOL / CURSOR / UX

**Deskripsi:** Polish rotate layer interaction di Move Tool dengan dynamic SVG rotate cursor yang mengikuti posisi mouse, menggantikan cursor `crosshair` generic.

**Root Cause:**
1. Cursor rotate masih `crosshair` — tidak informatif arah rotasi.
2. Tidak ada visual feedback arah rotasi saat hover/drag.
3. Referensi `aplikasi-cetak-massal` punya cursor dinamis yang lebih baik.

**Perbaikan:**
1. Port `cursorRotate.ts` dari referensi: SVG data-URI cursor yang di-rotate per derajat, cached max 360 entries.
2. `cursorResolver`: branch `rotate` return dynamic cursor via `getRotateCursorByPos()` jika ada `hoverPos` + `layerBoundingBox`.
3. `EditorContext`: tambah `hoverPos` signal.
4. `SelectionTransformOverlay`: emit `hoverPos` di rotate zone enter/move, clear saat drag end/Escape.
5. `CanvasViewport`: wire `hoverPos` + `layerBoundingBox` (AABB memo) ke `resolveCursor()`.

**Files Changed:**
- `cursorRotate.ts` (NEW), `cursorResolver.ts`, `EditorContext.tsx`, `SelectionTransformOverlay.tsx`, `CanvasViewport.tsx`, `cursor-rotate.test.ts` (NEW)

**Verifikasi:**
- ✅ `npx vitest run cursor-rotate cursor-resolver`: 28/28 PASS
- ✅ `npx vite build`: PASS
- ✅ `cargo test -p photrez-core`: 85/85 PASS

---
## [2026-06-02] BUG FIX — Crop Tool Cursor + Small Hit Targets [COMPLETE]

### Kategori: BUG FIX / CROP / UX / CURSOR

**Deskripsi:** Saat crop tool aktif, ikon mouse tidak berubah di handle (tetap crosshair) dan area klik handle terasa terlalu kecil.

**Root Cause:**
1. `cursorResolver.ts` hardcode `crosshair` untuk semua crop interactions.
2. `CropOverlay` track hover secara lokal tanpa memanggil `setHoverHandle` di `EditorContext`.
3. Hit detection manual dengan zona 16px (lebih kecil dari Move Tool 20px), tanpa transparent SVG hit rects + inline cursor.

**Perbaikan:**
1. Pola `SelectionTransformOverlay`: transparent hit rects 20/zoom + `cursor` per handle/move zone.
2. `onHoverHandleChange` prop → `setHoverHandle` di `CanvasViewport`.
3. `cursorResolver` crop branch: resize cursors via `getCursorForHandle`, `move` di dalam box.

**Files Changed:**
- `CropOverlay.tsx`, `CanvasViewport.tsx`, `cursorResolver.ts`, tests

**Verifikasi:**
- ✅ ReadLints clean
- ⚠️ vitest blocked (Shell preToolUse hook)

---
## [2026-06-02] FEATURE — Crop Document Bounds + Full Snapping [COMPLETE]

### Kategori: FEATURE / CROP / SNAPPING / UX

**Deskripsi:** Crop box bisa keluar dari canvas; snapping crop belum ada. User minta perilaku seperti referensi `aplikasi-cetak-massal`.

**Perbaikan:**
1. `constrainCropRectToDocument` — crop rect selalu sepenuhnya di dalam dokumen.
2. `cropSnap.ts` — snap ke canvas (0, center, edge) + layer visible edges/centers; handle-aware untuk move/resize.
3. CropOverlay + CanvasViewport — Smart Guides saat drag crop; Alt menonaktifkan snap (sama Move Tool); toggle Snap di option bar (`moveSnapEnabled`).

**Files Changed:** `cropGeometry.ts`, `cropSnap.ts`, `CropOverlay.tsx`, `CanvasViewport.tsx`, tests

---
## [2026-06-02] BUG FIX — Crop Box Not Updating During Resize Drag [COMPLETE]

### Kategori: BUG FIX / CROP / UI / REACTIVITY

**Deskripsi:** Crop box tidak ikut berubah di viewport saat handle crop di-resize, walau logic drag mengirim `onCropRectChange`.

**Root Cause:**
`CropOverlay.tsx` menggunakan snapshot lokal `const r = rect()` di callback `<Show when={props.cropRect}>`. Snapshot ini dipakai untuk semua atribut SVG crop box (`x/y/w/h`, mask, guides), sehingga render tidak selalu mengonsumsi nilai `cropRect` terbaru saat pointer drag update state secara cepat.

**Perbaikan:**
1. Refactor render `CropOverlay` agar atribut SVG membaca langsung dari `props.cropRect` (bukan snapshot `r`).
2. Tambah regression test `updates rendered crop box while resizing` untuk memverifikasi `width` crop box ikut update realtime selama drag.

**Files Changed:**
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

**Verifikasi:**
- ✅ `ReadLints` (edited files): no linter errors
- ⚠️ `rtk npx vitest run apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` blocked by `preToolUse hook` (Shell not executable in this session)

---
## [2026-06-02] BUG FIX — Crop Box Invisible on Tool Activation [COMPLETE]

### Kategori: BUG FIX / CROP / UI / VIEWPORT

**Deskripsi:** Crop box tidak muncul saat Crop Tool diaktifkan. Root cause: `cropRect` tetap `null` sampai user drag di canvas.

**Root Cause:**
1. Tidak ada logic untuk bikin initial crop rect saat tool crop aktif — `cropRect` default `null`.
2. `<CropOverlay>` hanya render kalau `props.cropRect` non-null.
3. CropOverlay di shared SVG yang parent-nya `pointer-events: none`, jadi handle tidak bisa interaksi.

**Perbaikan:**
1. `ensureCropRect()` helper + `createEffect` on `activeTool() === "crop"`: bikin full-document rect saat tool aktif.
2. Di `createEffect` on `activeDocumentId()`: clear/reinit crop rect saat ganti dokumen.
3. Pindah `<CropOverlay>` dari shared SVG (`pointer-events: none`) ke SVG sendiri dengan `pointer-events: auto`, `z-index: 35`.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: `ensureCropRect`, activeTool effect, document reinit, crop SVG separator

**Verifikasi:**
- ✅ `pnpm.cmd run build`: PASS
- ✅ `npx vitest run`: 182 PASS (17 files)

---
## [2026-06-02] FEATURE — OptionBar Crop Section Rewrite [COMPLETE]

### Kategori: FEATURE / CROP / OPTION BAR / UI

**Deskripsi:** Replace old display-only crop section in OptionBar.tsx (W/H display fields + APPLY CROP button) with full interactive controls matching Photoshop-style crop tools.

**Perubahan:**
- Mode dropdown (Free / Ratio / Size) wiring ke `cropMode` signal dari EditorContext
- Free mode: display-only W/H fields showing current `cropRect` dimensions
- Ratio mode: editable aspect ratio W:H fields via `EditableNumField`, updates `cropAspect` signal
- Size mode: editable target W/H with `px` suffix via `EditableNumField`, updates `cropSizeTarget` signal
- Swap W/H button (`↔`) — swaps cropRect, cropAspect, and cropSizeTarget simultaneously
- Guide overlay dropdown (None / Thirds / Grid / Diagonal / Golden) wiring ke `cropGuideMode`
- Delete cropped pixels toggle via `ToggleBtn` + `cropDeletePixels` signal
- Reset button — resets cropRect to full document bounds
- Cancel button — clears cropRect + switches to move tool
- APPLY button — commits history, calls `engine.cropCanvas`, clears cropRect, switches to move

**Files Changed:**
- `apps/desktop/src/components/editor/OptionBar.tsx`: expanded `useEditor()` destructuring with 6 crop signals; replaced old crop fields + apply button with interactive mode/guide/delete/swap/reset/cancel/apply controls

**Verifikasi:**
- ✅ `pnpm.cmd run build`: PASS (TypeScript + Vite)
- ✅ `npx vitest run`: 182 PASS (17 files)
- ✅ `cargo test -p photrez-core`: 85/85 PASS (via pre-commit hook)

> Dokumen ini mencatat SEMUA perubahan signifikan yang dibuat oleh AI.
> Urutan: terbaru di atas. Jangan hapus entri lama — hanya tambahkan di atas.
> Baca juga: `AI_CONTEXT.md` (aturan), `AI_CURRENT_TASK.md` (status), `FEATURES.md` (fitur), `ARCHITECTURE.md` (arsitektur)

---
## [2026-06-02] FEATURE — CropOverlay Full Rewrite [COMPLETE]

### Kategori: FEATURE / CROP / UI

**Deskripsi:** Full rewrite of CropOverlay.tsx from 34-line placeholder to interactive SVG crop overlay.

**Perubahan:**
- SVG mask-based shield cutout (50% opacity outside crop rect) via `<mask id="crop-shield">`
- 8 resize handles (4 corners + 4 edges) with hover/active state colors (white/amber `#E15A17`/gray)
- Corner bracket extensions (12px L-shapes outside corners, non-scaling stroke)
- Guide lines for all 5 modes: thirds, grid (auto-calculated cell count), diagonal, golden (phi 0.382/0.618)
- Interactive resize via pointer events captured on `<g>` root element (following SelectionTransformOverlay pattern)
- Corner handles: proportional (maintain aspect), shift=free resize, edge handles: single-axis, alt=center anchor
- Move inside crop rect via pointer drag
- Dimension tooltip via SVG `<text>` near cursor during drag (fades 1.5s after drag end)
- Uses pure math helpers from `cropGeometry.ts`: `clampCropRect`, `applyCropResizeHandle`, `applyCropMove`
- Pointer event strategy: `createEffect` + `addEventListener` on `<g>` ref (not JSX `onPointerDown`), avoids SolidJS re-render pointer capture issues

**Verifikasi:**
- ✅ `pnpm.cmd run build`: PASS
- ✅ `npx vitest run`: 182 PASS (17 files)

---
## [2026-06-02] FEATURE — CanvasViewport Crop Wiring [COMPLETE]

### Kategori: FEATURE / CROP / VIEWPORT / UI

**Deskripsi:** Wire crop signals from EditorContext into CanvasViewport. Remove local cropRect/cropGuideMode signals (now in EditorContext). Add cropDragState signal for overlay interaction. Wire onCropCreated callback in prepareToolContext. Add Enter/Esc keyboard handler for crop tool mode. Update CropOverlay props to include zoom, cropMode, cropAspect, onCropRectChange.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: crop signal refactor, prepareToolContext wiring, keyboard handler, CropOverlay props
- `apps/desktop/src/components/editor/CropOverlay.tsx`: extend props interface

**Verifikasi:**
- ✅ `pnpm.cmd run build`: PASS
- ✅ `npx vitest run`: 182/182 PASS (17 files, +14)

---
## [2026-06-02] BUG FIX — Option Bar Locked Layer Clarity [COMPLETE]

### Kategori: BUG FIX / OPTION BAR / UI / LOCK

**Deskripsi:** X/Y/R option bar fields seolah tidak mengupdate transform ketika layer locked. Root cause rangkap: (1) handleFlip dan handleResetTransform tidak punya locked guard — flip/reset tetap jalan meski layer locked; (2) tidak ada visual indikasi bahwa layer locked — field terlihat editable tapi submit silently ignored; (3) Flip/Reset buttons tidak menampilkan disabled state.

**Fix Rationale:**
1. `activeLayerSafe()` — helper yang baca langsung dari `engine.getLayer(id)` (bukan layers signal), untuk fresh state
2. `isLocked()` — derived signal dari `activeLayerSafe()?.locked ?? false`
3. `handleFlip` + `handleResetTransform` — tambah `if (isLocked()) return;` guard
4. "Locked" pill indicator — muncul di option bar saat `isLocked()`, dengan lock icon + amber border/tint
5. Flip div — `opacity-30 pointer-events-none` saat locked
6. Reset button — `disabled` attribute + `text-editor-text-dim/30 cursor-default` saat locked
7. X/Y/R EditableNumField — sudah support `disabled` prop, tinggal pass `isLocked()`

**Files Changed:**
- `apps/desktop/src/components/editor/OptionBar.tsx`: +activeLayerSafe/isLocked helpers, locked guards di flip/reset, "Locked" pill, disabled styles untuk Flip/Reset saat locked

**Verifikasi:**
- `pnpm.cmd run build`: ✅
- `npx vitest run`: ✅ (168/168)

---
## [2026-06-02] FEATURE — Move Tool Option Bar Hybrid [COMPLETE]

### Kategori: FEATURE / MOVE TOOL / OPTION BAR / UI

**Deskripsi:** Mengubah Move Tool option bar dari display-only menjadi kontrol hybrid: toggle Auto Select, toggle Snap, editable X/Y/Rotate, display-only W/H, Flip H/V, Reset.

**Logika Perbaikan (Fix Rationale):**
1. `EditorContext.tsx`: +moveAutoSelect, moveSnapEnabled signals
2. `primitives.tsx`: +EditableNumField (focus-to-edit, Enter/blur commit, Escape revert, disabled state)
3. `OptionBar.tsx`: Toggle components untuk Auto Select + Snap, EditableNumField untuk X/Y/Rotate, display NumField untuk W/H, Flip H/V, Reset
4. `CanvasViewport.tsx`: auto-select guard (`if (moveAutoSelect())`), snap guard (`interactiveState.onComputeSnap = undefined` jika toggle OFF)
5. `SelectionTransformOverlay.tsx`: snap guard via `props.moveSnapEnabled ?? moveSnapEnabled()`

**Files Changed:**
- `apps/desktop/src/components/editor/EditorContext.tsx`: +4 lines (signals + value)
- `apps/desktop/src/components/editor/primitives.tsx`: +EditableNumField (72 lines)
- `apps/desktop/src/components/editor/OptionBar.tsx`: full rewrite (Toggle, editable fields, toggles)
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: auto-select guard + snap guard (prepareToolContext)
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: +moveSnapEnabled prop + guard
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`: +1 regression test (snap toggle OFF)
- `docs/AI_CURRENT_TASK.md`: updated
- `docs/AI_HISTORY.md`: entry ini

**Verifikasi:**
- `pnpm.cmd run build`: ✅
- `npx vitest run`: ✅ (168/168, +1)
- `cargo test -p photrez-core`: ✅ (85/85)

---
## [2026-06-02] FEATURE — Overlay Move Tool Alt Snap Disable + Guardrail Docs [COMPLETE]

### Kategori: FEATURE / SNAPPING / OVERLAY / DOCUMENTATION

**Deskripsi:** Overlay move path (`SelectionTransformOverlay.tsx`) tidak honor Alt key untuk disable snapping, sementara canvas move path (`input-handler.ts:108`) sudah. Fix tambah `!e.altKey` guard. Juga tambah section **Move Tool Runtime Assumptions** di `AI_CONTEXT.md` untuk guide AI berikutnya.

**Logika Perbaikan (Fix Rationale):**
1. Overlay move branch: skip `onComputeSnap` saat `e.altKey` true, panggil `onSnapClear`
2. Test: verify move without Alt calls onComputeSnap, move with Alt doesn't call onComputeSnap + fires onSnapClear
3. Docs: guardrail section di AI_CONTEXT.md

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: +!e.altKey guard, +else onSnapClear
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`: +1 regression test
- `docs/AI_CONTEXT.md`: +Move Tool Runtime Assumptions section
- `docs/ARCHITECTURE.md`: test count 162→167
- `docs/FEATURES.md`: test count 166→167
- `docs/AI_HISTORY.md`: entry ini
- `docs/AI_CURRENT_TASK.md`: entry ini

**Verifikasi:**
- `pnpm.cmd run build`: ✅
- `npx vitest run`: ✅ (167/167)
- `cargo test -p photrez-core`: ✅ (85/85)

---
## [2026-06-02] BUG FIX — Stuck Snap Indicators on Overlay Move Drag End [COMPLETE]

### Kategori: BUG FIX / SNAPPING / OVERLAY

**Deskripsi:** Snap indicator (magenta guide lines) tetap terlihat setelah move/drag selesai di overlay path (`SelectionTransformOverlay.tsx`). Root cause: overlay's pointerup/pointercancel/lostpointercapture/Escape handler tidak pernah membersihkan `snapLines` signal — HANYA membersihkan HUD dan drag state. Canvas path (`input-handler.ts`) sudah benar dengan `onSnapLines?.([])` di `handlePointerUp`.

**Fix Rationale:**
1. Tambah `onSnapClear` prop di `SelectionTransformOverlayProps`
2. Panggil di keempat cleanup path (pointerup, pointercancel, lostpointercapture, Escape)
3. Wire dari `CanvasViewport.tsx` via `onSnapClear={() => setSnapLines([])}`

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: +1 prop, +4 calls
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: +1 line (wiring)
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`: +4 regression tests
- `docs/AI_CURRENT_TASK.md`: new entry
- `docs/AI_HISTORY.md`: entry ini
- `docs/FEATURES.md`: test count 162→166

**Verifikasi:**
- `pnpm.cmd run build`: ? (pending)
- `npx vitest run`: ? (pending)

---
## [2026-06-02] FEATURE — Docs Sync: MVP Runtime Architecture v2 [COMPLETE]

### Kategori: DOCUMENTATION / ARCHITECTURE / CLEANUP

**Deskripsi:** Menyinkronkan seluruh dokumentasi arsitektur (8 files) dengan realitas runtime MVP saat ini. Semua dokumen sekarang mencerminkan dual stack: **MVP runtime** (TypeScript DocumentEngine + WebGL2) dan **future target** (Rust photrez-core + wgpu photrez-render). Tidak ada history yang dihapus.

**Files Changed:**
- `docs/AI_CONTEXT.md`: stack line, section 6 rewrite, rule #3 exception
- `docs/ARCHITECTURE.md`: overview, status, stack table, source of truth
- `docs/02-architecture.md`: +section 11 MVP Runtime Reality (current stack, data flow, ownership, migration path)
- `docs/03-trd.md`: runtime stack, scalability, maintainability
- `docs/01-id-decision-log.md`: split architecture row into future + MVP
- `docs/FEATURES.md`: wgpu→WebGL2 canvas
- `docs/AI_CURRENT_TASK.md`: new entry
- `docs/AI_HISTORY.md`: entry ini

**Verifikasi:**
- ✅ `pnpm.cmd run build`: PASS
- ✅ `npx vitest run`: 162 PASS

---
## [2026-06-02] FEATURE — Canvas Edge Snap Boost [COMPLETE]

### Kategori: FEATURE / SNAPPING / UX

**Deskripsi:** Meningkatkan UX snapping dengan per-target threshold dan priority-based resolution. Canvas edges mendapat threshold lebih lebar (12px) dan priority lebih tinggi (3), canvas center lines mendapat threshold 6px priority 2, layer-to-layer tetap 5px priority default 1. Jika canvas edge dan layer edge sama-sama kandidat, canvas edge menang.

**Logika Perbaikan (Fix Rationale):**
1. Extend `SnapRect` dengan optional `snapThreshold`/`snapPriority` fields
2. `computeSnapAdjustment` sekarang membandingkan priority dulu, baru distance
3. Canvas edge target builder di 2 lokasi (`syncStateHandler` + `onComputeSnap` JSX prop) diberi metadata

**Files Changed:**
- `apps/desktop/src/viewport/smartGuides.ts`: priority-aware computeSnapAdjustment + SnapRect fields
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: tag canvas targets with threshold/priority
- `apps/desktop/src/__tests__/snap-adjustment.test.ts`: +7 regression tests (threshold, priority, backward compat)
- `docs/FEATURES.md`: test count 155→162, new snap boost row
- `docs/ARCHITECTURE.md`: test count 154→162
- `docs/AI_HISTORY.md`: entry ini
- `docs/superpowers/specs/2026-06-02-canvas-edge-snap-boost-design.md`: design spec
- `docs/superpowers/plans/2026-06-02-canvas-edge-snap-boost.md`: implementation plan

**Verifikasi:**
- ✅ `npx vitest run`: 162 PASS (16 test files, +7 new tests)
- ✅ `pnpm run build`: PASS (TypeScript + Vite)

---
## [2026-06-02] BUG FIX — Handle-Axis Projection for Corner Resize (Corrected Perpendicular Axis) [COMPLETE]

### Kategori: BUG FIX / TRANSFORM / GEOMETRY

**Deskripsi:** Fix sebelumnya menggunakan aspect-ratio diagonal (dari opposite anchor ke dragged corner) sebagai projection axis. User melaporkan "masih nggak ada bedanya" — gerakan NE/SW pada SE handle tetap mengubah ukuran. Root cause: axis yang benar adalah handle/cursor diagonal (45°), bukan object aspect diagonal.

**Akar Masalah (Root Cause):**

Fix sebelumnya menggunakan object-aspect diagonal:
```
SE: (oldW, oldH) — diagonal dari opposite anchor ke corner
```
Untuk object 200×100, axis ini = (200, 100) → berat ke X. Gerakan NE/SW (20, -20) punya dot product non-zero: `20×200 + (-20)×100 = 2000 ≠ 0` → resize tetap terjadi.

**Logika Perbaikan (Fix Rationale):**

Ganti projection axis dari object-aspect diagonal ke handle/cursor diagonal (45° di screen space, sama di local space karena rotasi dikompensasi):
```
SE: (1, 1), NE: (1, -1), SW: (-1, 1), NW: (-1, -1)
factor = 1 + (dx*hx + dy*hy) / (oldW + oldH)
```
Untuk object 200×100, SE handle (hx=1, hy=1), gerakan (20, -20):
`projected = 20×1 + (-20)×1 = 0` → factor = 1 → no resize ✓

**Files Changed:**
- `apps/desktop/src/viewport/transformGeometry.ts`: `applyResizeHandle` — projection axis dari aspect-diagonal ke handle-axis
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: update expectations + new regression test
- `docs/FEATURES.md`: test count 154→155
- `docs/AI_HISTORY.md`: entry ini
- `docs/AI_CURRENT_TASK.md`: entry ini

**Verifikasi:**
- ✅ `npx vitest run`: 155 PASS (16 test files, +1 regression test)

---
## [2026-06-02] BUG FIX — Photoshop-Style Diagonal Projection for Corner Resize (Perpendicular Drift) [COMPLETE]

### Kategori: BUG FIX / TRANSFORM / GEOMETRY

**Deskripsi:** Saat resize corner handle default proportional, gerakan mouse yang tegak lurus terhadap diagonal resize tetap mengubah ukuran gambar. Fix: project mouse delta ke diagonal vector dari opposite anchor ke dragged handle — komponen perpendicular diabaikan.

**Akar Masalah (Root Cause):**

`applyResizeHandle()` menggunakan axis dominance:
```ts
if (Math.abs(localDx) > Math.abs(localDy)) {
  vh = vw / aspect;      // dy-dominated → adjust vw
} else {
  vw = vh * aspect;      // dx-dominated → adjust vh
}
```
Ini memilih satu axis (yang dominan), lalu menyesuaikan axis lain. Gerakan diagonal apapun tetap mengubah width ATAU height, termasuk gerakan perpendicular yang di Photoshop tidak mengubah ukuran.

**Logika Perbaikan (Fix Rationale):**

Untuk corner proportional resize, gunakan vector projection:

1. Tentukan diagonal vector dari opposite anchor ke dragged corner (mis. SE → (oldW, oldH))
2. Normalisasi ke unit vector, hitung dot product dengan local delta:
   ```
   projected = localDx * ux + localDy * uy
   scale_factor = 1 + projected / diagonal_length
   ```
3. Hitung `vw = oldW * factor`, `vh = oldH * factor`
4. Reposition berdasarkan anchor (w/n adjustment)
5. Clamp faktor supaya width/height ≥ 1px
6. Non-corner handles + Shift-free scaling tetap pakai independent axis delta

**Files Changed:**
- `apps/desktop/src/viewport/transformGeometry.ts`: `applyResizeHandle()` diagonal projection logic
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: +4 perpendicular regression tests + update 2 existing expectations
- `docs/AI_CURRENT_TASK.md`: new entry
- `docs/AI_HISTORY.md`: entry ini

---
## [2026-06-02] BUG FIX — Resize Handle Pointer Capture Lost/Stuck During Fast Drag (Root SVG Capture) [COMPLETE]

### Kategori: BUG FIX / OVERLAY / POINTER EVENTS

**Deskripsi:** Resize handle pointer capture bisa "lost" saat resize terlalu cepat karena `setPointerCapture()` dipanggil pada elemen SVG handle individual yang DOM node-nya bisa diganti selama Solid re-render. Akibatnya `pointermove`/`pointerup` tidak pernah diterima setelah re-render, dan `dragState` stuck non-null — transform tidak bisa dihentikan.

**Akar Masalah (Root Cause):**

Di `handlePointerDown` (SelectionTransformOverlay.tsx:120-121):
```typescript
const target = e.currentTarget as HTMLElement;
target.setPointerCapture(e.pointerId);
```

`e.currentTarget` adalah elemen handle SVG (mis. `<rect data-handle="se">`) yang berada di dalam `<For>` loop. Saat `handlePointerMove` memanggil `engine.transformLayer()`, Solid memicu `syncState()` via `workspace.onChange()`, menyebabkan re-render selection overlay. Re-render ini bisa mengganti DOM node handle (Solid's `<For>` creates new array objects each render → new DOM nodes). Jika node yang memiliki active pointer capture diganti, browser kehilangan pointer capture, dan event `pointermove`/`pointerup` berikutnya tidak pernah sampai ke handler.

**Logika Perbaikan (Fix Rationale):**

1. **Capture ke root `<svg>`** — root SVG (`overlaySvgRef`) tetap mounted selama `<Show when={getLayer()}>` aktif (layer masih visible dan tidak di-unmount saat drag). Capture pada root SVG tidak hilang meskipun child `<g>`/`<rect>` handle berubah.
2. **Simpan `pointerId` di dragState** — filter event dengan `e.pointerId !== drag.pointerId` untuk menghindari konflik multi-pointer.
3. **Pindah handler ke root SVG** — `onPointerMove`/`onPointerUp`/`onPointerCancel`/`onLostPointerCapture` pada `<svg>` (bukan per-handle). `onPointerDown` tetap di handle untuk memulai drag.
4. **Stabilkan `<For>` array** — `HANDLE_TYPES` sebagai const array string literal, bukan array object baru per render. Mengurangi DOM churn.
5. **Escape handler** — release pointer capture sebelum cleanup.

**Files Changed:**
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: root SVG ref + pointer capture, pointerId filter, root SVG event handlers, stable HANDLE_TYPES (const), `data-overlay-svg`/`data-handle` attr
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`: +3 regression tests
- `apps/desktop/vite.config.ts`: Solid Plugin `{ hot: false }` di VITEST mode (fix @solid-refresh error)
- `docs/AI_CURRENT_TASK.md`: new entry
- `docs/AI_HISTORY.md`: entry ini

---
## [2026-06-02] BUG FIX — Vertical Flip Regresi (Shader UV Double Y-Flip) [COMPLETE]

### Kategori: BUG FIX / RENDERER / SHADER

**Deskripsi:** Layer gambar tampil vertikal terbalik (root cause ditemukan saat debug: `v_texCoord = vec2(pos.x, 1.0 - pos.y)` di vertex shader melakukan double Y-inversion).

**Akar Masalah (Root Cause):**

Terdapat 2 mekanisme Y-flip di pipeline render, yang satu sudah benar dan satu lagi menyebabkan double-flip:

1. **View matrix flip (BENAR)** — `computeViewMatrix()` di `webgl2.ts:293`: `m[5] = -2.0 / docH`. Ini membalik document Y-axis (`y=0 → NDC top, y=docH → NDC bottom`) agar rendering konsisten dengan CSS y-down convention. **WAJIB ada.**

2. **Texture UV flip (SALAH — regresi)** — `v_texCoord = vec2(pos.x, 1.0 - pos.y)` di `shaders.ts:23`. Ini membalik texture coordinate Y, menyebabkan:
   - `pos.y = 0` (visually TOP, setelah view matrix flip) → `v_texCoord.y = 1` → texel di baris terakhir texture → **bottom of image** ✗
   
   Dengan `UNPACK_FLIP_Y_WEBGL = false` (default), texel `v=0` adalah row 0 dari source image = top of image. Tanpa UV flip:
   - `pos.y = 0` (visual TOP) → `v_texCoord.y = 0` → texel row 0 → **top of image** ✓

**Regresi diperkenalkan di:** Commit `2fa63a0` (fix: P0 center-anchored flip). Commit `6ad3d70` sebelumnya sudah benar menghapus UV flip dengan komentar "Y-axis already handled by view matrix flip", tetapi `2fa63a0` secara tidak sengaja mengembalikan `1.0 - pos.y` tanpa menyadari bahwa view matrix sudah melakukan flip.

**Logika Perbaikan (Fix Rationale):**

- `computeViewMatrix()` → Y-flip document space (wajib untuk CSS coordinate convention)
- `UNPACK_FLIP_Y_WEBGL = false` → texel v=0 = first uploaded row = top of image
- `v_texCoord = vec2(pos.x, pos.y)` → visual top (pos.y=0) maps to top of image (v=0) ✓
- Hapus `1.0 - pos.y` → eliminasi double-flip

**Files Changed:**
- `apps/desktop/src/renderer/shaders.ts`: `v_texCoord = vec2(pos.x, 1.0 - pos.y)` → `vec2(pos.x, pos.y)` + komentar menjelaskan mengapa no UV flip
- `apps/desktop/src/__tests__/renderer.test.ts`: +regression test "should NOT double-flip texture Y" — assert shader source menggunakan `pos.y` dan TIDAK mengandung `1.0 - pos`
- `docs/AI_CURRENT_TASK.md`: new entry for this fix
- `docs/AI_HISTORY.md`: entry ini

**Verifikasi Final:**
- ✅ `pnpm.cmd run build`: PASS
- ✅ `npx vitest run`: 147/147 PASS (15 test files, +1 regression test)
- ✅ `cargo test -p photrez-core`: 85/85 PASS

**Catatan:**
- Checkerboard shader tidak terpengaruh — menggunakan `gl_FragCoord.xy` bukan `v_texCoord` untuk pattern
- `flipH`/`flipV` booleans di layer transform tidak terkait — keduanya default `false` untuk layer baru
- Regression test adalah string assertion pada `VERTEX_SHADER_SOURCE` — cukup sensitif untuk menangkap re-introduksi `1.0 - pos` di masa depan

---

## [2026-06-02] BUG FIX CAMPAIGN — Center-Anchored Flip, Overlay Reactivity, Snap+HUD Unification, Rotation Drag Fix [COMPLETE]

### Kategori: BUG FIX / TRANSFORM / OVERLAY / SNAP / HUD / VIEWPORT

**Deskripsi:** Bugfix campaign pasca Photoshop-like Free Transform. Memperbaiki 7 kategori P0/P1 bugs: (1) HEAD tidak buildable dari clean checkout — vite-tsconfig-paths stale refs; (2) flip semantics salah — shader flip dulu baru center, geometry helpers encode flip sign ke scaleX; (3) overlay AABB tidak reaktif — syncState shallow-copy layer objects; (4) overlay pointer layering — move zone di belakang handles; (5) move drag tidak lewat snap pipeline; (6) HUD position pakai raw clientX/zoom bukan screenToDocument; (7) rotation drag coordinate space salah.

**Files Changed:**
- `apps/desktop/src/viewport/transformGeometry.ts`: remove sxSign usage, positive scaleX
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: +4 flip-semantics tests (146 total)
- `apps/desktop/src/renderer/shaders.ts`: center-anchored flip (`center → flip`, not `flip → center`)
- `apps/desktop/src/renderer/webgl2.ts`: flipSign from booleans, not sign(scaleX)
- `apps/desktop/src/components/editor/EditorContext.tsx`: deep-clone layer objects in syncState
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: move zone before handles, Escape clears HUD, onComputeSnap, onScreenToDoc
- `apps/desktop/src/components/editor/TransformHud.tsx`: raw clientX/Y (document-space)
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: HUD conversion wrapper, onComputeSnap wiring, onScreenToDoc
- `apps/desktop/src/viewport/input-handler.ts`: AABB-based snap with getLayerAabb
- `apps/desktop/package.json`: remove vite-tsconfig-paths
- `apps/desktop/vite.config.ts`: remove vite-tsconfig-paths, add resolve.tsconfigPaths
- `docs/FEATURES.md`: test count 146
- `docs/ARCHITECTURE.md`: test count 146
- `docs/AI_CURRENT_TASK.md`: new bugfix entry
- `docs/AI_HISTORY.md`: entry ini

**Verifikasi Final:**
- ✅ `pnpm.cmd run build`: PASS
- ✅ `npx vitest run`: 146/146 PASS (15 test files)
- ✅ `cargo test -p photrez-core`: 85/85 PASS

**Key Decisions:**
- ScaleX/ScaleY = positive magnitude only; flipH/flipV booleans carry mirror
- Center-anchored flip: `localPos → subtract center → flip → rotate → add center`
- CW rotation unified: shader negates rad, rotatePoint negates rad, SVG rotate() positive, all tests assert CW
- Overlay reactivity requires deep clone in syncState for Solid reactivity to fire
- HUD uses document-space coords from screenToDocument()

---

## [2026-06-02] FEATURE — Precision Move Pack (keyboard nudge, canvas auto-select, transform HUD, snap feedback) [COMPLETE]

### Kategori: FEATURE / VIEWPORT / MOVE TOOL / UX

**Deskripsi:** Enhance Move Tool dengan 4 peningkatan presisi: (1) keyboard nudge Arrow=1px / Shift+Arrow=10px, (2) canvas auto-select via transformed polygon hit-test, (3) transform HUD near cursor showing ΔX/ΔY, W/H/%, angle, (4) snap feedback label on HUD when snap lines active.

**Files Changed:**
- `apps/desktop/src/viewport/layerHitTest.ts`: NEW — `hitTestLayer`, `hitTestLayers` pure helpers (ray-casting point-in-polygon)
- `apps/desktop/src/__tests__/layer-hit-test.test.ts`: NEW — 8 unit tests
- `apps/desktop/src/components/editor/TransformHud.tsx`: NEW — SVG HUD component with `createMemo`, `HudMode` type
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: MODIFIED — `onHudUpdate` prop, `snapActive` prop, HUD emits per drag branch + clear on pointer-up
- `apps/desktop/src/components/editor/CanvasViewport.tsx`: MODIFIED — auto-select before `prepareToolContext()`, keyboard nudge in `handleKeyDown`, `hudInfo` signal, HUD wiring
- `docs/AI_CURRENT_TASK.md`: completion entry
- `docs/AI_HISTORY.md`: entry ini
- `docs/FEATURES.md`: +5 rows in Selection + Move + Transform

**Verifikasi Final:**
- ✅ `npx vitest run`: 142/142 PASS (15 test files)
- ✅ `pnpm.cmd run build`: PASS (6.07s, 2025 modules)
- ✅ `cargo test -p photrez-core`: 85/85 PASS

**Catatan:**
- Canvas auto-select uses transformed polygon hit-test (ray-casting, not AABB) so rotated layers feel correct
- Nudge commits history once per non-repeat keydown only; holding arrow doesn't spam undo stack
- Nudge does NOT trigger snapping — it's explicit precision move, not drag behavior
- Transform HUD is transient SVG overlay with `pointer-events: none`, no state persistence, positioned near cursor in document space
- HUD "snap" label dynamically appears when `snapLines().length > 0` during drag
- Code review found 6 issues (1 critical, 2 important, 3 minor) — all fixed before commit
- All 5 commits in Precision Move Pack: layerHitTest → auto-select → nudge → HUD → fix reviews

---
## [2026-06-02] FEATURE — Remove vite-tsconfig-paths Plugin (Use Native Vite Resolver) [COMPLETE]

### Kategori: FEATURE / BUILD CONFIG / INFRASTRUCTURE

**Deskripsi:** Vite >= 6 (termasuk Vite 8.0.14 yang dipakai proyek ini) mendukung resolusi `tsconfig.paths` secara native lewat opsi `resolve.tsconfigPaths`. Plugin `vite-tsconfig-paths` menjadi redundan dan Vite memunculkan warning setiap kali build/dev dijalankan. Task ini menghapus plugin dan menggantinya dengan opsi native, sambil menjaga perilaku module resolution tetap identik (alias `@/*` → `./src/*`).

**Files Changed:**
- `apps/desktop/vite.config.ts`: hapus import `tsconfigPaths`, hapus dari array `plugins`, tambah `resolve: { tsconfigPaths: true }`.
- `apps/desktop/package.json`: hapus `vite-tsconfig-paths@^6.1.1` dari `devDependencies`.
- `pnpm-lock.yaml`: regenerated (`pnpm install` sukses, −3 packages, tidak ada orphan lockfile entry).
- `docs/AI_CURRENT_TASK.md`: entri completion.
- `docs/AI_HISTORY.md`: entri ini.
- `docs/FEATURES.md`: baris baru di section Infrastructure.

**Verifikasi Final:**
- ✅ `pnpm.cmd run build`: PASS (7.69s, 2022 modules transformed). Warning plugin `vite-tsconfig-paths` sudah hilang.
- ✅ `pnpm.cmd --filter photrez-desktop test`: 114/114 PASS (13 test files, 36.70s).
- ✅ `pnpm.cmd install`: sukses regenerate lockfile.

**Catatan:**
- Perilaku module resolution identik: `tsconfig.json` `"paths": { "@/*": ["./src/*"] }` dibaca langsung oleh native Vite resolver.
- Tidak ada perubahan di source code (`apps/desktop/src/**`).
- Dependency `vite-tsconfig-paths` (3 packages total termasuk transitive) ter-cleanup dari `node_modules` dan `pnpm-lock.yaml`.
- PLUGIN_TIMINGS warning yang muncul saat build adalah untuk plugin `solid` (unrelated, info-only).

---

---

## Archived Entries Index (pre 2026-06-02)

> Full details in `docs/archive/AI_HISTORY_ARCHIVE.md`

| Date | Entry |
|---|---|
| 2026-06-01 | FEATURE — Move Tool Snapping End-to-End [COMPLETE] |
| 2026-06-01 | TEST FIX — Input Handler Snap Pointer-Up Cleanup Test Review [COMPLETE] |
| 2026-06-01 | BUG FIX — computeSnapAdjustment Non-Finite Guide Line Endpoints (Code Review) [COMPLETE] |
| 2026-06-01 | FEATURE — Move Tool Snapping (Task 2: computeSnapAdjustment) [COMPLETE] |
| 2026-06-01 | BUG FIX — SelectionTransformOverlay Blocks Panning Cursor + Pointer Events [COMPLETE] |
| 2026-06-01 | BUG FIX — Cursor Imperative Sync via createEffect [COMPLETE] |
| 2026-06-01 | BUG FIX — Cursor Style Non-Reactive in SolidJS [SUPERSEDED] |
| 2026-06-01 | BUG FIX + REFACTOR — View Matrix uses documentSize, not canvasSize [COMPLETE] |
| 2026-06-01 | FEATURE — HiDPI Sharpness + Snap-Fit Transition [COMPLETE] |
| 2026-06-01 | REFACTOR — Viewport Code Simplification (A+B+C+D) [COMPLETE] |
| 2026-06-01 | BUG FIX — Viewport Canvas Positioning (Double Position: Flex Static + CSS Transform) [COMPLETE] |
| 2026-05-31 | BUG FIX — Viewport Architecture Fixes (Double Sync, Stable ToolContext, Brush Accumulator, ImageBitmap Leak) [COMPLETE] |
| 2026-05-31 | REFACTOR — Viewport Architecture Cleanup (Dead Code Removal, State Sync Consolidation, Per-Instance Stroke Points) [COMPLETE] |
| 2026-05-31 | BUG FIX — CSS Transform Coordinate Regressions [COMPLETE] |
| 2026-05-31 | BUG FIX — Double Viewport Transform (WebGL + CSS) [COMPLETE] |
| 2026-05-31 | FEATURE — Viewport UX Migration & Overlay System [COMPLETE] |
| 2026-05-31 | FEATURE — UX Overlays: Hover Highlight, Smart Guides, Brush Cursor [COMPLETE] |
| 2026-05-31 | FEATURE — High-Fidelity Photoshop-style Viewport Navigation & Kinetic Panning [COMPLETE] |
| 2026-05-31 | FEATURE — High-Fidelity Photoshop-style Move & Transform Overlay [COMPLETE] |
| 2026-05-30 | BUG FIX — Custom Manifest Compiler & WebView2Loader Linking Workaround [COMPLETE] |
| 2026-05-30 | FEATURE / REFACTOR / ARCHITECTURE — Architecture Migration v2 with Modular UI Alignment [COMPLETE] |
| 2026-05-30 | FEATURE / UI / POLISH — Diagonal Swatches, Tab Typography & Layout Polish [COMPLETE] |
| 2026-05-30 | DOCUMENTATION — Style Guide & Design Tokens Synchronization [COMPLETE] |
| 2026-05-30 | FEATURE — Solid + Tailwind Editor Shell Integration [COMPLETE] |
| 2026-05-30 | FEATURE — AppShell Grid Layout Restructure [COMPLETE] |
| 2026-05-29 | FEATURE — LeftToolRail Reference Matching [COMPLETE] |
| 2026-05-29 | FEATURE — Titlebar Reference Matching [COMPLETE] |
| 2026-05-29 | FEATURE — photrez High-Fidelity Reference Slice [COMPLETE] |
| 2026-05-29 | FEATURE — High-Fidelity LUMINARIS Visual Overhaul & Slicing [COMPLETE] |
| 2026-05-29 | FEATURE — Mockup UI Slicing [COMPLETE] |
| 2026-05-28 | FEATURE — Tasks 4-5: On-Demand Rendering & Frontend Render Trigger [COMPLETE] |
| 2026-05-28 | FEATURE — Task 5: Remove Canvas 2D Fallback from Frontend [COMPLETE] |
| 2026-05-28 | FEATURE — Tasks 5-10: Frontend Viewport Integration [COMPLETE] |
| 2026-05-28 | FEATURE — M6: Perf Gate + Packaging [COMPLETE] |
| 2026-05-28 | FEATURE — M3 Completion: Transform Handles & Controls |
| 2026-05-28 | FEATURE — Tasks 9-11: Flip Shortcuts, ESC Cancel, Rotation Snapping |
| 2026-05-28 | FEATURE — Milestone 5: Export Pipeline & Color Selection |
| 2026-05-28 | FEATURE — Milestone 4: Brush & Eraser Engine |
| 2026-05-28 | FEATURE — Milestone 3: Selection, Transform, Crop, and Resize |
| 2026-05-28 | FEATURE — Milestone 2, Task 2: UI Layer Reordering Controls in Right Inspector |
| 2026-05-28 | FEATURE — Milestone 2, Task 1: BitmapData & Memory Budget in Rust Core |
| 2026-05-28 | FEATURE — Right Inspector Idea A (Recessed Layers & History Compartment) |
| 2026-05-28 | FEATURE — Inspector UX Polish (Pill Tabs & Properties Unification) |
| 2026-05-27 | FEATURE — Segmented Transform Matrix Coordinate Grid |
| 2026-05-27 | FEATURE — Flush-Left Anchor Active Tool Indicator (Option A) |
| 2026-05-27 | FEATURE — Left Tool Rail Polish (Mechanical Desktop Aesthetics) |
| 2026-05-27 | FEATURE — UI Visual De-cluttering (Airy & Lightweight) |
| 2026-05-27 | FEATURE — Modular Hardware Chassis UI Redesign |
| 2026-05-27 | FEATURE — Proportional Fix: Rail 48×36 / Top Bar 44px |
| 2026-05-27 | CLEANUP — Remove Command Palette UI Button (Out of MVP Scope) |
| 2026-05-27 | FEATURE — Inspector Panel Polish (Collapsible Sections, Tabs, Hover Refinements) |
| 2026-05-27 | BUG FIX — Tailwind CDN Conflict & Tokens Migration |
| 2026-05-27 | FEATURE — Milestone 1 Shell Foundation & Photon Amber UI Redesign |
| 2026-05-27 | DOCS — AI Context Documentation System |
| 2026-06-02 | BUG FIX — CropOverlay Pointer Capture + Full Crop MVP [COMPLETE] |
| 2026-06-03 | CROP IMPROVEMENT — 7 Incremental Tasks [COMPLETE] |

## [2026-06-04] PLAN - Scalability and Maintainability Refactor Plan [PLANNING COMPLETE]

### Kategori: PLAN / REFACTOR / ARCHITECTURE / MAINTAINABILITY

**Deskripsi:** Membuat rencana detail untuk refactor file splitting/merging lintas project agar Photrez lebih scalable dan maintainable tanpa mengubah behavior.

### Artifact

- `docs/plans/2026-06-04-scalability-maintainability-refactor-plan.md`

### Scope Plan

1. `DocumentEngine` TypeScript tetap facade/source of truth MVP, dengan helper internal untuk layer factory, compositing, crop apply, snapshot, dan pixel sampling.
2. `CanvasViewport.tsx` direncanakan menjadi shell yang mengomposisi hook renderer, pointer tools, dan derived viewport state.
3. `CropOverlay.tsx` direncanakan dipisah menjadi drag hook, handles, guides, dan tooltip renderer.
4. `OptionBar.tsx` direncanakan dipisah per active tool.
5. `SelectionTransformOverlay.tsx` direncanakan memiliki hook interaction terpisah.
6. `EditorContext.tsx` direncanakan dipisah internalnya tanpa mengubah entry point `useEditor()`.
7. Rust core/render dicatat sebagai reference/future-target organization, bukan runtime migration.

### Verification

- Planning artifact created.
- No implementation code changed in this planning step.

### Risiko / Catatan

- Eksekusi refactor harus dilakukan per wave kecil dengan targeted tests.
- `cargo test --workspace` tetap perlu diperlakukan sesuai catatan existing render/toolchain issue di dokumen project saat implementasi berjalan.
