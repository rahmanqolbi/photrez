# Photrez — Analisis Penyebab & Solusi Brush Berat / Laggy

> **Lingkup:** Aplikasi Photrez (editor foto desktop berbasis Tauri + SolidJS + WebGL2)
> **Komponen dianalisis:** Brush & Eraser stroke pipeline (`pointerMove → onPaintStroke → composite → upload`)
> **Tanggal analisis:** 2026-07-09

---

## 1. Ringkasan Eksekutif

Brush di Photrez terasa berat dan laggy **bukan** karena Rust-nya pelan, dan **bukan** karena WebGL2-nya pelan. Penyebab utamanya adalah satu jalur CPU:

> **Setiap `pointermove` memicu `paintMaskToContext()`, yang membaca seluruh pixel kanvas (`getImageData`), mengiterasi seluruh pixel di CPU, lalu menulis kembali seluruh pixel (`putImageData`) — bahkan ketika brush hanya menyentuh area yang sangat kecil.**

Untuk layer 4000×3000 (= 12 juta pixel), satu `pointermove` memproses ±48 MB data. Pada 60 Hz `pointermove`, beban CPU menjadi **±2.9 GB/detik** hanya untuk I/O kanvas — belum termasuk kalkulasi composite dan biaya pipeline stall GPU↔CPU. Akibatnya frame drop, stroke tertinggal di belakang kursor, dan ripple lag ke scheduler.

Untuk mode **Eraser**, masalahnya lebih parah karena di samping `paintMaskToContext`, setiap `pointermove` juga memanggil `uploadEraserPreview()` yang melakukan `createImageBitmap()` + `renderer.uploadImage()` (full layer upload ke GPU).

Lima hotspot utama (urutan prioritas):
1. **Full-canvas `getImageData`/`putImageData` per event** di `paintMaskToContext` (brush)
2. **Full-canvas pixel-loop** di `compositeMaskToImageData`
3. **Full-layer GPU upload per event** untuk eraser preview
4. **`[...context.strokePoints]` array copy O(n²)** di `handlePointerMove`
5. **`paintSmoother.buffer.slice(-10)` alokasi array per event** (minor)

Dokumen ini menjelaskan setiap penyebab, lokasi file, baris kode, mekanisme dampak, dan solusi konkret (dengan pseudocode dan contoh kode) untuk masing-masing.

---

## 2. Arsitektur Brush Photrez (Konteks)

Alur paint ketika user menyeret brush:

```
Browser pointermove
   │
   ▼
CanvasViewport.tsx  (onPointerMove)
   │
   ▼
useCanvasPointerTools.ts → onCanvasPointerMove
   │   - getDocCoords (e.clientX → doc coords)
   │   - paintSmoother.addPoint (smoothing ring buffer)
   │
   ▼
viewport/input-handler.ts → handlePointerMove
   │   context.strokePoints.push({x,y})
   │   context.onPaintStroke?.([...context.strokePoints], ...)
   │              ▲
   │              └── O(n) array copy per event
   ▼
useBrushOverlay.ts → onPaintStroke
   │   - getBrushTip (cached)
   │   - stampBrushTip (accumulate mask)  ← incremental, OK
   │   - paintMaskToContext  ← BOTTLENECK #1
   │        ├─ ctx.getImageData(0, 0, w, h)        ← GPU→CPU readback, full layer
   │        ├─ compositeMaskToImageData            ← loop semua pixel
   │        └─ ctx.putImageData(imageData, 0, 0)   ← CPU→GPU writeback, full layer
   │   - paintTransientBrushTipToContext (small region, OK)
   │   - [eraser only] uploadEraserPreview           ← BOTTLENECK #3
   │
   ▼
scheduler.requestRender  →  WebGL2Backend.render  (WebGL2 compositor)
```

**File kunci yang dianalisis:**

| File | Peran |
|------|------|
| `apps/desktop/src/components/editor/useBrushOverlay.ts` | Loop per-event: akumulasi mask + composite ke overlay canvas |
| `apps/desktop/src/components/editor/brushTipMask.ts` | `stampBrushTip`, `compositeMaskToImageData`, `paintMaskToContext`, `paintTransientBrushTipToContext` |
| `apps/desktop/src/viewport/input-handler.ts` | `handlePointerMove` — push point + panggil `onPaintStroke` |
| `apps/desktop/src/components/editor/canvas/useCanvasPointerTools.ts` | Bridge pointer event → input-handler, smoother |
| `apps/desktop/src/components/editor/paintSmoothing.ts` | `PaintSmoother` ring buffer (window ≤10) |
| `apps/desktop/src/components/editor/paintCommitCommand.ts` | Commit stroke ke history + upload ke GPU |
| `apps/desktop/src/renderer/webgl2.ts` | Compositor WebGL2 (BUKAN sumber lag) |
| `apps/desktop/src/renderer/scheduler.ts` | RAF scheduler (sudah benar — single RAF per frame) |

---

## 3. Akar Masalah (Root Causes)

### 3.1 ❌ Hotspot #1 — `paintMaskToContext` readback/writeback full canvas per event

**Lokasi:** `apps/desktop/src/components/editor/brushTipMask.ts:385-396`

```ts
export function paintMaskToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  color: string,
  isEraser: boolean,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);   // ← full canvas readback
  compositeMaskToImageData(imageData, mask, color, isEraser);
  ctx.putImageData(imageData, 0, 0);                          // ← full canvas writeback
}
```

**Pemanggil:** `useBrushOverlay.ts:182-183` (brush) dan `useBrushOverlay.ts:167` (eraser)

```ts
// useBrushOverlay.ts (brush path)
overlayCtx.clearRect(0, 0, layer.width, layer.height);
paintMaskToContext(overlayCtx, paintSession.maskData, layer.width, layer.height, paintSession.color, false);
```

