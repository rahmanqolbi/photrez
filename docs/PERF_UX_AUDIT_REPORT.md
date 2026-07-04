# Photrez Performance, Memory & UI/UX Audit Report

This report documents issues and risks concerning GPU memory management, WebGL resource lifetimes, and visual styling compliance with the design tokens.

---

## 1. GPU VRAM Memory Leak Analysis

### 🚨 1. Texture Leak on Layer Deletion
- **Location:** `apps/desktop/src/components/editor/layers/useLayerActions.ts` (line 193)
- **Vulnerability:** When a layer is deleted via the panel button or context menu:
  ```typescript
  history.commit(engine.snapshot(), "Delete Layer");
  engine.deleteLayer(activeId);
  scheduler.requestRender();
  ```
  The active texture is never disposed of on the GPU. The core engine deletes the layer metadata, but the `WebGL2Backend` maintains the WebGL texture reference inside its internal `this.textures = new Map<string, WebGLTexture>()` cache.
- **Impact:** Repeatedly adding, painting, and deleting layers leads to a persistent GPU memory leak, potentially causing driver resets or app crashes when VRAM is exhausted.
- **Remedy:** Call `renderer.destroyTexture(activeId)` before or after removing the layer from the engine:
  ```typescript
  renderer.destroyTexture(activeId);
  ```

### 🚨 2. Texture Leak on Document Tab Closure
- **Location:** `apps/desktop/src/components/editor/shell/DocumentTabsBar.tsx` (line 87)
- **Vulnerability:** When closing an open document tab:
  ```typescript
  workspace.removeDocument(id);
  scheduler.requestRender();
  ```
  The document's session is disposed of. However, the system does not loop through the closed document's layer stack to release their corresponding WebGL textures.
- **Impact:** Opening, editing, and closing multiple image files will continuously leak WebGL textures in the GPU memory, leading to memory exhaustion after closing several documents.
- **Remedy:** Extract layer IDs from the document session before removal and destroy their WebGL textures:
  ```typescript
  const session = workspace.getSession(id);
  if (session) {
    for (const layer of session.engine.getLayers()) {
      renderer.destroyTexture(layer.id);
    }
  }
  ```

### 🚨 3. Orphaned ImageBitmap Leaks during Slider Dragging
- **Location:** `apps/desktop/src/engine/document.ts` (`applyBasicAdjustment`, line 598)
- **Vulnerability:** When a user drags adjustment sliders (Brightness, Contrast, Saturation), `applyBasicAdjustment` is invoked repeatedly (up to 60 times per second) to generate preview states. To prevent breaking history undo/redo states, the engine avoids closing replaced bitmaps:
  ```typescript
  // NOTE: we intentionally do NOT close the old imageBitmap here.
  // Snapshots in the undo/redo stack may hold a reference to it;
  ```
  However, these intermediate preview bitmaps are **never** committed to the history stack (only the final committed state is recorded).
- **Impact:** Every single slider move generates a new unclosed `ImageBitmap` object in memory. Under large image dimensions, this results in an immediate accumulation of hundreds of megabytes of orphaned graphics resources, which can crash the application (OOM) before the garbage collector can reclaim them.
- **Remedy:** Differentiate between history-committed states and transient preview steps. Transient bitmaps that do not exist in the history stack must be `.close()`'d immediately when replaced.

### 🚨 4. Graphics Memory Leaks from Unreleased Undo/Redo Snapshots
- **Location:** `apps/desktop/src/engine/history.ts` (`CommandHistory`, lines 43, 47, 125)
- **Vulnerability:** Discarding snapshots (during `redoStack` clearing on new operations, `maxDepth` eviction, or `clear()`) simply drops JavaScript references to the snapshots' `DocumentModel`. The layer `ImageBitmap` objects inside the evicted snapshots are never explicitly closed via `.close()`.
- **Impact:** Chromium's garbage collector only tracks JS wrapper object sizes and is extremely slow to reclaim the backing GPU memory of dereferenced `ImageBitmap` objects. This leads to massive VRAM/graphics memory leaks during heavy editing sessions.
- **Remedy:** Implement a reference-counting mechanism or check active layer bitmap references before discarding snapshots, explicitly calling `imageBitmap.close()` when a bitmap is no longer referenced by any step in the undo/redo stacks or the active document.

---

## 2. WebGL Color Space & Precision Constraints

### 🎨 5. Lack of Wide-Gamut (Display P3) Color Space Support
- **Location:** `apps/desktop/src/renderer/webgl2.ts` (`WEBGL2_CONTEXT_OPTIONS`, line 82)
- **Issue:** WebGL2 context options do not define the canvas color space parameter. This locks WebGL color rendering exclusively to the sRGB color gamut.
- **Impact:** High-gamut images (e.g. Display P3 and Adobe RGB profiles imported from modern camera raw files) will have their wide-gamut colors clipped, resulting in dull, desaturated tone mapping on Display P3 monitors.
- **Remedy:** Detect system/display profile capabilities and initialize the canvas WebGL context with `colorSpace: "display-p3"`.

### 🎛️ 6. Banding Artifacts due to Hardcoded 8-bit Precision
- **Location:** `apps/desktop/src/renderer/webgl2.ts` (line 261)
- **Issue:** Layer textures are uploaded and processed using 8-bit unsigned bytes (`gl.UNSIGNED_BYTE`).
- **Impact:** Consecutive, non-destructive tone adjustments (like curves, brightness, exposure, or high contrast stretching) on 8-bit precision channels introduce severe color banding and quantization noise, rendering it unsuitable for professional high-fidelity photo editing.
- **Remedy:** Utilize high-precision 16-bit or 32-bit floating point textures (`gl.RGBA16F` or `gl.RGBA32F`) in the rendering pipeline to preserve image data.

---

## 3. UI/UX Design System Compliance

### 🎨 7. Corner Radius Deviations (Border-Radius)
- **Location:** `apps/desktop/src/components/editor/MoveOptionBar.tsx` and custom toolbar containers.
- **Issue:** Hardcoded tailwind classes such as `rounded-[3px]` and `rounded-[4px]` are used across tool buttons, badges, and dropdown menus.
- **Risk:** These values deviate from the established project design token system defined in `GEMINI.md`:
  - **Outer panels/Containers:** `8px` (`--radius-lg`)
  - **Buttons and Tabs:** `6px` (`--radius-md`)
  - **Inputs and Small Elements:** `4px` (`--radius-sm`)
- **Impact:** Inconsistent corner rounding weakens the "Soft & Snappy" design precision, resulting in mixed styling characteristics.
- **Remedy:** Replace hardcoded absolute radii (like `rounded-[3px]` or `rounded-[4px]`) with standardized class mappings (`rounded-md`, `rounded-sm`) or CSS custom properties.
