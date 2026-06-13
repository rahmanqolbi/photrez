# GPU-Accelerated Smooth Zoom Transitions — Design Document

**Date**: 2026-06-13
**Status**: Draft — Pending User Approval
**Scope**: Viewport rendering pipeline migration

---

## 1. Problem Statement

### 1.1 Current Architecture

Photrez menggunakan **CSS transform-based viewport**:

```
┌────────────────────────────────────────────────────┐
│ Viewport Container (flex-1, overflow-hidden)        │
│                                                     │
│   ┌──────────────────────────────────────┐          │
│   │ <canvas> (WebGL2)                    │          │
│   │  style.left = pan.x                  │          │
│   │  style.top = pan.y                   │          │
│   │  style.width = docWidth * zoom       │          │
│   │  canvas.width = docWidth * zoom * dpr│          │
│   └──────────────────────────────────────┘          │
│                                                     │
│   ┌──────────────────────────────────────┐          │
│   │ Overlay <div> (pointer-events: none) │          │
│   │  transform: translate3d(pan) scale(z)│          │
│   │  width/height: docWidth/docHeight    │          │
│   │                                      │          │
│   │   <svg> Selection, Guides, Handles   │          │
│   │   <CropOverlay>                      │          │
│   │   <BrushCursorOverlay>               │          │
│   └──────────────────────────────────────┘          │
└────────────────────────────────────────────────────┘
```

**File terlibat saat ini:**
- `webgl2.ts:computeViewMatrix()` → Identity ortho (no zoom/pan in shader)
- `webgl2.ts:resize()` → `canvas.width = docW * zoom * dpr`
- `CanvasViewport.tsx:L601-617` → CSS `left/top/width/height` positioning
- `CanvasViewport.tsx:L619-631` → CSS `transform: translate3d(...) scale(zoom)`
- `usePanNavigation.ts:L81` → `engine.zoom(factor, anchorX, anchorY)`
- `useViewportRenderer.ts:L34` → `renderer.resize(docW, docH, zoom, dpr)`

### 1.2 Masalah Spesifik

| # | Masalah | Penyebab | File |
|---|---------|----------|------|
| 1 | **Jiggle saat zoom** | CSS transition pada left/top/transform memiliki durasi berbeda dari perubahan instan canvas.width | `CanvasViewport.tsx` |
| 2 | **VRAM exhaustion** | `canvas.width = 709 * 14.86 * 2 = 21,072px` melampaui GPU limit | `webgl2.ts:resize()` |
| 3 | **Hard cap 4096px** | Patch sementara yang mengorbankan resolusi visual | `webgl2.ts:L404` |
| 4 | **Tidak bisa animasi** | `transition: "none"` karena semua alternatif CSS transition menyebabkan bug | `CanvasViewport.tsx:L616,625` |

---

## 2. Proposed Architecture

### 2.1 Target Architecture

```
┌──────────────────────────────────────────────────────┐
│ Viewport Container (flex-1, overflow-hidden)          │
│                                                       │
│   ┌──────────────────────────────────────────┐        │
│   │ <canvas> (WebGL2)                        │        │
│   │  style: position:absolute; inset:0       │        │
│   │  canvas.width = viewportWidth * dpr      │  FIXED │
│   │  canvas.height = viewportHeight * dpr    │  SIZE  │
│   │                                          │        │
│   │  u_viewProj = camera.getVPMatrix()       │        │
│   │  (zoom/pan applied INSIDE shader)        │        │
│   └──────────────────────────────────────────┘        │
│                                                       │
│   ┌──────────────────────────────────────────┐        │
│   │ Overlay <svg> (position:absolute; inset:0)│        │
│   │  NO CSS transform                         │        │
│   │  All coords: camera.docToScreen(dx, dy)  │        │
│   │                                          │        │
│   │  selection, guides, handles, crop        │        │
│   │  (all in screen-space pixels)            │        │
│   └──────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

### 2.2 Keputusan Arsitektur

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| Canvas sizing | Viewport-fixed | Menghilangkan VRAM exhaustion, canvas hanya sebesar layar |
| Zoom/pan application | WebGL projection matrix | GPU-native, zero layout thrashing |
| Overlay positioning | Manual JS via camera | Backward compatible, bisa incremental |
| Animation timing | 150ms easeOutCubic (keyboard/fit), instan (scroll) | Best practice Figma/tldraw |
| Modern Crop | Tetap CSS transform (Phase 2) | Risiko regresi terlalu tinggi |

---

## 3. Core Algorithm: ViewportCamera

### 3.1 Camera State Model

```typescript
interface CameraState {
  x: number;        // Pan offset X (document units)
  y: number;        // Pan offset Y (document units)
  zoom: number;     // Scale factor (1.0 = 100%)
}