**Mengapa pelan:**
- `ctx.getImageData(0, 0, w, h)` memaksa browser membaca seluruh backing store kanvas (sering GPU-backed via SkiaSwift/Angle) ke CPU. Ini memicu **pipeline stall** — seluruh GPU command queue harus di-flush dan ditunggu sampai selesai.
- Untuk layer 4000×3000 = 12 juta pixel × 4 byte = **48 MB** yang disalin per panggilan.
- `putImageData` menulis balik 48 MB yang sama, lagi-lagi memicu upload GPU.
- Pipeline stall inilah yang membuat lag terasa "menjalar" — bukan hanya satu frame yang telat, tetapi seluruh event loop terblok sampai readback selesai.

**Dampak praktis:**
- Pada 60 Hz `pointermove`, ini berjalan hingga 60× per detik.
- 48 MB × 60 = **2.88 GB/s** bandwidth CPU↔GPU hanya untuk I/O overlay canvas.
- Pada laptop/iGPU dengan bandwidth rendah, satu `getImageData` saja bisa makan 15-30 ms → langsung drop di bawah 60 fps.

**Catatan:** Walaupun mask akumulasi sudah benar (incremental, hanya stamp dab baru), `compositeMaskToImageData` tetap mengiterasi SELURUH pixel kanvas, bukan hanya dirty region.

---

### 3.2 ❌ Hotspot #2 — `compositeMaskToImageData` loop full canvas

**Lokasi:** `apps/desktop/src/components/editor/brushTipMask.ts:347-383`

```ts
export function compositeMaskToImageData(
  imageData: ImageData,
  mask: Uint8ClampedArray,
  color: string,
  isEraser: boolean,
): void {
  const data = imageData.data;
  const paint = parsePaintColor(color);
  const strokeAlpha = Math.max(0, Math.min(1, paint.a));

  for (let i = 0; i < data.length; i += 4) {           // ← loop full canvas
    const maskAlpha = mask[i / 4] / 255;                 // ← float div per iterasi
    if (maskAlpha <= 0) continue;
    ...
  }
}
```

**Mengapa pelan:**
- `data.length` = `4 * width * height`. Untuk layer 4000×3000 = 48 juta byte, loop jalan 12 juta kali.
- `mask[i / 4]` — pembagian float per iterasi. V8 mungkin bisa JIT-optimize, tetapi tetap lebih lambat dibanding indeks paralel.
- Meskipun 99.99% pixel mask adalah 0 (continue cepat), overhead loop itu sendiri (12 juta iterasi × beberapa nop) tetap ±10-50 ms di CPU mid-range.

**Bug tersembunyi:** Loop tidak memanfaatkan bounding box mask. Padahal `stampBrushTip` selalu tahu region yang baru ditandai — info ini bisa di-track untuk membatasi loop ke dirty region saja.

---

### 3.3 ❌ Hotspot #3 — Eraser: full-layer GPU upload per event

**Lokasi:** `apps/desktop/src/components/editor/useBrushOverlay.ts:161-180, 209-234`

```ts
if (isEraser) {
  if (eraserPreviewCtx) {
    eraserPreviewCtx.clearRect(0, 0, layer.width, layer.height);
    if (layer.imageBitmap) {
      eraserPreviewCtx.drawImage(layer.imageBitmap, 0, 0);
    }
    paintMaskToContext(eraserPreviewCtx, paintSession.maskData, layer.width, layer.height, "rgba(0,0,0,1)", true);
    if (!isFinal && paintSession.lastPoint) {
      paintTransientBrushTipToContext(...);
    }
    uploadEraserPreview(activeEngine, activeId, layer.width, layer.height);  // ← BOTTLENECK
  }
}
```

```ts
async function uploadEraserPreview(engine, layerId, w, h) {
  if (!eraserPreviewCanvas) return;
  const gen = ++previewGen;
  try {
    const bitmap = await createImageBitmap(eraserPreviewCanvas);   // ← full layer readback
    if (gen !== previewGen) { bitmap.close(); return; }
    ...
    renderer.uploadImage(layerId, bitmap);                          // ← full layer GPU upload
    scheduler.requestRender();
  } catch (err) {
    showToast(`Eraser preview failed: ...`, "error");
  }
}
```

**Mengapa pelan:**
- `createImageBitmap(eraserPreviewCanvas)` menyalin seluruh kanvas preview (48 MB untuk layer 4000×3000) ke ImageBitmap baru.
- `renderer.uploadImage(layerId, bitmap)` memanggil `gl.texImage2D(...)` yang meng-upload seluruh tekstur 48 MB ke GPU.
- Ini terjadi **per pointermove** (bukan per stroke) — pada 60 Hz pointermove berarti 60× full upload per detik.
- Bandwidth PCIe/iGPU untuk upload tekstur biasanya 4-16 GB/s, tetapi 2.88 GB/s sudah memakan 20-70% bandwidth.

**Kenapa eraser lebih berat dari brush:** Brush hanya menulis ke overlay canvas (CSS-positioned di atas WebGL canvas, GPU composite gratis via browser). Eraser harus **mengubah tekstur layer itu sendiri** di GPU, karena eraser menghapus pixel dari layer — sehingga setiap gerakan harus di-upload ulang.

---

### 3.4 ⚠️ Hotspot #4 — Array copy O(n²) di `handlePointerMove`

**Lokasi:** `apps/desktop/src/viewport/input-handler.ts:242-244`

```ts
} else if (tool === "brush" || tool === "eraser") {
  context.strokePoints.push({ x: docX, y: docY });
  context.onPaintStroke?.([...context.strokePoints], tool === "eraser", context.paintSettings);
}
```

**Mengapa pelan:**
- `[...context.strokePoints]` membuat salinan array lengkap setiap `pointermove`.
- Pada stroke panjang (mis. 5000 titik), per salinan = 5000 elemen. Total kerja untuk 5000 event = 5000 × 5000 / 2 ≈ 12.5 juta elemen copy — **kompleksitas O(n²)** terhadap panjang stroke.
- GC juga bekerja ekstra karena setiap copy menghasilkan objek sampah.

**Mengapa hanya "warning" bukan "critical":**
- `useBrushOverlay.onPaintStroke` hanya membaca titik baru (`i >= prevStrokePointCount`), jadi loop di dalamnya O(1) per event.
- Biaya copy array `O(n)` per event masih lebih kecil dibanding `paintMaskToContext` `O(W×H)` per event. Tetap menggunjang GC dan tidak perlu.

---

### 3.5 ⚠️ Hotspot #5 — `PaintSmoother` alokasi array per event

**Lokasi:** `apps/desktop/src/components/editor/paintSmoothing.ts:20-41`

```ts
addPoint(x: number, y: number): { x: number; y: number } {
  this.buffer.push({ x, y });
  if (this.buffer.length > 10) {
    this.buffer = this.buffer.slice(-10);     // ← alokasi array baru
  }

  const n = Math.min(this.buffer.length, this.windowSize);
  if (n <= 1) return { x, y };

  const relevant = this.buffer.slice(-n);      // ← alokasi lain
  ...
}
```

**Mengapa pelan:**
- Dua `slice()` per event, masing-masing mengalokasikan array baru.
- Untuk stroke 5000 event, itu 10.000 alokasi array + GC pressure.
- Bukan penyebab utama lag, tetapi memperburuk frame time variance.

**Solusi ring buffer yang benar:** Pre-alokasi `Float64Array` length 20 (10 x + 10 y), tulis dengan modulo.

---

### 3.6 ⚠️ Hotspot #6 — `paintTransientBrushTipToContext` juga readback kecil

**Lokasi:** `apps/desktop/src/components/editor/brushTipMask.ts:398-436`

```ts
export function paintTransientBrushTipToContext(
  ctx, tip, endpoint, lastDab, alphaScale, color, isEraser,
): boolean {
  ...
  const imageData = ctx.getImageData(minX, minY, width, height);   // ← readback (kecil)
  compositeMaskToImageData(imageData, mask, color, isEraser);
  ctx.putImageData(imageData, minX, minY);                          // ← writeback (kecil)
  return true;
}
```

**Mengapa pelan (tapi minor):**
- Region-nya kecil (hanya bounding box brush tip diameter), jauh lebih kecil dari full canvas.
- Tetap memicu GPU pipeline stall walaupun data sedikit.
- Dijalankan SETELAH `paintMaskToContext` per event — jadi total ada **dua pipeline stall per event**.

---

### 3.7 ⚠️ Hotspot #7 — Brush tip cache unbounded

**Lokasi:** `apps/desktop/src/components/editor/brushTipMask.ts:99`

```ts
const brushTipCache = new Map<string, BrushTip>();
```

**Mengapa potensi masalah:**
- Cache global, tidak pernah di-evict.
- Setiap kombinasi `(diameter, hardness)` unik membuat entri baru. Brush diameter 1-2000 + hardness 0-1 (rata-rata user ganti-ganti 5-20 kombinasi) tidak masalah, tetapi slider dengan input number memungkinkan user menghasilkan ratusan kombinasi dalam sesi panjang.
- Setiap entri: `Float32Array(diameter²)` → untuk brush 500 = 1 MB. 50 entri besar bisa memakan 50 MB.
- Bukan penyebab lag langsung, tetapi berkontribusi pada idle RAM dan bisa memicu GC pause yang menyebabkan frame drop periodik.

---

### 3.8 ⚠️ Hotspot #8 — Eyedropper (Alt+Click) alokasi OffscreenCanvas per sample

**Lokasi:** `apps/desktop/src/engine/pixelSample.ts:29-33`

```ts
for (let i = layers.length - 1; i >= 0; i--) {
  ...
  if (rx >= 0 && rx < layer.width && ry >= 0 && ry < layer.height) {
    try {
      const offscreen = new OffscreenCanvas(1, 1);   // ← alokasi per layer per sample
      const ctx = offscreen.getContext("2d");
      if (ctx) {
        ctx.drawImage(layer.imageBitmap, rx, ry, 1, 1, 0, 0, 1, 1);
        const imgData = ctx.getImageData(0, 0, 1, 1);
        ...
      }
    } catch { ... }
  }
}
```

**Mengapa pelan (hanya saat Alt-drag):**
- Selama Alt+drag dengan brush/eraser aktif, `useCanvasPointerTools.onCanvasPointerMove` (line 657-665) memanggil `engine.samplePixel()` per `pointermove`.
- Untuk N layer, itu N alokasi `OffscreenCanvas(1, 1)` + N `getImageData(1,1)` per event.
- `OffscreenCanvas` konstruktor cukup mahal (~50-200 µs di Chrome).
- Tidak terjadi saat brush normal, tetapi user yang pakai Alt+drag untuk eyedropper akan merasakan lag serupa.

---

## 4. Solusi

Solusi dibagi menjadi tiga tier berdasarkan effort vs dampak.

### Tier 1 — Quick Wins (1-3 hari, dampak besar)

#### 4.1 ✅ Solusi #1: Batasi `paintMaskToContext` ke dirty bounding box

**Tujuan:** Hilangkan full-canvas `getImageData`/`putImageData` per event.

**Strategi:** Track bounding box akumulatif mask selama stroke. Saat composite, gunakan `getImageData(dirtyX, dirtyY, dirtyW, dirtyH)` dan `putImageData(imageData, dirtyX, dirtyY)`.

**Implementasi di `brushTipMask.ts`:**