// Animation state (internal)
interface AnimationState {
  from: CameraState;       // Start state
  to: CameraState;         // Target state  
  startTime: number;       // performance.now() at start
  duration: number;        // milliseconds
  easing: (t: number) => number;  // 0→1 mapping
}
```

### 3.2 View-Projection Matrix Algorithm

Matriks ortografis 2D yang menggabungkan zoom dan pan:

```
Step 1: Projection Matrix (pixel → NDC)
  Maps [0, canvasW] × [0, canvasH] → [-1, 1] × [-1, 1]
  
  projMat = [
    2/canvasW,  0,          0,  0,
    0,         -2/canvasH,  0,  0,
    0,          0,          1,  0,
   -1,          1,          0,  1
  ]

Step 2: Camera Matrix (world → camera-local)
  cameraMat = translate(camera.x, camera.y) × scale(1/zoom, 1/zoom)

Step 3: View Matrix (inverse of camera)
  viewMat = inverse(cameraMat)
         = scale(zoom, zoom) × translate(-camera.x, -camera.y)

Step 4: VP Matrix = projMat × viewMat
  Final: maps document-space coords → clip-space [-1, 1]
```

**Implementasi kode:**

```typescript
getViewProjectionMatrix(canvasW: number, canvasH: number): Float32Array {
  const { x, y, zoom } = this.current;
  
  // Combined projection × view in one matrix multiplication:
  // proj: [2/cw, 0, 0, 0,  0, -2/ch, 0, 0,  0, 0, 1, 0,  -1, 1, 0, 1]
  // view: scale(z, z) × translate(-x, -y)
  //     = [z, 0, 0, 0,  0, z, 0, 0,  0, 0, 1, 0,  -x*z, -y*z, 0, 1]
  
  const m = new Float32Array(16);
  m[0]  = (2 * zoom) / canvasW;
  m[5]  = (-2 * zoom) / canvasH;   // Y-flip (screen top = 0)
  m[10] = 1;
  m[12] = -1 + (-x * 2 * zoom) / canvasW;  // pan X in NDC
  m[13] =  1 + (-y * (-2) * zoom) / canvasH; // pan Y in NDC (flipped)
  m[15] = 1;
  return m;
}
```

### 3.3 Zoom-to-Point Algorithm

Saat user scroll-zoom, titik di bawah kursor mouse harus tetap diam di layar.

```
Algorithm: Zoom-to-Mouse-Point (dari WebGL Fundamentals)

Input: factor (1.15 zoom in, 0.85 zoom out), screenX, screenY
  
  1. Hitung posisi dokumen di bawah kursor SEBELUM zoom:
     preDocX = (screenX / zoom_old) - camera.x / zoom_old
     // Atau via inverse VP matrix:
     preDoc = inverse(vpMatrix) × clipSpaceMousePos
  
  2. Update zoom:
     zoom_new = clamp(zoom_old * factor, 0.01, 100)
  
  3. Hitung posisi dokumen di bawah kursor SETELAH zoom (dengan pan lama):
     postDoc = inverse(vpMatrix_new) × clipSpaceMousePos
  
  4. Koreksi pan agar preDoc == postDoc:
     camera.x += preDocX - postDocX
     camera.y += preDocY - postDocY
```

**Implementasi efisien tanpa matrix inverse:**

```typescript
zoomToPoint(factor: number, screenX: number, screenY: number): void {
  const oldZoom = this.current.zoom;
  const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
  
  // Titik anchor dalam document space (sebelum zoom)
  // screenX = docX * oldZoom + camera.x
  // docX = (screenX - camera.x) / oldZoom
  
  // Setelah zoom, kita ingin titik yang sama tetap di screenX:
  // screenX = docX * newZoom + camera.x_new
  // camera.x_new = screenX - docX * newZoom
  //              = screenX - ((screenX - camera.x) / oldZoom) * newZoom
  
  this.current.x = screenX - ((screenX - this.current.x) / oldZoom) * newZoom;
  this.current.y = screenY - ((screenY - this.current.y) / oldZoom) * newZoom;
  this.current.zoom = newZoom;
}
```

### 3.4 Smooth Zoom Animation Algorithm

```
Algorithm: Animated Zoom Transition