```ts
// Tambah helper untuk mask + dirty rect
export interface DirtyRect { x0: number; y0: number; x1: number; y1: number; }

export function emptyDirtyRect(): DirtyRect {
  return { x0: Number.MAX_SAFE_INTEGER, y0: Number.MAX_SAFE_INTEGER, x1: -1, y1: -1 };
}

export function expandDirtyRect(
  rect: DirtyRect, x: number, y: number, radius: number,
): DirtyRect {
  return {
    x0: Math.min(rect.x0, Math.floor(x - radius)),
    y0: Math.min(rect.y0, Math.floor(y - radius)),
    x1: Math.max(rect.x1, Math.ceil(x + radius) + 1),
    y1: Math.max(rect.y1, Math.ceil(y + radius) + 1),
  };
}

export function clampDirtyRect(rect: DirtyRect, w: number, h: number): DirtyRect {
  return {
    x0: Math.max(0, rect.x0),
    y0: Math.max(0, rect.y0),
    x1: Math.min(w, rect.x1),
    y1: Math.min(h, rect.y1),
  };
}

// Versi region-limited composite
export function compositeMaskToImageDataDirty(
  imageData: ImageData,
  imageDataOriginX: number,
  imageDataOriginY: number,
  mask: Uint8ClampedArray,
  maskWidth: number,
  rect: DirtyRect,
  color: string,
  isEraser: boolean,
): void {
  const data = imageData.data;
  const imgW = imageData.width;
  const paint = parsePaintColor(color);
  const strokeAlpha = Math.max(0, Math.min(1, paint.a));

  for (let y = rect.y0; y < rect.y1; y++) {
    const rowInMask = y * maskWidth;
    const rowInImage = (y - imageDataOriginY) * imgW;
    for (let x = rect.x0; x < rect.x1; x++) {
      const maskIdx = rowInMask + x;
      const maskAlpha = mask[maskIdx] / 255;
      if (maskAlpha <= 0) continue;

      const i = ((rowInImage + (x - imageDataOriginX)) << 2);
      const alpha = maskAlpha * strokeAlpha;

      if (isEraser) {
        data[i + 3] = Math.round(data[i + 3] * (1 - alpha));
        continue;
      }

      const dstA = data[i + 3] / 255;
      const outA = alpha + dstA * (1 - alpha);
      if (outA <= 0) {
        data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
        continue;
      }
      data[i]     = Math.round((paint.r * alpha + data[i]     * dstA * (1 - alpha)) / outA);
      data[i + 1] = Math.round((paint.g * alpha + data[i + 1] * dstA * (1 - alpha)) / outA);
      data[i + 2] = Math.round((paint.b * alpha + data[i + 2] * dstA * (1 - alpha)) / outA);
      data[i + 3] = Math.round(outA * 255);
    }
  }
}

export function paintMaskToContextDirty(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mask: Uint8ClampedArray,
  maskWidth: number,
  maskHeight: number,
  rect: DirtyRect,
  color: string,
  isEraser: boolean,
): void {
  const r = clampDirtyRect(rect, maskWidth, maskHeight);
  if (r.x1 <= r.x0 || r.y1 <= r.y0) return;

  const subWidth = r.x1 - r.x0;
  const subHeight = r.y1 - r.y0;
  const imageData = ctx.getImageData(r.x0, r.y0, subWidth, subHeight);
  compositeMaskToImageDataDirty(imageData, r.x0, r.y0, mask, maskWidth, r, color, isEraser);
  ctx.putImageData(imageData, r.x0, r.y0);
}
```

**Modifikasi `useBrushOverlay.ts`:**

```ts
interface PaintStrokeSession {
  layerId: string;
  isEraser: boolean;
  settingsKey: string;
  color: string;
  maskData: Uint8ClampedArray;
  maskWidth: number;
  maskHeight: number;
  lastPoint: { x: number; y: number } | null;
  lastDab: { x: number; y: number } | null;
  spacingCarry: number;
  dabCount: number;
  dirtyRect: DirtyRect;          // ← baru
}

// Setiap stampBrushTip perlu update dirtyRect:
function stampAndUpdateDirty(
  session: PaintStrokeSession,
  tip: BrushTip,
  x: number, y: number,
  alphaScale: number,
) {
  stampBrushTip(session.maskData, session.maskWidth, session.maskHeight, tip, x, y, alphaScale);
  session.dirtyRect = expandDirtyRect(session.dirtyRect, x, y, tip.radius + 1);
}

// Pemanggilan composite per event:
if (isEraser) {
  if (eraserPreviewCtx) {
    eraserPreviewCtx.clearRect(0, 0, layer.width, layer.height);
    if (layer.imageBitmap) {
      eraserPreviewCtx.drawImage(layer.imageBitmap, 0, 0);
    }
    paintMaskToContextDirty(
      eraserPreviewCtx,
      paintSession.maskData,
      paintSession.maskWidth,
      paintSession.maskHeight,
      paintSession.dirtyRect,
      "rgba(0,0,0,1)",
      true,
    );
    if (!isFinal && paintSession.lastPoint) {
      paintTransientBrushTipToContext(...);
    }
    uploadEraserPreview(...);
  }
} else {
  overlayCtx.clearRect(0, 0, layer.width, layer.height);
  paintMaskToContextDirty(
    overlayCtx,
    paintSession.maskData,
    paintSession.maskWidth,
    paintSession.maskHeight,
    paintSession.dirtyRect,
    paintSession.color,
    false,
  );
  ...
}
```

**Estimasi dampak:**
- Untuk brush diameter 50 px pada layer 4000×3000, dirty rect ≈ 50×50 = 2500 pixel vs 12 juta pixel (faktor **~5000× lebih kecil**).
- `getImageData`/`putImageData` di region kecil → pipeline stall masih ada tetapi jauh lebih singkat.
- **Perkiraan perbaikan frame time: 80-95%**.

**Catatan:** Setelah commit (`commitBrushStroke`), reset `dirtyRect = emptyDirtyRect()` dan `prevStrokePointCount = 0`. Saat stroke baru dimulai, `needsReset=true` memicu alokasi mask baru — di sini `dirtyRect` juga di-init.

---

#### 4.2 ✅ Solusi #2: Hilangkan `[...context.strokePoints]` copy — kirim delta saja

**Tujuan:** Hilangkan O(n²) array copy di `handlePointerMove`.

**Strategi:** Ganti signature `onPaintStroke` untuk menerima hanya titik baru (delta).

**Modifikasi `viewport/input-handler.ts`:**

```ts
// Di ToolContext:
onPaintStroke?: (
  newPoints: { x: number; y: number }[],
  isEraser: boolean,
  settings: PaintToolSettings,
  isFinal?: boolean,
) => void;

// Di handlePointerMove:
} else if (tool === "brush" || tool === "eraser") {
  context.strokePoints.push({ x: docX, y: docY });
  // Kirim hanya titik baru, bukan seluruh array
  context.onPaintStroke?.([{ x: docX, y: docY }], tool === "eraser", context.paintSettings);
}
```

**Modifikasi `useBrushOverlay.ts`:**

```ts
function onPaintStroke(
  newPoints: { x: number; y: number }[],   // ← hanya titik baru
  isEraser: boolean,
  settings: PaintToolSettings,
  isFinal = false,
) {
  ...
  const settingsKey = getPaintSessionKey(settings, fgColor());
  const needsReset =
    !paintSession ||
    paintSession.layerId !== activeId ||
    paintSession.isEraser !== isEraser ||
    paintSession.settingsKey !== settingsKey ||
    paintSession.maskWidth !== layer.width ||
    paintSession.maskHeight !== layer.height ||
    prevStrokePointCount === 0;

  if (needsReset) {
    paintSession = { ... };
  }

  ...

  // Proses hanya newPoints, bukan seluruh array
  for (let i = 0; i < newPoints.length; i++) {
    const pt = newPoints[i];
    const localPt = mapPaintPointToLayerLocal(pt, layer);
    ... // sama seperti sebelumnya
  }

  prevStrokePointCount += newPoints.length;
}
```

**Estimasi dampak:**
- Menghilangkan O(n²) alokasi array → konstan O(1) per event.
- Mengurangi GC pressure signifikan untuk stroke panjang.
- **Perkiraan perbaikan: 5-15% frame time**, terutama untuk stroke >1000 titik.

**Catatan kompatibilitas:** `pointerCancel`/`lostPointerCapture` saat ini memanggil `onPaintStroke?.([...context.strokePoints], ..., true)` untuk final commit. Ubah ini juga — `commitBrushStroke` bisa mengandalkan state internal `paintSession` tanpa perlu menerima ulang seluruh array.

---

#### 4.3 ✅ Solusi #3: Throttle `paintMaskToContextDirty` via RAF

**Tujuan:** Pastikan composite paling banyak sekali per frame.

**Strategi:** Di `useBrushOverlay`, simpan pending "dirty rect" yang harus di-composite, dan jalankan composite di `requestAnimationFrame`.

**Modifikasi `useBrushOverlay.ts`:**

```ts
let compositeRafId = 0;
let pendingComposite: DirtyRect | null = null;

function scheduleComposite(rect: DirtyRect) {
  pendingComposite = pendingComposite
    ? unionDirtyRect(pendingComposite, rect)
    : rect;
  if (compositeRafId) return;
  compositeRafId = requestAnimationFrame(() => {
    compositeRafId = 0;
    if (!pendingComposite || !paintSession) {
      pendingComposite = null;
      return;
    }
    const rect = pendingComposite;
    pendingComposite = null;
    // Composite overlay (bukan eraser)
    if (!paintSession.isEraser) {
      overlayCtx.clearRect(0, 0, paintSession.maskWidth, paintSession.maskHeight);
      paintMaskToContextDirty(
        overlayCtx,
        paintSession.maskData,
        paintSession.maskWidth,
        paintSession.maskHeight,
        rect,
        paintSession.color,
        false,
      );
      if (paintSession.lastPoint) {
        paintTransientBrushTipToContext(...);
      }
    }
    // Eraser masih perlu composite ke eraserPreviewCanvas + upload
    // (lihat Solusi #4 untuk alternative)
  });
}
```

**Estimasi dampak:**
- Memastikan paling banyak satu composite per frame (~16.6 ms pada 60 Hz).
- Menggabungkan multiple `pointermove` dalam satu frame ke satu composite.
- **Perkiraan perbaikan: 30-60% frame time** untuk stroke cepat.

**Catatan:** Pastikan `scheduleComposite` juga dipanggil saat `isFinal=true` (pointer up) untuk memastikan stroke terakhir ter-render sebelum commit. Atau, lebih sederhana: saat `isFinal`, langsung panggil `paintMaskToContextDirty` synchronously tanpa throttle.

---

### Tier 2 — Refactor Sedang (3-7 hari, dampak besar untuk eraser & canvas besar)

#### 4.4 ✅ Solusi #4: Eraser — komposit di GPU, hindari full-layer upload per event

**Tujuan:** Eraser tidak boleh meng-upload tekstur layer penuh setiap `pointermove`.

**Strategi A (sederhana):** Gunakan overlay canvas juga untuk eraser preview, bukan langsung mutasi tekstur layer. Hanya saat commit (pointer up), eraser benar-benar menghapus pixel layer.

**Strategi B (lebih cepat, lebih kompleks):** Tambah shader WebGL2 khusus eraser yang membaca tekstur layer + mask tekstur, dan meng-erase di shader. Upload hanya tekstur mask (kecil, dirty region).

**Rekomendasi: Gunakan Strategi A** — lebih sederhana, menghilangkan hotspot eraser sepenuhnya.

**Implementasi Strategi A:**

```ts
// useBrushOverlay.ts
if (isEraser) {
  // JANGAN mutate eraserPreviewCanvas per event.
  // Cukup paint ke overlay canvas dengan komposit "destination-out"
  // sehingga overlay menampilkan preview erase effect (transparan di area stroke).
  overlayCtx.clearRect(0, 0, layer.width, layer.height);
  // Gambar layer di belakang
  if (layer.imageBitmap) {
    overlayCtx.drawImage(layer.imageBitmap, 0, 0);
  }
  // "Hapus" area mask
  overlayCtx.globalCompositeOperation = "destination-out";
  paintMaskToContextDirty(
    overlayCtx,
    paintSession.maskData,
    paintSession.maskWidth,
    paintSession.maskHeight,
    paintSession.dirtyRect,
    "rgba(0,0,0,1)",
    true,
  );
  overlayCtx.globalCompositeOperation = "source-over";
  // Tidak perlu uploadEraserPreview per event!
  // WebGL canvas tetap menampilkan layer asli, overlay canvas menampilkan preview erase.
}
```

Pada commit (`commitBrushStroke`):
```ts
if (isEraser) {
  // Sekarang baru benar-benar apply erase ke layer ImageBitmap
  const snapshot = new OffscreenCanvas(w, h);
  const sCtx = snapshot.getContext("2d")!;
  if (layer.imageBitmap) sCtx.drawImage(layer.imageBitmap, 0, 0);
  sCtx.drawImage(overlayCanvasRef, 0, 0);  // overlay sudah berisi preview erase
  const newBitmap = await createImageBitmap(snapshot);
  commitPaintBitmap(...);
}
```