Input: targetZoom, targetX, targetY, duration (150ms), easing (easeOutCubic)

  1. Simpan snapshot state saat ini sebagai `from`:
     from = { x: current.x, y: current.y, zoom: current.zoom }
  
  2. Hitung target state:
     to = { x: targetX, y: targetY, zoom: targetZoom }
  
  3. Catat waktu mulai:
     startTime = performance.now()
  
  4. Pada setiap frame (via requestAnimationFrame):
     elapsed = performance.now() - startTime
     t = clamp(elapsed / duration, 0, 1)
     eased = easing(t)  // easeOutCubic: 1 - (1-t)^3
     
     current.x    = lerp(from.x, to.x, eased)
     current.y    = lerp(from.y, to.y, eased)
     current.zoom = lerp(from.zoom, to.zoom, eased)
     
     // NOTE: Zoom interpolation di linear space, bukan logarithmic.
     // Untuk zoom range kecil (150ms transition), perbedaan negligible.
     // Untuk camera fly (zoom 1% → 100%), gunakan exp lerp:
     //   current.zoom = from.zoom * Math.pow(to.zoom / from.zoom, eased)
     
  5. Jika t >= 1.0:
     current = { ...to }  // Snap ke target exact
     animation = null       // Selesai
```

### 3.5 Screen ↔ Document Coordinate Conversion

```typescript
// Screen → Document (untuk tool input: brush, crop, selection)
screenToDocument(screenX: number, screenY: number): { x: number; y: number } {
  const { x, y, zoom } = this.current;
  return {
    x: (screenX - x) / zoom,
    y: (screenY - y) / zoom,
  };
}

// Document → Screen (untuk overlay positioning: handles, guides)
documentToScreen(docX: number, docY: number): { x: number; y: number } {
  const { x, y, zoom } = this.current;
  return {
    x: docX * zoom + x,
    y: docY * zoom + y,
  };
}
```

> **Catatan**: Formula ini identik dengan `coords.ts` yang sudah ada! Perbedaannya hanya di mana state `x`, `y`, `zoom` disimpan (sekarang di `ViewportCamera`, bukan di `engine.getViewport()`).

---

## 4. Data Flow

### 4.1 Current Flow (CSS Transform)

```
User scrolls Ctrl+wheel
  → usePanNavigation.handleWheel()
    → engine.zoom(factor, anchorX, anchorY)     // Mutate engine viewport state
    → syncViewport()                              // Read engine → set SolidJS signals
      → setZoom(vp.zoom), setPan({x: vp.panX, y: vp.panY})
    → scheduler.requestRender()                   // Queue RAF
      → renderer.render(engine.getRenderState())  // WebGL draw
    → [CSS reflow] canvas style.left/top/width/height updated by SolidJS reactivity
    → [CSS reflow] overlay div transform updated by SolidJS reactivity
```

### 4.2 New Flow (WebGL Camera)

```
User scrolls Ctrl+wheel
  → usePanNavigation.handleWheel()
    → camera.zoomToPoint(factor, screenX, screenY) // Mutate camera state (instant)
    → syncFromCamera()                              // Read camera → set SolidJS signals
      → setZoom(camera.zoom), setPan({x: camera.x, y: camera.y})
    → scheduler.requestRender()                     // Queue RAF
      → [canvas unchanged — size stays viewport-sized]
      → renderer.render(state, camera.getVPMatrix()) // WebGL draw with VP matrix
      → [overlay SVG coords recalculated via camera.docToScreen()]

User presses Ctrl+=
  → useCanvasKeyboard (zoom in shortcut)
    → camera.animateZoomToPoint(1.2, centerX, centerY, 150, easeOutCubic)
    → scheduler.startContinuousRender()             // Start RAF loop
      → each frame:
          camera.tick(performance.now())             // Interpolate
          syncFromCamera()                           // Update signals
          renderer.render(state, camera.getVPMatrix())
      → when animation done:
          scheduler.stopContinuousRender()           // Back to on-demand