**Estimasi dampak:**
- **Menghilangkan 100% biaya upload GPU per event untuk eraser.**
- Eraser sekarang sama cepatnya dengan brush.
- **Perkiraan perbaikan: 60-90%** untuk eraser stroke panjang.

---

#### 4.5 ✅ Solusi #5: Ring buffer untuk `PaintSmoother`

**Tujuan:** Hilangkan alokasi array per event di smoother.

**Implementasi `paintSmoothing.ts`:**

```ts
export class PaintSmoother {
  // Pre-allocated ring buffer (capacity 10)
  private xs = new Float64Array(10);
  private ys = new Float64Array(10);
  private head = 0;        // indeks write berikutnya
  private size = 0;        // jumlah elemen valid
  private windowSize = 2;

  setWindowSize(size: number): void {
    this.windowSize = Math.max(1, Math.min(10, Math.round(size)));
  }

  reset(): void {
    this.head = 0;
    this.size = 0;
  }

  addPoint(x: number, y: number): { x: number; y: number } {
    this.xs[this.head] = x;
    this.ys[this.head] = y;
    this.head = (this.head + 1) % 10;
    if (this.size < 10) this.size++;

    const n = Math.min(this.size, this.windowSize);
    if (n <= 1) return { x, y };

    // Indeks paling baru = (head - 1 + 10) % 10, mundur n-1 langkah
    let totalWeight = 0;
    let wx = 0;
    let wy = 0;
    for (let i = 0; i < n; i++) {
      const idx = (this.head - 1 - i + 20) % 10;
      const weight = Math.pow(2, i);
      totalWeight += weight;
      wx += this.xs[idx] * weight;
      wy += this.ys[idx] * weight;
    }

    return { x: wx / totalWeight, y: wy / totalWeight };
  }
}
```

**Estimasi dampak:**
- 0 alokasi per event.
- **Perkiraan perbaikan: 1-3%** (kecil tetapi mengurangi GC jitter).

---

#### 4.6 ✅ Solusi #6: LRU eviction untuk brush tip cache

**Tujuan:** Batasi penggunaan memori brush tip cache.

**Implementasi ringan di `brushTipMask.ts`:**

```ts
const BRUSH_TIP_CACHE_MAX = 32;
const brushTipCache = new Map<string, BrushTip>();

export function clearBrushTipCache(): void {
  brushTipCache.clear();
}

export function getCachedBrushTip(brushDiameter: number, hardness: number): BrushTip {
  const diameter = Number.isFinite(brushDiameter) ? Math.max(1, brushDiameter) : 1;
  const h = clamp01(hardness);
  const key = `soft:${diameter}:${h}`;

  const cached = brushTipCache.get(key);
  if (cached) {
    // Move to end (most-recently-used)
    brushTipCache.delete(key);
    brushTipCache.set(key, cached);
    return cached;
  }

  const tip = rasterizeBrushTip(diameter, h);

  // LRU eviction
  if (brushTipCache.size >= BRUSH_TIP_CACHE_MAX) {
    const oldestKey = brushTipCache.keys().next().value;
    if (oldestKey !== undefined) brushTipCache.delete(oldestKey);
  }
  brushTipCache.set(key, tip);
  return tip;
}
```

**Estimasi dampak:**
- Idle RAM lebih stabil (≤32 entri × ukuran tip maksimum).
- **Perkiraan perbaikan: minor**, tetapi mencegah growth tak terbatas.

---

### Tier 3 — Optimisasi Mendalam (1-2 minggu, untuk skala besar)

#### 4.7 ⚡ Solusi #7: Composite mask via OffscreenCanvas + drawImage (skip getImageData)

**Tujuan:** Hilangkan sama sekali `getImageData`/`putImageData` dari paint path panas.

**Strategi:** Render mask ke OffscreenCanvas kecil (seukuran dirty rect) dengan `putImageData` sekali, lalu `drawImage` ke overlay canvas (GPU-accelerated composite).

**Implementasi:**

```ts
// Alokasi OffscreenCanvas reusable untuk mask rendering
let maskScratchCanvas: OffscreenCanvas | null = null;
let maskScratchCtx: OffscreenCanvasRenderingContext2D | null = null;

function ensureMaskScratch(width: number, height: number) {
  if (!maskScratchCanvas || maskScratchCanvas.width < width || maskScratchCanvas.height < height) {
    const w = Math.max(width, maskScratchCanvas?.width ?? 256);
    const h = Math.max(height, maskScratchCanvas?.height ?? 256);
    maskScratchCanvas = new OffscreenCanvas(w, h);
    maskScratchCtx = maskScratchCanvas.getContext("2d");
  }
}

// Konversi Uint8ClampedArray mask → ImageData → draw ke scratch → drawImage ke overlay
function compositeMaskViaDrawImage(
  overlayCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mask: Uint8ClampedArray,
  maskWidth: number,
  rect: DirtyRect,
  color: string,
  isEraser: boolean,
) {
  const r = clampDirtyRect(rect, maskWidth, /*height*/ maskWidth);  // assume square-ish for now
  if (r.x1 <= r.x0 || r.y1 <= r.y0) return;

  const subW = r.x1 - r.x0;
  const subH = r.y1 - r.y0;
  ensureMaskScratch(subW, subH);
  if (!maskScratchCtx) return;

  // Bangun ImageData dari sub-mask
  const subImage = new ImageData(subW, subH);
  const paint = parsePaintColor(color);
  for (let y = 0; y < subH; y++) {
    for (let x = 0; x < subW; x++) {
      const maskIdx = (r.y0 + y) * maskWidth + (r.x0 + x);
      const a = mask[maskIdx];
      const i = (y * subW + x) << 2;
      subImage.data[i]     = paint.r;
      subImage.data[i + 1] = paint.g;
      subImage.data[i + 2] = paint.b;
      subImage.data[i + 3] = a;
    }
  }
  maskScratchCtx.putImageData(subImage, 0, 0);

  // drawImage ke overlay (GPU-accelerated, blend via globalCompositeOperation)
  overlayCtx.save();
  overlayCtx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
  overlayCtx.drawImage(maskScratchCanvas, 0, 0, subW, subH, r.x0, r.y0, subW, subH);
  overlayCtx.restore();
}
```

**Estimasi dampak:**
- `drawImage` antar canvas adalah operasi GPU murni (atau DMA), tanpa pipeline stall.
- Untuk non-eraser: hapus `getImageData` sepenuhnya dari path panas.
- **Perkiraan perbaikan: 50-80%** di atas Solusi #1.

---

#### 4.8 ⚡ Solusi #8: Eyedropper — reusable OffscreenCanvas + ImageBitmap.pixelData

**Tujuan:** Alt+drag eyedropper tanpa alokasi per sample.

**Implementasi di `pixelSample.ts`:**

```ts
// Reusable scratch canvas
const sampleCanvas = new OffscreenCanvas(1, 1);
const sampleCtx = sampleCanvas.getContext("2d")!;

export function performPixelSampling(
  layers: readonly LayerNode[],
  docWidth: number,
  docHeight: number,
  x: number,
  y: number,
): [number, number, number, number] {
  if (x < 0 || x >= docWidth || y < 0 || y >= docHeight) return [0, 0, 0, 0];

  let composed: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || !layer.imageBitmap) continue;

    const rx = Math.floor(x - layer.transform.x);
    const ry = Math.floor(y - layer.transform.y);
    if (rx < 0 || rx >= layer.width || ry < 0 || ry >= layer.height) continue;

    sampleCtx.clearRect(0, 0, 1, 1);
    sampleCtx.drawImage(layer.imageBitmap, rx, ry, 1, 1, 0, 0, 1, 1);
    const imgData = sampleCtx.getImageData(0, 0, 1, 1);
    // ... composite sama seperti sebelumnya
  }
  return composed;
}
```

**Estimasi dampak:**
- Menghilangkan alokasi `OffscreenCanvas` per layer per sample.
- **Perkiraan perbaikan: 70-90%** untuk Alt+drag eyedropper (dari ~5-15 ms per event ke <1 ms).

---

#### 4.9 ⚡ Solusi #9: GPU-side paint via WebGL2 (long-term)

**Tujuan:** Pindahkan seluruh paint pipeline ke GPU — brush dab di-stamp ke FBO layer menggunakan shader, tanpa CPU round-trip.

**Arsitektur:**
- Tekstur mask di-upload sekali per stroke (incremental update via `texSubImage2D` hanya ke dirty region).
- Shader melakukan composite `paint OVER layer` atau `layer DESTINATION_OUT paint` (eraser).
- Hasil langsung menjadi tekstur layer baru — tidak perlu `commitBrushStroke` dengan `createImageBitmap` snapshot.

**Estimasi dampak:**
- **5-20× lebih cepat** untuk brush besar pada layer besar.
- Membutuhkan rewrite WebGL2 backend + paint session API — ** effort tinggi**.

**Catatan:** Ini adalah pendekatan akselerasi GPU yang umum pada editor foto profesional. Cocok sebagai roadmap Q3/Q4 setelah Tier 1 & 2 di-landed.

---

## 5. Prioritas Implementasi

| # | Solusi | Effort | Estimasi Dampak | Risiko | Rekomendasi |
|---|--------|--------|----------------|--------|-------------|
| 1 | `paintMaskToContext` dirty rect | 1-2 hari | 80-95% | Rendah | **Wajib pertama** |
| 2 | Delta `onPaintStroke` (no array copy) | 0.5-1 hari | 5-15% | Rendah | Bersama #1 |
| 3 | RAF throttle composite | 0.5-1 hari | 30-60% | Rendah | Bersama #1 |
| 4 | Eraser via overlay (no per-event upload) | 1-2 hari | 60-90% (eraser) | Sedang (visual behavior change) | Setelah #1 |
| 5 | Ring buffer PaintSmoother | 0.5 hari | 1-3% | Rendah | Kapan saja |
| 6 | LRU brush tip cache | 0.5 hari | minor (RAM) | Rendah | Kapan saja |
| 7 | Composite via `drawImage` scratch | 2-3 hari | 50-80% di atas #1 | Sedang | Setelah #1 stabil |
| 8 | Reusable eyedropper canvas | 0.5 hari | 70-90% (eyedropper) | Rendah | Kapan saja |
| 9 | GPU-side paint pipeline | 2-4 minggu | 5-20× | Tinggi | Roadmap Q3/Q4 |

**Minimum viable fix:** Solusi #1 + #2 + #3 + #4. Setelah ini, brush harus terasa responsif bahkan untuk layer 8000×8000 dengan brush 500px. Tier 3 adalah optimisasi tambahan.

---

## 6. Validasi & Pengujian

Setelah implementasi, jalankan pengujian berikut untuk memastikan tidak ada regresi:

### 6.1 Pengujian Fungsional (Visual)

```bash
cd apps/desktop
bun run test -- --filter "paintStrokeRenderer"
bun run test -- --filter "brushTipMask"
bun run test -- --filter "brushVisualRegression"
bun run test -- --filter "useBrushOverlay"
```

Pastikan test visual regression (snapshot) tetap lulus — composite alpha harus identik sebelum/sesudah optimisasi.

### 6.2 Pengujian Performa (Manual)

Skenario:
1. Buka dokumen 4000×3000 dengan satu layer bitmap.
2. Aktifkan Brush tool, size 100, hardness 0.5.
3. Mulai stroke panjang (5 detik, gerakan acak).
4. Rekam frame time via DevTools Performance tab.

Target setelah Tier 1:
- Frame time rata-rata < 16.6 ms (60 fps)
- Frame time p99 < 25 ms
- Tidak ada frame > 50 ms

### 6.3 Pengujian Eraser Khusus

Skenario:
1. Layer 4000×3000 dengan konten penuh.
2. Eraser tool, size 200, hardness 0.3.
3. Stroke panjang 5 detik.