User presses Ctrl+0 (fit to screen)
  → useViewportRenderer.fitToScreenAndRender()
    → Compute target zoom & pan for fit
    → camera.animateTo({ x: fitPanX, y: fitPanY, zoom: fitZoom }, 150, easeOutCubic)
    → scheduler.startContinuousRender()
```

### 4.3 Engine ↔ Camera Synchronization

```
                   ┌─────────────────┐
                   │ ViewportCamera   │
                   │ x, y, zoom      │◄──── zoomToPoint(), pan(), animateTo()
                   └────────┬────────┘
                            │
                   syncFromCamera()
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        setZoom()     setPan()    engine.setViewport()
              │             │             │
              ▼             ▼             ▼
     SolidJS signal   SolidJS signal   Engine model
     (for UI display) (for overlays)   (for coordinate
                                        conversions that
                                        still use engine)
```

**Kunci**: `ViewportCamera` menjadi **single source of truth** untuk zoom/pan. Engine `viewport` state tetap di-sync agar komponen lain yang masih membaca `engine.getViewport()` tidak rusak.

---

## 5. File Change Map

### 5.1 New Files

| File | Purpose |
|------|---------|
| `src/viewport/viewportCamera.ts` | Camera class: state, matrix, animation, conversions |
| `src/viewport/easing.ts` | Easing functions: easeOutCubic, easeInOutCubic, linear |

### 5.2 Modified Files (by risk level)

#### HIGH Risk (coordinate systems)

| File | Changes |
|------|---------|
| `CanvasViewport.tsx` | Canvas → full viewport, overlay → screen-space, remove CSS transform container |
| `webgl2.ts` | `resize()` → viewport-based, `render()` accepts VP matrix, remove `computeViewMatrix()` |
| `coords.ts` | Delegate to camera, keep API signature |

#### MEDIUM Risk (viewport management)

| File | Changes |
|------|---------|
| `useViewportRenderer.ts` | `resizeRenderer()` viewport-based, animation loop, `fitToScreenAndRender()` animated |
| `usePanNavigation.ts` | Use camera.zoomToPoint/pan instead of engine.zoom/pan |
| `useCanvasKeyboard.ts` | Zoom shortcuts use camera.animateZoomToPoint() |
| `EditorContext.tsx` | Add ViewportCamera instance, syncFromCamera() |
| `workspaceSync.ts` | syncViewport reads from camera |
| `scheduler.ts` | Add continuous render mode |

#### LOW Risk (overlay coordinates)

| File | Changes |
|------|---------|
| `SelectionTransformOverlay.tsx` | Coords via camera.docToScreen() |
| `CropOverlay.tsx` | Classic crop coords via camera |
| `SmartGuides.tsx` | Snap line coords via camera |
| `HoverHighlight.tsx` | Hover outline via camera |
| `BrushCursorOverlay.tsx` | Cursor position via camera |
| `TransformHud.tsx` | HUD position (already screen-space, minimal change) |

#### DEFERRED (Modern Crop — Phase 2)

| File | Changes |
|------|---------|
| `ModernCropOverlay.tsx` | Keep CSS transform, integrate later |
| `modernCropGeometry.ts` | Keep as-is, integrate later |

### 5.3 Type Changes

```typescript
// renderer/types.ts — RenderBackend interface
interface RenderBackend {
  // BEFORE: resize(docWidth, docHeight, zoom, dpr): void;
  // AFTER:
  resizeToViewport(viewportWidth: number, viewportHeight: number, dpr: number): void;
  
  // BEFORE: render(state: RenderState): void;
  // AFTER:
  render(state: RenderState, viewProjectionMatrix: Float32Array): void;
}

// engine/types.ts — no changes needed (RenderState unchanged)
// The VP matrix is passed as a separate argument, not embedded in RenderState.
```

---

## 6. Overlay Migration Strategy

### 6.1 Current: Document-Space SVG Inside CSS Transform Container

```tsx
// CanvasViewport.tsx — CURRENT
<div style={{
  transform: `translate3d(${pan().x}px, ${pan().y}px, 0) scale(${zoom()})`,
  width: `${docWidth()}px`,
  height: `${docHeight()}px`,
}}>
  <svg>
    {/* Semua koordinat dalam document-space */}
    <rect x={layer.x} y={layer.y} width={layer.w} height={layer.h} />
    <line x1={0} y1={docH/2} x2={docW} y2={docH/2} stroke-width={1/zoom()} />
  </svg>
</div>
```

### 6.2 New: Screen-Space SVG Without CSS Transform

```tsx
// CanvasViewport.tsx — NEW
<svg style={{ position: "absolute", inset: 0 }}>
  {/* Semua koordinat dalam screen-space */}
  {(() => {
    const topLeft = camera.docToScreen(layer.x, layer.y);
    return <rect 
      x={topLeft.x} 
      y={topLeft.y}
      width={layer.w * zoom()} 
      height={layer.h * zoom()} 
    />;
  })()}
  
  {/* Snap lines: endpoints converted */}
  <line 
    x1={camera.docToScreen(0, docH/2).x}
    y1={camera.docToScreen(0, docH/2).y}
    x2={camera.docToScreen(docW, docH/2).x}
    y2={camera.docToScreen(docW, docH/2).y}
    stroke-width={1}  {/* pixel-constant, no longer 1/zoom() */}
  />
</svg>
```

### 6.3 Migration Pattern for Each Overlay

**Pattern umum** — setiap overlay yang sekarang menggunakan document-space coordinates:

```typescript
// BEFORE: document-space coordinate used directly in SVG
const docX = layer.transform.x;

// AFTER: convert to screen-space via camera
const screenPos = camera.docToScreen(docX, docY);
// Use screenPos.x, screenPos.y in SVG attributes
```

**stroke-width perubahan**:
```typescript
// BEFORE: stroke-width={1 / zoom()} to keep 1px on screen
// AFTER:  stroke-width={1}  (already in screen pixels)
```

---

## 7. Animation System

### 7.1 Easing Functions

```typescript
// easing.ts
export type EasingFn = (t: number) => number;

export const linear: EasingFn = (t) => t;

export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
```

### 7.2 Animation Loop Integration

```typescript
// Di useViewportRenderer.ts
const animationLoop = () => {
  const stillAnimating = camera.tick(performance.now());
  syncFromCamera();
  scheduler.requestRender();
  
  if (stillAnimating) {
    animationRafId = requestAnimationFrame(animationLoop);
  }
};

// Dipanggil dari camera.animateZoomToPoint()
camera.onAnimationStart = () => {
  animationRafId = requestAnimationFrame(animationLoop);
};
```

### 7.3 Scheduler Enhancement

```typescript
class RenderScheduler {
  private framePending = false;
  private continuousMode = false;
  private renderCallback: (() => void) | null = null;
  
  requestRender(): void { /* existing — single frame */ }
  