Target setelah Solusi #4:
- Frame time rata-rata < 20 ms
- GPU upload count: 1 per stroke (bukan 60 per detik)

### 6.4 Pengujian Memory

```bash
# Idle RAM setelah 1000 stroke
bun run perf:paint-history
```

Pastikan idle RAM tetap < 250 MB (sesuai `performance-measurement-protocol.md`).

---

## 7. Referensi File & Lokasi Penting

### File yang harus diubah:

| File | Baris Terkait | Perubahan |
|------|---------------|-----------|
| `apps/desktop/src/components/editor/brushTipMask.ts` | 347-396 | Tambah `compositeMaskToImageDataDirty`, `paintMaskToContextDirty`, helper dirty rect |
| `apps/desktop/src/components/editor/useBrushOverlay.ts` | 55-205 | Track `dirtyRect`, gunakan versi dirty region, RAF throttle, eraser via overlay |
| `apps/desktop/src/viewport/input-handler.ts` | 36-41, 242-244 | Ganti signature `onPaintStroke` untuk delta |
| `apps/desktop/src/components/editor/canvas/useCanvasPointerTools.ts` | 967-974, 1011-1018 | Update pemanggilan `onPaintStroke` untuk delta |
| `apps/desktop/src/components/editor/paintSmoothing.ts` | 8-42 | Refactor ring buffer |
| `apps/desktop/src/engine/pixelSample.ts` | 28-53 | Reusable OffscreenCanvas |

### File rujukan (tidak diubah):

| File | Alasan |
|------|--------|
| `apps/desktop/src/renderer/webgl2.ts` | Sudah benar — bukan sumber lag |
| `apps/desktop/src/renderer/scheduler.ts` | Sudah benar — single RAF per frame |
| `apps/desktop/src/components/editor/brushHardnessProfile.ts` | OK — precomputed curve |
| `apps/desktop/src/components/editor/paintCommitCommand.ts` | OK — jalan sekali per stroke |
| `apps/desktop/src/engine/snapshot.ts` | OK — shallow clone, tidak copy pixel |
| `apps/desktop/src/components/editor/brushToolState.ts` | OK — konstanta & clamp |
| `apps/desktop/src/components/editor/BrushOptionBar.tsx` | OK — UI slider |
| `apps/desktop/src/components/editor/BrushCursorOverlay.tsx` | OK — overlay ringan |
| `crates/core/src/brush.rs` | Stub Rust — tidak dipakai di paint path TS |

---

## 8. Catatan Tambahan

### 8.1 Mengapa Rust crate `brush.rs` tidak relevan di sini

File `crates/core/src/brush.rs` berisi `BrushSettings::paint_pixel()` yang merupakan implementasi brush di sisi Rust. Namun, setelah audit, fungsi ini **tidak pernah dipanggil** dari sisi Tauri (lihat `apps/desktop/src-tauri/src/commands.rs` — tidak ada command yang menggunakan `brush.rs`). Seluruh paint path berjalan di TypeScript. Jadi optimisasi Rust tidak akan mempengaruhi performa brush.

### 8.2 Mengapa WebGL2 render sudah optimal

`WebGL2Backend.render()` menggunakan ping-pong FBO + single-pass composite per layer — sudah benar. Tidak ada redundant state change. `RenderScheduler` menggunakan single RAF per frame. Renderer **bukan** sumber lag.

### 8.3 Mengapa `paintHistoryBudget` tidak terkait

`paintHistoryBudget.ts` hanya meng-estimasi memori undo/redo untuk snapshot. Ini berjalan saat `commitBrushStroke` (pointer up), bukan per `pointermove`. Bukan sumber lag real-time.

### 8.4 Catatan implementasi: jangan lupa reset state

Saat mengimplementasi Solusi #1 (dirty rect), pastikan reset pada:
- Pointer up (`commitBrushStroke`): `paintSession = null` (otomatis reset dirtyRect)
- Pointer cancel / lost capture: sama
- Switch tool / switch document: `paintSession = null`
- `setOverlayCanvasRef(null)`: `paintSession = null`

Lokasi reset saat ini sudah benar — tinggal pastikan `dirtyRect` ter-reset otomatis karena bagian dari `paintSession`.

### 8.5 Catatan: `getEffectiveFlowMultiplier` vestigial

`brushTipMask.ts:177-179`:
```ts
export function getEffectiveFlowMultiplier(_hardness: number): number {
  return 1;
}
```

Selalu return 1 — tidak berpengaruh apa pun. Aman untuk dihapus atau dibiarkan. Tidak terkait performa.

### 8.6 Catatan: `paintStrokeRenderer.ts` sudah deprecated

File `paintStrokeRenderer.ts` hanya dipakai di test (lihat grep). Path production sudah pindah ke `useBrushOverlay.ts` + `brushTipMask.ts`. Aman untuk hapus atau biarkan sebagai dokumentasi.

---

## 9. Kesimpulan

Masalah brush berat/laggy di Photrez **bukan** masalah arsitektur fundamental. WebGL2 renderer, scheduler, dan Rust backend sudah efisien. Masalahnya terlokalisasi di **satu jalur CPU** yang melakukan full-canvas `getImageData`/`putImageData` per `pointermove`.

Dengan mengimplementasikan **Solusi #1 (dirty rect), #2 (delta points), #3 (RAF throttle), dan #4 (eraser via overlay)** — total effort ±3-5 hari — brush akan terasa responsif bahkan untuk layer 8000×8000 dengan brush diameter 500px. Tier 2 dan Tier 3 adalah optimisasi tambahan untuk kasus ekstrim (eyedropper Alt-drag, GPU-side paint pipeline).

Solusi ini kompatibel dengan struktur kode eksisting — tidak perlu rewrite engine atau renderer. Hanya modifikasi lokal di 4-6 file yang semuanya sudah ter-identifikasi dengan baris-baris yang perlu diubah.

---

*Dokumen analisis ini berdasarkan audit langsung terhadap kode sumber `photrez-main.zip` (versi 2026-07-09). Semua nomor baris mengacu pada file tersebut.*