  startContinuousRender(): void {
    if (this.continuousMode) return;
    this.continuousMode = true;
    const loop = () => {
      if (!this.continuousMode) return;
      this.renderCallback?.();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  
  stopContinuousRender(): void {
    this.continuousMode = false;
  }
}
```

---

## 8. Backward Compatibility

### 8.1 Engine Viewport State Sync

`DocumentEngine.viewport` tetap di-maintain agar code path yang belum di-migrate (Modern Crop, undo/redo viewport restore, Navigator panel) tetap berfungsi:

```typescript
function syncFromCamera() {
  const state = camera.getState();
  
  // Update SolidJS signals
  batch(() => {
    setZoom(state.zoom);
    setPan({ x: state.x, y: state.y });
  });
  
  // Keep engine in sync
  engine.setViewport({
    panX: state.x,
    panY: state.y,
    zoom: state.zoom,
  });
}
```

### 8.2 Modern Crop Fallback Path

Ketika `activeTool === "crop" && cropInteractionMode === "modern"`:
- Canvas positioning TETAP menggunakan CSS transform (`modernImageTransformStyle`)
- Overlay TETAP menggunakan existing ModernCropOverlay
- Camera VP matrix TIDAK digunakan untuk rendering
- Ini identik dengan kode saat ini — zero regression risk

```tsx
// CanvasViewport.tsx — conditional rendering
<canvas style={{
  ...(isModernCropActive()
    ? {
        // FALLBACK: Existing CSS transform path for Modern Crop
        left: "0px", top: "0px",
        width: `${docWidth()}px`, height: `${docHeight()}px`,
        transform: modernImageTransformStyle(),
      }
    : {
        // NEW: Full-viewport WebGL camera path
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
      }
  ),
}} />
```

---

## 9. Testing Strategy

### 9.1 ViewportCamera Unit Tests

```
viewportCamera.test.ts:
  ✓ getViewProjectionMatrix returns valid 4x4 identity at zoom=1 pan=(0,0)
  ✓ zoom changes scale in VP matrix
  ✓ pan changes translation in VP matrix
  ✓ zoomToPoint keeps anchor point stable (round-trip check)
  ✓ screenToDocument ↔ documentToScreen round-trip accuracy (< 0.001px error)
  ✓ animateZoomToPoint interpolates smoothly over duration
  ✓ tick() returns false when animation complete
  ✓ animation interrupted by new zoom resets cleanly
  ✓ fitToScreen computes correct zoom and centered pan
  ✓ zoom clamping respects MIN_ZOOM and MAX_ZOOM
```

### 9.2 Renderer Integration Tests

```
webgl2.test.ts:
  ✓ resizeToViewport sets canvas to viewport dimensions
  ✓ render with VP matrix draws layers at correct positions
  ✓ FBO textures sized to viewport (no VRAM exhaustion at high zoom)
```

### 9.3 Overlay Coordinate Tests

```
overlayCoords.test.ts:
  ✓ Selection rect screen position matches camera.docToScreen()
  ✓ Smart guide lines align with document edges at various zoom levels
  ✓ Crop overlay handles positioned correctly after zoom
  ✓ Brush cursor radius = brushSize * zoom (screen pixels)
```

### 9.4 Regression Test Matrix

| Scenario | Expect |
|----------|--------|
| Zoom via scroll wheel | Instant, anchor at cursor |
| Zoom via Ctrl+= | 150ms smooth animation |
| Zoom via Ctrl+- | 150ms smooth animation |
| Fit to screen (Ctrl+0) | 150ms smooth animation |
| Pan via Space+drag | Instant, no jiggle |
| Pan via scroll | Instant |
| Brush paint at 500% zoom | Accurate stroke position |
| Crop overlay at 200% zoom | Handles aligned |
| Classic crop drag | Crop rect tracks mouse |
| Smart guides snap | Lines aligned with edges |
| Navigator panel zoom | Synced with main viewport |
| Window resize | Canvas + overlays resize |
| High zoom (1000%+) | No crash, no VRAM exhaustion |
| Modern Crop mode | Unchanged behavior (CSS fallback) |

---

## 10. Execution Order

| Phase | Description | Risk | Files | Est. Effort |
|-------|-------------|------|-------|-------------|
| 1 | ViewportCamera + easing (standalone, no integration) | LOW | 2 new + tests | Small |
| 2 | WebGL2 renderer migration (resizeToViewport, VP matrix) | MEDIUM | webgl2.ts, types.ts | Medium |
| 3 | Scheduler continuous mode | LOW | scheduler.ts | Small |
| 4 | CanvasViewport + EditorContext integration | HIGH | CanvasViewport.tsx, EditorContext.tsx, workspaceSync.ts | Large |
| 5 | Pan/zoom handler migration | MEDIUM | usePanNavigation.ts, useCanvasKeyboard.ts, useViewportRenderer.ts | Medium |
| 6 | Overlay coordinate migration | MEDIUM | 6 overlay files | Medium |
| 7 | coords.ts backward compat | LOW | coords.ts | Small |
| 8 | Testing & verification | — | Test files | Medium |

**Total estimated**: ~15 files modified/created, ~800-1200 lines changed.

---

## 11. Rollback Strategy

1. **Feature flag**: `USE_GPU_CAMERA = true/false` di EditorContext
2. **Dual path in CanvasViewport**: CSS transform path preserved behind flag
3. **Renderer**: `resize()` method kept alongside `resizeToViewport()`
4. **Per-phase rollback**: Each phase can be reverted independently via git

---

## 12. Future Considerations

Setelah stabil:
1. **Modern Crop Phase 2**: Migrasi Modern Crop ke WebGL camera
2. **Exponential zoom interpolation**: `zoom = from * pow(to/from, t)` untuk zoom range besar
3. **Pixel grid overlay**: Render pixel grid di WebGL saat zoom > 800%
4. **Sub-pixel rendering**: Bilinear → nearest filtering switch saat zoom > 400%
5. **wgpu migration**: VP matrix pattern identik saat pindah ke Rust wgpu renderer
