# Photrez — Deep Project Review

> **Review Date:** 2026-07-11  
> **Scope:** Full codebase deep-dive — architecture, code-level analysis, anti-patterns, potential bugs, performance, security, testing quality  
> **Codebase Stats:** 177 `.ts` + 119 `.tsx` = **296 source files**, **142 test files**, ~30K+ lines of frontend code

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Deep-Dive](#2-architecture-deep-dive)
3. [Document Engine Analysis](#3-document-engine-analysis)
4. [WebGL2 Renderer Analysis](#4-webgl2-renderer-analysis)
5. [State Management & The God Context Problem](#5-state-management--the-god-context-problem)
6. [Canvas Viewport & Pointer System](#6-canvas-viewport--pointer-system)
7. [Brush/Eraser Paint System](#7-brusheraser-paint-system)
8. [Rust Backend Analysis](#8-rust-backend-analysis)
9. [Snapshot & History System](#9-snapshot--history-system)
10. [Testing Infrastructure Deep-Dive](#10-testing-infrastructure-deep-dive)
11. [Security Audit](#11-security-audit)
12. [Performance Analysis](#12-performance-analysis)
13. [Code Smell Catalogue](#13-code-smell-catalogue)
14. [Potential Bug Inventory](#14-potential-bug-inventory)
15. [File Size Violations](#15-file-size-violations)
16. [Dependency Analysis](#16-dependency-analysis)
17. [CI/CD Review](#17-cicd-review)
18. [Documentation Ecosystem](#18-documentation-ecosystem)
19. [Scoring Matrix](#19-scoring-matrix)
20. [Prioritized Recommendations](#20-prioritized-recommendations)

---

## 1. Executive Summary

Photrez is an exceptionally mature pre-release desktop image editor. After examining **every major module at the code level**, the engineering quality is consistently high with well-reasoned architectural decisions documented through inline comments that explain *why*, not just *what*.

### Verdict: ⭐⭐⭐⭐ 4.3/5 — Production-Quality Engineering for Pre-Release

**Top 3 Strengths:**
1. **Disciplined performance optimization** — every hot-path has been profiled and optimized (dirty-rect compositing, display-res preview, cached commit buffers, RAF throttling)
2. **Defensive programming** — extensive inline comments documenting regression causes with dates (e.g., "regression 2026-06-18", "regression 2026-07-05"), preventing future developers from reintroducing bugs
3. **Comprehensive test infrastructure** — 142 test files across 4 tiers with explicit wiring tests that prove event listeners are mounted at the correct lifecycle point

**Top 3 Concerns:**
1. **EditorContext God Object** — 100+ signals through a single SolidJS context, violating SRP
2. **3 files exceed 1,000 lines** — `CanvasViewport.tsx` (1,247 lines), `useCanvasPointerTools.ts` (1,190 lines), `CropOptionBar.tsx` (~1,000 lines)
3. **Snapshot-based history** stores full DocumentModel copies — memory pressure grows linearly with history depth × layer count

---

## 2. Architecture Deep-Dive

### 2.1 Module Boundary Map

```
┌─────────────────────────────────────────────────────────────────────┐
│ Tauri Shell (Rust, ~700 LOC)                                        │
│  main.rs → commands.rs → window_state.rs → menu.rs → response.rs   │
│  Role: File I/O, window persistence, native menu, print            │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ IPC (invoke/base64)
┌─────────────────────────▼───────────────────────────────────────────┐
│ Frontend (SolidJS + TypeScript)                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ EditorShell      │  │ DocumentEngine   │  │ WebGL2Backend    │  │
│  │ (UI orchestrator)│  │ (state model)    │  │ (GPU renderer)   │  │
│  │ 230 lines        │  │ 834 lines        │  │ 792 lines        │  │
│  └──────┬───────────┘  └──────┬───────────┘  └──────┬───────────┘  │
│         │                     │                      │              │
│  ┌──────▼───────────┐  ┌──────▼───────────┐  ┌──────▼───────────┐  │
│  │ EditorContext     │  │ WorkspaceMgr     │  │ RenderScheduler  │  │
│  │ (God Context)     │  │ (multi-doc)      │  │ (RAF throttle)   │  │
│  │ 523 lines         │  │ 228 lines        │  │ ~100 lines       │  │
│  └──────┬───────────┘  └──────────────────┘  └──────────────────┘  │
│         │                                                           │
│  ┌──────▼───────────────────────────────────────────────────────┐   │
│  │ Canvas System                                                │   │
│  │  CanvasViewport.tsx (1247L) ← useCanvasPointerTools (1190L) │   │
│  │  useCanvasKeyboard (900L) ← usePanNavigation (200L)          │   │
│  │  useBrushOverlay (701L) ← brushTipMask (609L)                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Integrity — ✅ EXCELLENT

The hot-path/cold-path separation is strictly enforced:

**Hot Path (no IPC, synchronous TS):**
- Pointer events → `useCanvasPointerTools` → `DocumentEngine` mutation → `WorkspaceManager.notifyVisualChange()` → `RenderScheduler.requestRender()` → `WebGL2Backend.render()`
- This path avoids Tauri IPC entirely, achieving sub-frame latency

**Cold Path (Tauri IPC, async):**
- File open: `invoke("read_file_bytes")` → base64 decode → `createImageBitmap()` → `engine.addLayer()` → `renderer.uploadImage()`
- File save: `engine.composite()` → `canvas.toBlob()` → base64 encode → `invoke("write_file_bytes")`

### 2.3 Singleton Lifecycle — ✅ CORRECT

In `EditorShell.tsx` (line 94-114), singletons are created once:

```typescript
const workspace = new WorkspaceManager();
const camera = new ViewportCamera();
const renderer = new WebGL2Backend();
const scheduler = new RenderScheduler(() => { ... });
```

These are passed through `EditorProvider` as props, not recreated on re-render. The `onCleanup(() => scheduler.dispose())` correctly cleans up. **No singleton leak risk.**

### 2.4 Error Boundary — ✅ WELL-PLACED

`EditorShell.tsx` wraps `EditorLayout` in a `<ErrorBoundary>` (line 155-174) that shows a user-friendly error panel with expandable details, keeping the shell alive even if the canvas crashes.

---

## 3. Document Engine Analysis

**File:** `src/engine/document.ts` (834 lines)

### 3.1 Class Design — ⭐⭐⭐⭐ (4/5)

`DocumentEngine` is a clean, imperative state machine with:
- **19 accessor methods** (lines 47-89)
- **12 layer operations** (add, duplicate, mergeDown, flatten, delete, reorder, etc.)
- **6 layer property setters** (opacity, visibility, locked, lockTransparency, lockPosition, lockRotation)
- **4 canvas operations** (cropCanvas, applyCrop, resizeCanvas)
- **Snapshot/restore** for undo/redo support

### 3.2 Strengths

**Resource budget enforcement (lines 93-105):**
Every layer add/duplicate checks both `MAX_LAYERS` (200) and pixel memory budget (`MAX_PIXEL_BUDGET` = 1GB). This prevents OOM from runaway layer creation.

**Careful bitmap lifecycle (lines 248-257):**
The engine deliberately does NOT close `ImageBitmap` references on layer delete, with an excellent inline comment explaining why:
> "Snapshots in the undo/redo stack may hold a reference to them; closing them here would make those snapshots point to closed/detached bitmaps, causing 'image source is detached' errors on restore."

This is a subtle correctness concern that many image editors get wrong.

**Regression-aware restore (lines 800-812):**
The `restore()` method marks ALL restored layers dirty, with a comment citing the exact regression date:
> "regression 2026-07-05: 'layer turns black on undo' because the renderer's WebGL texture was re-uploaded only by the direct caller (restoreHistorySnapshot), but code paths such as cancelLayerTransformSession called engine.restore() without the re-upload step"

### 3.3 Concerns

**`setLayerOpacity` mutates in-place (line 300):**
```typescript
layer.opacity = Math.max(0.0, Math.min(1.0, opacity));
```
This directly mutates the layer object in the `model.layers` array. While intentional for performance (avoiding array copies), it means any existing snapshot that shares this layer object will also see the change. The snapshots in `snapshot.ts` create shallow copies of the layer object with `{ ...l }`, so this is **safe** — but it's a fragile invariant. If someone later optimizes snapshots to share layer objects, this will silently corrupt history.

**Silent failures (lines 168-169, 271-274):**
```typescript
// mergeDown silently returns if index is invalid
if (index === -1 || index >= this.model.layers.length - 1) return;
// reorderLayer silently returns on invalid indices
if (fromIndex < 0 || ...) return;
```
These should at minimum log a warning in development mode. Silent failures mask bugs.

**Duplicate name generation has O(n²) worst case (lines 362-373):**
```typescript
for (const l of this.model.layers) {
  if (l.name.startsWith(prefix)) { ... }
}
```
For 200 layers all named "Layer N", this scans 200 layers per duplicate. Not a practical issue at MVP scale, but worth noting.

---

## 4. WebGL2 Renderer Analysis

**File:** `src/renderer/webgl2.ts` (792 lines)

### 4.1 GPU Pipeline — ⭐⭐⭐⭐⭐ (5/5)

**Premultiplied alpha (line 263):**
```typescript
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
```
Combined with `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)` (line 209), this eliminates dark fringe artifacts on transparency edges — a common bug in WebGL image editors.

**Ping-pong FBO compositing (lines 133-136):**
Multi-layer blending uses two framebuffers that alternate as source/destination. This is the standard approach for GPU-accelerated image compositing.

**Context loss handling (lines 216-245):**
Complete lifecycle for WebGL context loss/restore:
- `handleContextLost` prevents default and sets `contextLost = true`
- `handleContextRestored` reinitializes all GPU resources
- Every public method checks `this.contextLost || gl.isContextLost()`
- Custom event `photrez:webglcontextrestored` dispatched for UI sync

**Shader blend mode math (shaders.ts, lines 65-117):**
12 blend modes with correct per-component math:
- Overlay uses the `< 0.5` conditional correctly
- Color Dodge/Burn handle division-by-zero edge cases (`s[i] == 1.0 ? 1.0 : ...`)
- Soft Light uses the W3C composite spec formula including the `b <= 0.25` branch

### 4.2 Regression-Documented Fix

**`getInterLayerCopyQuad` (lines 50-69)** has an excellent regression note:
> "Regression note (2026-06-18): the copy must cover the ENTIRE FBO (logical viewport), not just the doc-coord region. The sampler reads the whole source FBO via texCoord 0..1; if the destination quad only writes the doc-region, the source FBO (layer + transparent margins) is squeezed into that smaller region — previous layers visually shrank by the doc/viewport ratio on every layer above them."

This level of documentation is rare and extremely valuable.

### 4.3 Concern: Unused Blend Modes

Blend modes 4-11 (Darken, Lighten, Color Dodge, Color Burn, Hard Light, Soft Light, Difference, Exclusion) are implemented in the shader but only Normal/Multiply/Screen/Overlay are exposed in the UI `BlendMode` type:
```typescript
export type BlendMode = "normal" | "multiply" | "screen" | "overlay";
```
This is intentional (documented parity gate), but the dead shader code adds maintenance burden and potential confusion.

---

## 5. State Management & The God Context Problem

### 5.1 EditorContext Interface — ⭐⭐ (2/5) — CRITICAL

**File:** `src/components/editor/shell/EditorContext.tsx` (523 lines)

The `EditorContextValue` interface (lines 29-228) exposes **120+ members** through a single SolidJS context. Signal count breakdown:

| Domain | Signal Pairs | Lines |
|--------|-------------|-------|
| Core singletons | 4 (workspace, renderer, scheduler, camera) | 30-33 |
| Tool state | 2 (activeTool, fgColor/bgColor) | 40-47 |
| Viewport | 6 (zoom, pan, viewportWidth/Height, docWidth/Height) | 49-87 |
| Move tool | 3 (autoSelect, snap, transformControls) | 90-95 |
| Crop tool | **24** (cropRect, cropMode, cropGuideMode, cropAspect, cropRotation, modernCropFrame, modernCropImageTransform, cropFillEnabled/Source/Color, cropSizeTarget, etc.) | 97-141 |
| Selection | 10 (selection, editMode, constraintMode, ratioW/H, sizeW/H) | 64-77 |
| Brush/Eraser | 14 (size, hardness, opacity, flow, smoothing × 2 tools + presetId × 2) | 152-175 |
| UI state | 8 (showResize/Export/PrintDialog, loadingMessage, renaming, chrome) | 177-196 |
| History | 5 (historyItems, activeHistoryIndex, navigateHistory, rightDockPanel) | 200-205 |
| Transform undo | 7 (commitTransformState, canUndo/Redo, undo/redo, undoWithCurrent, redoWithCurrent, clearStacks) | 208-215 |
| Dock layout | 6 (rightDockOpen, rightDockLayout, inspectorTab, adjustSubTab) | 218-227 |

### 5.2 Why This Matters

Every consumer of `useEditor()` implicitly depends on ALL 120+ members, even if it only uses 2-3:

```typescript
// CanvasViewport.tsx line 48-104: destructures ~40 members
const {
  workspace, renderer, camera, activeTool, activeDocumentId,
  zoom, pan, setViewportState, viewportWidth, viewportHeight,
  docWidth, docHeight, bgColor, setHoverHandle, syncViewport,
  moveSnapEnabled, layers, activeLayerId, cropRect, setCropRect,
  cropInteractionMode, setCropInteractionMode, cropMode, cropGuideMode,
  cropAspect, cropRotation, setCropRotation, modernCropFrame,
  setModernCropFrame, modernCropImageTransform, setModernCropImageTransform,
  resetModernCrop, commitModernCropState, hiddenCropPreview,
  setHiddenCropPreview, cropDeletePixels, cropFillEnabled,
  cropFillSource, cropFillCustomColor, cropSizeTarget, setCropAspect,
  setCropMode, setCropSizeTarget, clearCropStacks, setActiveTool,
  setSelectedLayerId, moveAutoSelect, selectedLayerId,
  layerTransformSession, showTransformControls, selection,
  selectionEditMode, setSelectionEditMode, scheduler,
  useGPUCameraForModernCrop,
} = useEditor();
```

This makes:
- **Testing** painful — must mock the entire context even for simple component tests
- **Refactoring** risky — renaming any signal requires updating the interface, provider, and all consumers
- **Performance** potentially suboptimal — SolidJS re-renders when any consumed signal changes; a component using 40 signals reacts to all 40

### 5.3 The `createEditorState` Companion

**File:** `src/components/editor/tools/editorState.ts` (179 lines)

This function creates all the signals that `EditorProvider` wraps. It's essentially a flat signal factory with no grouping:

```typescript
export function createEditorState() {
  const [activeTool, setActiveTool] = createSignal<ToolId>("move");
  const [fgColor, setFgColor] = createSignal("#E15A17");
  // ... 50+ more signals ...
  return { activeTool, setActiveTool, fgColor, setFgColor, ... };
}
```

### 5.4 Recommended Decomposition

```
EditorContext → ToolContext     (activeTool, fgColor, bgColor)
              → ViewportContext (zoom, pan, docWidth/Height, viewportWidth/Height)
              → CropContext     (cropRect, cropMode, modernCropFrame, etc.)
              → SelectionContext (selection, editMode, constraint, ratio)
              → BrushContext    (brush/eraser size/hardness/opacity/flow/smoothing/preset)
              → UIContext       (showDialog flags, loadingMessage, chrome visibility)
              → HistoryContext  (historyItems, navigateHistory)
```

---

## 6. Canvas Viewport & Pointer System

### 6.1 CanvasViewport.tsx — ⭐⭐⭐ (3/5) — NEEDS DECOMPOSITION

**File:** 1,247 lines — **violates the 1,000-line project guard**

This file is the central orchestrator for:
- Canvas rendering (WebGL)
- Pointer tool routing
- Brush overlay positioning
- Crop overlay (classic + modern) rendering
- Selection overlay rendering
- Transform HUD rendering
- Smart guides rendering
- Hover highlight rendering
- Pasteboard gesture handling (crop double-click, replacement drag)
- Context menus (brush right-click, canvas right-click)

### 6.2 useCanvasPointerTools.ts — ⭐⭐⭐ (3/5) — NEEDS DECOMPOSITION

**File:** 1,190 lines — **violates the 1,000-line project guard**

This is the master pointer event dispatcher handling ALL tools:

```
onCanvasPointerDown → routes to:
  - Brush/Eraser paint stroke start
  - Move tool drag start
  - Selection draw/move/rotate start
  - Crop handle drag start
  - Eyedropper sample
  - Modern crop drag-create
  - Brush size adjustment (Alt+RightClick)

onCanvasPointerMove → routes to:
  - Paint stroke continuation
  - Move drag continuation with snapping
  - Selection resize/move
  - Crop resize
  - Edge auto-scroll

onCanvasPointerUp → routes to:
  - Stroke commit
  - Move commit
  - Selection commit
  - Crop commit
```

**Edge auto-scroll implementation (lines 138-213)** is well-engineered:
- 40px edge zone
- 200px/sec max scroll speed
- Cached container rect (invalidated on zoom/pan change via `createEffect`)
- RAF-based animation with proper dt calculation
- `onCleanup` to cancel RAF

**Concern: Mutable `interactiveState` object (lines 265-280):**
```typescript
const interactiveState: ToolContext = {
  fgColor: "",
  bgColor: "",
  brushSize: 20,
  // ... mutable shared state
};
```
This object is mutated in `prepareToolContext()` before each pointer event. While functional, this pattern is fragile — it relies on the caller always calling `prepareToolContext()` before accessing any field. A bug where one code path skips `prepareToolContext()` would silently use stale values.

### 6.3 Coordinate System — ✅ CORRECT

**`getDocCoords` (lines 446-470)** correctly uses SolidJS signals (`pan()`, `zoom()`) instead of `engine.getViewport()`, with an excellent regression comment:
> "Bug 2026-07-05: tools broke after panning because engine.getViewport() returned stale pan/zoom values while the camera + signals were already updated via direct setZoom/setPan calls."

---

## 7. Brush/Eraser Paint System

### 7.1 useBrushOverlay.ts — ⭐⭐⭐⭐ (4/5)

**File:** 701 lines

**Paint session lifecycle (lines 39-56):**
```typescript
interface PaintStrokeSession {
  layerId: string;
  isEraser: boolean;
  settingsKey: string;
  color: string;
  tipSize: number;
  tipHardness: number;
  dabPositions: Dab[];
  dabsRendered: number;
  lastPoint: { x: number; y: number } | null;
  spacingCarry: number;
  dirtyRect: DirtyRect;
}
```
Clean session object pattern — all stroke state is contained, no global mutation.

**Cached commit buffer (lines 72-76):**
```typescript
let cachedCommitCanvas: OffscreenCanvas | null = null;
let cachedCommitCtx: OffscreenCanvasRenderingContext2D | null = null;
```
Eliminates per-stroke 107MB `OffscreenCanvas` allocation. This is a significant memory optimization documented inline.

**Hold timer for stationary dabs (lines 21-29, 78-120):**
When the user holds the brush still, a RAF timer fires a dab every 150ms so the brush "reaches" the cursor. This matches established editor behavior and is a nice attention to detail.

### 7.2 brushTipMask.ts — ⭐⭐⭐⭐⭐ (5/5)

**File:** 609 lines

**Capped tip data size (line 33):**
```typescript
export const MAX_BRUSH_TIP_DATA_SIZE = 256;
```
Tips larger than 256×256 are downsampled and browser-upscaled via `drawImage` destination dimensions. This dropped rasterization from 485ms to ~2ms — a 240× improvement documented inline.

**Multiple falloff curves (lines 50-56):**
Supports cosine, smoothstep, quadratic, and soft (`pow(v, 0.7)`) curves. The "soft" curve with reference-calibrated hardness interpolation matches established brush behavior.

---

## 8. Rust Backend Analysis

### 8.1 Tauri Shell — ⭐⭐⭐⭐⭐ (5/5)

**main.rs (82 lines):** Minimal, well-documented. Key highlights:
- CLI argument support for file opening (line 15-16)
- Window state persistence with off-screen snap guard (line 42)
- `api.prevent_close()` for frontend save-confirm dialogs (line 61)
- First-launch detection to skip window restore (lines 36-38)

### 8.2 commands.rs — ⭐⭐⭐⭐ (4/5)

**Structured error responses (lines 1-13):**
```rust
const MAX_FILE_IO_BYTES: u64 = 256 * 1024 * 1024;
const READ_FILE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"];
const WRITE_FILE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];
```
Good: allowlist approach rather than blocklist.

**Concern:** `read_file_bytes` (line 46) accepts any path string. While extensions are validated, there's no path traversal guard (e.g., `../../../etc/passwd.png`). On Windows this is mitigated by Tauri's allowlist, but on other platforms it could be exploitable.

### 8.3 window_state.rs — ⭐⭐⭐⭐⭐ (5/5)

**File:** 314 lines

The window state persistence is remarkably thorough:
- **Dimension clamping** (MIN_DIMENSION=320, MAX_DIMENSION=16384)
- **Position clamping** (MIN_POSITION=-32768, MAX_POSITION=32768)
- **Off-screen detection** with 100px overlap threshold
- **Multi-monitor awareness** via `app.available_monitors()`
- **Center-on-primary fallback** when window is completely off-screen
- **First-launch detection** to skip restore (avoids layout flash)

The `snap_to_screen` function (lines 60-88) is extracted and testable independently of Tauri — accepts a simple `&[(i32, i32, u32, u32)]` slice for monitor info.

### 8.4 Core Crate — ⭐⭐⭐ (3/5) — DORMANT

**File:** `crates/core/src/` (9 files, 89 tests)

The Rust core crate mirrors the TypeScript `DocumentEngine` API but has **zero runtime coupling**. It exists as:
1. A reference implementation for future WASM migration
2. A test bed for domain logic

**Risk:** Without runtime coupling, the Rust and TypeScript implementations can drift silently. Consider either:
- Starting the WASM migration for one hot-path module (e.g., brush tip rasterization)
- Or freezing the Rust crate and documenting it as "reference only"

---

## 9. Snapshot & History System

### 9.1 snapshot.ts — ⭐⭐⭐⭐ (4/5) but with Memory Risk

**File:** 68 lines

The snapshot system creates shallow copies of layer metadata with shared `ImageBitmap` references:

```typescript
layers: model.layers.map(l => ({
  ...layer_metadata_copy,
  imageBitmap: l.imageBitmap // Reuse reference to immutable ImageBitmap
}))
```

**Strength:** `ImageBitmap` is reference-counted by the browser — sharing references is zero-cost.

**Concern:** The metadata copy (`transform`, `selection`, `basicAdjustment`) is duplicated per snapshot. With `MAX_HISTORY_DEPTH = 50` and `MAX_LAYERS = 200`, worst-case overhead is:

```
50 snapshots × 200 layers × ~400 bytes metadata = ~4MB
```

This is acceptable, but the `ImageBitmap` objects themselves (GPU-resident) are kept alive by snapshot references, preventing GC even after layers are deleted. For a document with 10 layers × 50 history steps, up to 500 `ImageBitmap` objects could be alive simultaneously.

### 9.2 CommandHistory — ⭐⭐⭐⭐ (4/5)

**File:** `src/engine/history.ts` (138 lines)

Clean stack-based undo/redo with:
- Max depth enforcement via `shift()` (FIFO eviction)
- Redo stack cleared on new mutation
- Paint coordinate tracking per entry (for Shift+Click straight lines)
- Labeled operations for the History panel

**Concern:** No memory pressure monitoring. The history system doesn't know if it's holding 500 `ImageBitmap` objects that total 2GB of GPU memory. Consider adding a total-byte-estimate signal.

---

## 10. Testing Infrastructure Deep-Dive

### 10.1 Test Tier Architecture — ⭐⭐⭐⭐⭐ (5/5)

**vite.config.ts** (150 lines) defines a sophisticated dual-project setup:

| Project | Environment | Pool | Files | Purpose |
|---------|-------------|------|-------|---------|
| `unit-node` | Node | threads | 57 explicit files | Pure computation, no DOM |
| `component-jsdom` | jsdom | forks | Everything else | SolidJS rendering, DOM events |

The `nodeTestFiles` array (lines 8-58) is **explicitly curated** — no glob pattern. This prevents accidentally running DOM-dependent tests in Node, which would cause mysterious failures.

### 10.2 Test File Quality — ⭐⭐⭐⭐ (4/5)

**High-quality examples:**

- `crossDocDragDropWiring.test.tsx` (32,568 bytes) — 16 tests covering 3 Tauri drop zones + 4 in-app drag wiring checks. Uses real `fireEvent` simulations, not mocks.
- `SelectionTransformOverlay.test.ts` (36,620 bytes) — comprehensive drag handles with pointer chain simulations
- `brushTipMask.test.ts` (27,852 bytes) — pixel-level brush tip assertions with visual regression guards
- `CropOverlay.test.tsx` (84,520 bytes) — massive test file covering all crop interaction modes

**Concern:** `CropOverlay.test.tsx` at 84,520 bytes (~2,300+ lines) is extremely large. Consider splitting by crop mode (classic vs modern) or by interaction type (drag, resize, keyboard).

### 10.3 E2E Tests — ⭐⭐⭐⭐ (4/5)

**7 Playwright spec files:**
- `editor-smoke.spec.ts` (21,984 bytes) — comprehensive grand-tour test
- `cross-doc-drag-drop.spec.ts` — cross-document drag operations
- `dialog-accessibility.spec.ts` — dialog keyboard/ARIA testing
- `selection-undo-redo.spec.ts` — selection state persistence
- `checkerboard.spec.ts` and `checkerboard-selection-undo.spec.ts` — visual regression
- `native-e2e-smoke.spec.ts` — Tauri-specific smoke test

### 10.4 Testing Gaps

| Area | Coverage | Risk |
|------|----------|------|
| WebGL shader math | ❌ Not tested (inherently untestable in jsdom) | Low — shader math is standard W3C composite spec |
| Large document performance | ❌ No perf regression tests in CI | Medium — perf could degrade silently |
| Memory leak detection | ❌ No `ImageBitmap.close()` leak tests | Medium — leaks accumulate over session lifetime |
| Cross-platform rendering | ❌ No macOS/Linux tests | High for cross-platform release |
| Accessibility (beyond dialogs) | ❌ Limited to dialog a11y | Medium — canvas-based tools need keyboard alternatives |

---

## 11. Security Audit

### 11.1 Input Validation — ⭐⭐⭐⭐ (4/5)

| Check | Status | Location |
|-------|--------|----------|
| File extension allowlist | ✅ | `commands.rs` L12-13 |
| File size cap (256MB) | ✅ | `commands.rs` L11 |
| Layer count limit (200) | ✅ | `types.ts` L124 |
| Pixel budget (1GB) | ✅ | `types.ts` L127 |
| Canvas dimension limit (16384px) | ✅ | `types.ts` L131 |
| Device-adaptive max dim | ✅ | `types.ts` L138-146 |
| Window state dimension clamping | ✅ | `window_state.rs` L45-55 |
| Base64 decode validation | ✅ | `commands.rs` L80-83 |
| Path traversal protection | ⚠️ Partial | Tauri sandbox + extension check, but no explicit traversal guard |

### 11.2 Dependency Surface — ⭐⭐⭐⭐⭐ (5/5)

**Runtime dependencies (6 total):**
```json
"@tauri-apps/api": "^2.0.0",
"@tauri-apps/plugin-dialog": "^2.0.0",
"@tauri-apps/plugin-shell": "^2.0.0",
"clsx": "^2.1.1",
"lucide-solid": "^1.16.0",
"solid-js": "^1.8.15"
```

Extremely lean for a project of this complexity. No left-pad-style fragility.

### 11.3 Concern: `delete_file` Command

`delete_file` exists in `commands.rs` (registered in main.rs line 76). Combined with extension allowlists applying only to read/write, this command could potentially delete any file. Verify that it has its own path validation.

---

## 12. Performance Analysis

### 12.1 Documented Optimization Passes

| Optimization | Impact | Location |
|-------------|--------|----------|
| Display-res brush preview | Eliminated full-layer-size compositing during strokes | `useBrushOverlay.ts` |
| Dirty-rect compositing | Only recomposites changed pixel region per pointermove | `brushTipMask.ts` |
| Cached commit buffers | Eliminated 107MB OffscreenCanvas per stroke | `useBrushOverlay.ts` L72-76 |
| 256×256 brush tip cap | Rasterization: 485ms → ~2ms | `brushTipMask.ts` L33 |
| RAF-throttled UI | Slider signal writes at 60fps max | Various |
| Cached container rect | Avoids `getBoundingClientRect()` per pointermove | `useCanvasPointerTools.ts` L149-164 |
| Partial texture upload | `texSubImage2D` for eraser dirty regions | `webgl2.ts` |
| Premultiplied alpha | Correct transparency math, no dark fringe | `webgl2.ts` L263 |
| Reused OffscreenCanvas for eyedropper | 1×1 canvas instead of per-layer-per-sample allocation | `useBrushOverlay.ts` |

### 12.2 Performance Concern: Full-Model Snapshot per History Step

Each `history.commit()` creates a full `DocumentModel` copy via `createSnapshot()`. For a document with:
- 10 layers × 4000×3000px = 480MB of ImageBitmap data
- 50 history steps

The snapshot metadata is small (~4KB per step), but the `ImageBitmap` references keep all intermediate bitmaps alive in GPU memory. In the worst case (10 brush strokes that each create a new bitmap), 500 `ImageBitmap` objects could be alive simultaneously.

---

## 13. Code Smell Catalogue

### 13.1 God Context (Critical)
- **Location:** `EditorContext.tsx`
- **Impact:** Testing difficulty, refactoring risk, implicit coupling
- **Fix:** Domain-specific context decomposition

### 13.2 Let-Mutable Module Globals in useBrushOverlay.ts
```typescript
let lastDabTime = 0;            // line 28
let holdRaf: number | null = null;  // line 29
let holdActive = false;         // line 30
let holdTipExtent = 1;          // line 31
```
These are module-level mutable variables shared across all instances of `useBrushOverlay`. If multiple canvases were ever mounted (unlikely but possible), they'd share this state.

### 13.3 Typeof Checks for Signal Access
```typescript
// useCanvasPointerTools.ts line 307-311
interactiveState.selectionConstraintMode = typeof selectionConstraintMode === "function"
  ? selectionConstraintMode() : "normal";
interactiveState.selectionRatioW = typeof selectionRatioW === "function"
  ? selectionRatioW() : 1;
```
These `typeof` checks suggest the code is unsure whether values are signals or plain values. Since they always come from `useEditor()`, they're always signals. This defensive code is unnecessary and indicates an earlier refactoring left residue.

### 13.4 Inline CSS Values in JSX
The `RightDock.tsx` uses Tailwind extensively (correct), but some components mix inline style objects with Tailwind classes:
```typescript
// CanvasViewport.tsx line 247-256
return {
  position: "absolute" as const,
  width: `${rect.w * zoom()}px`,
  height: `${rect.h * zoom()}px`,
  "background-color": resolvedCropFillColor(),
  transform: `translate(...)`,
};
```
This is acceptable for dynamic values that can't be expressed in Tailwind, but the `as const` casts suggest TypeScript friction.

---

## 14. Potential Bug Inventory

### 14.1 Race Condition in Modern Crop GPU Camera Sync

**Location:** `CanvasViewport.tsx` lines 151-207

The `createEffect` that syncs modern crop state to the camera calls `scheduler.requestRender()` at the end. But the camera state is set *synchronously* before the render is requested. If another `createEffect` reads `camera.getViewProjectionMatrix()` before the render completes, it will see the updated camera but stale framebuffer.

**Severity:** Low — the render scheduler uses `requestAnimationFrame` which coalesces multiple requests.

### 14.2 Stale Brush Adjustment State

**Location:** `useCanvasPointerTools.ts` lines 484-492

```typescript
// Clear stale brush adjustment state
if (brushAdjustStart) {
  brushAdjustStart = null;
  setHudInfo(null);
}
```

This cleanup at the start of `onCanvasPointerDown` catches the case where `onCanvasPointerUp` didn't fire (right-click released outside window). But it runs for *every* pointer down, adding unnecessary work. A more targeted fix would use `pointerleave` or `focusout` events.

**Severity:** Very low — the check is cheap.

### 14.3 `compositeAlpha` Reference in Hold Timer

**Location:** `useBrushOverlay.ts` line 101

```typescript
session.dabPositions.push({ x: lp.x, y: lp.y, alpha: compositeAlpha });
```

`compositeAlpha` is referenced in the hold timer callback but is defined elsewhere in the scope. If this variable is not in scope when the hold timer fires (e.g., after a component unmount), this would crash. The `holdActive` flag should prevent this, but it's a fragile dependency.

**Severity:** Low — the `holdActive` flag guards execution.

---

## 15. File Size Violations

The project's own `AGENTS.md` enforces:
> "Jangan biarkan diff mendorong file non-generated melewati 1000 lines tanpa alasan kuat."

**Violations:**

| File | Lines | Status |
|------|-------|--------|
| `CanvasViewport.tsx` | 1,247 | 🔴 **VIOLATION** |
| `useCanvasPointerTools.ts` | 1,190 | 🔴 **VIOLATION** |
| `CropOptionBar.tsx` | ~1,000 (38.5KB) | 🟡 **AT LIMIT** |
| `useCanvasKeyboard.ts` | ~900 (34.6KB) | 🟢 OK |
| `document.ts` | 834 | 🟢 OK (but growing) |
| `webgl2.ts` | 792 | 🟢 OK |
| `useBrushOverlay.ts` | 701 | 🟢 OK |

**Test files violating 1000 lines (excluded from guard but worth noting):**

| File | Size | Lines (est.) |
|------|------|------|
| `CropOverlay.test.tsx` | 84,520 bytes | ~2,300 |
| `CropOptionBar.test.tsx` | 77,223 bytes | ~2,100 |
| `MoveOptionBar.test.tsx` | 42,171 bytes | ~1,150 |
| `useSelectionTransformDrag.test.ts` | 40,975 bytes | ~1,100 |
| `SelectionTransformOverlay.test.ts` | 36,620 bytes | ~1,000 |

---

## 16. Dependency Analysis

### 16.1 Runtime Dependencies — ⭐⭐⭐⭐⭐ (5/5)

| Dependency | Version | Purpose | Risk |
|-----------|---------|---------|------|
| `solid-js` | ^1.8.15 | UI framework | Low — stable, well-maintained |
| `@tauri-apps/api` | ^2.0.0 | Desktop bridge | Low — core dependency |
| `@tauri-apps/plugin-dialog` | ^2.0.0 | Native dialogs | Low |
| `@tauri-apps/plugin-shell` | ^2.0.0 | Shell operations | Low |
| `clsx` | ^2.1.1 | Class name utility | Very low — tiny utility |
| `lucide-solid` | ^1.16.0 | Icon library | Low |

**Total:** 6 runtime dependencies. This is an exceptionally lean tree.

### 16.2 Dev Dependencies — ⭐⭐⭐⭐ (4/5)

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `vitest` | ^4.1.7 | Test runner |
| `vite` | ^8.0.16 | Build system |
| `tailwindcss` | ^4.0.0 | Styling |
| `typescript` | ^5.2.2 | Type system |
| `jsdom` | ^29.1.1 | Test DOM |
| `@playwright/test` | ^1.60.0 | E2E testing |
| `canvas` | ^3.2.3 | Node canvas polyfill |
| `esbuild` | ^0.28.0 | Transform |

Healthy and modern versions across the board.

---

## 17. CI/CD Review

### 17.1 Pipeline — ⭐⭐⭐ (3/5)

**ci.yml** (102 lines) has 3 parallel jobs:

| Job | Steps | Time Limit |
|-----|-------|------------|
| `frontend` | checkout → bun install → Playwright install → type-check → unit tests → build → E2E | 20 min |
| `rust-core` | checkout → Rust toolchain → `cargo test -p photrez-core` | 10 min |
| `component-tests` | checkout → bun install → `bun run test:component` | 15 min |

**Good:**
- `concurrency` with `cancel-in-progress: true` prevents waste on rapid pushes
- `actions/cache` for both bun dependencies and Playwright browsers
- `frozen-lockfile` ensures reproducible installs

**Missing:**
| Check | Impact |
|-------|--------|
| ❌ No `cargo test --workspace` | Desktop crate tests skipped |
| ❌ No lint step (ESLint/Biome) | Code style not enforced |
| ❌ No macOS/Linux runners | Cross-platform regressions undetected |
| ❌ No bundle size check | JS bundle could grow silently |
| ❌ No `perf:budget` step | Performance regressions undetected |
| ❌ No dependency audit (blocking) | `continue-on-error: true` makes it advisory only |

---

## 18. Documentation Ecosystem

### 18.1 Documentation Map — ⭐⭐⭐⭐⭐ (5/5)

| Document | Lines/Size | Purpose | Quality |
|----------|-----------|---------|---------|
| `README.md` | 181 lines | Public-facing overview | ⭐⭐⭐⭐⭐ — Screenshots, Mermaid diagram, clear getting started |
| `AI_CONTEXT.md` | 9.1 KB | AI agent rules | ⭐⭐⭐⭐⭐ — Framework pitfalls, tech constraints |
| `ARCHITECTURE.md` | 22.8 KB | Runtime architecture | ⭐⭐⭐⭐⭐ — Data flow diagrams, module ownership |
| `FEATURES.md` | 132 KB | Feature tracker | ⭐⭐⭐⭐ — 400+ entries, very detailed |
| `DESIGN.md` | 14.6 KB | Visual design system | ⭐⭐⭐⭐ — Tokens, components, anti-patterns |
| `CONVENTIONS.md` | 10.6 KB | Code patterns | ⭐⭐⭐⭐ — Domain knowledge |
| `AI_HISTORY.md` | **896 KB** | Change log | ⭐⭐⭐ — Valuable but unbounded growth |
| `AI_CURRENT_TASK.md` | 40 KB | Active task status | ⭐⭐⭐⭐ |

### 18.2 Concern: AI_HISTORY.md at 896KB

At ~13,100 lines, this file is by far the largest in the repository. It provides excellent root-cause/fix-rationale documentation, but:
- Loading it into AI context consumes significant token budget
- File operations (search, append) become slower
- Git diffs become noisy

**Recommendation:** Implement monthly rotation to `docs/archive/ai-history/YYYY-MM.md`, keeping only the last 30-60 days active.

---

## 19. Scoring Matrix

| Category | Score | Key Factor |
|----------|-------|-----------|
| **Architecture** | ⭐⭐⭐⭐ 4/5 | Clean separation, hot/cold path discipline |
| **Document Engine** | ⭐⭐⭐⭐ 4/5 | Well-designed with resource budgets, minor mutation concern |
| **WebGL2 Renderer** | ⭐⭐⭐⭐⭐ 5/5 | Correct premultiplied alpha, 12 blend modes, context loss handling |
| **State Management** | ⭐⭐ 2/5 | God Context with 120+ members — critical decomposition needed |
| **Canvas/Pointer System** | ⭐⭐⭐ 3/5 | Functionally excellent, file size violations |
| **Brush/Eraser System** | ⭐⭐⭐⭐⭐ 5/5 | Reference-calibrated, deeply optimized |
| **Rust Backend** | ⭐⭐⭐⭐ 4/5 | Clean Tauri shell, dormant core crate |
| **History/Snapshot** | ⭐⭐⭐⭐ 4/5 | Clean design, memory scaling concern |
| **Testing** | ⭐⭐⭐⭐ 4/5 | 142 test files, 4 tiers, wiring tests, some gaps |
| **Security** | ⭐⭐⭐⭐ 4/5 | Good validation, path traversal concern |
| **Performance** | ⭐⭐⭐⭐⭐ 5/5 | Exceptional optimization discipline with profiling evidence |
| **CI/CD** | ⭐⭐⭐ 3/5 | Functional but missing lint, cross-platform, perf gates |
| **Documentation** | ⭐⭐⭐⭐⭐ 5/5 | Outstanding ecosystem, minor growth concern |
| **Code Quality** | ⭐⭐⭐⭐ 4/5 | Strict TS, regression comments, some large files |
| **DX (Developer Experience)** | ⭐⭐⭐⭐ 4/5 | Good tooling, missing formatter/linter |
| **Overall** | **⭐⭐⭐⭐ 4.3/5** | **Production-quality engineering for pre-release** |

---

## 20. Prioritized Recommendations

### P0 — Address Immediately (blocks scalability)

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 1 | **Split EditorContext into domain-specific contexts** (Tool, Viewport, Crop, Selection, Brush, UI, History) | Highest — unblocks testability, reduces cognitive load | High (2-3 days) |
| 2 | **Decompose `useCanvasPointerTools.ts`** (1,190 lines) into per-tool pointer handlers (`useBrushPointer`, `useMovePointer`, `useSelectionPointer`, `useCropPointer`) | High — 1,000-line guard violation | Medium (1-2 days) |
| 3 | **Extract `CanvasViewport.tsx`** (1,247 lines) — move crop overlay orchestration, pasteboard gesture handling, and context menu logic into separate hooks/components | High — 1,000-line guard violation | Medium (1-2 days) |

### P1 — Address in Next Sprint

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 4 | **Archive AI_HISTORY.md** — implement monthly rotation | Medium — prevents context overflow | Low (1 hour) |
| 5 | **Add Biome** for lint + format in one tool, add to CI and pre-commit hooks | Medium — code style enforcement | Low (2 hours) |
| 6 | **Add `cargo test --workspace`** and `bun run lint` to CI | Medium — tests and lints currently skipped | Low (30 min) |
| 7 | **Remove `typeof` checks for signal access** in `useCanvasPointerTools.ts` (lines 307-311) — these are always signals from `useEditor()` | Low — code cleanup | Very low (15 min) |

### P2 — Address Before v1.0

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 8 | **Add cross-platform CI** (macOS + Linux runners) | High for multi-platform release | Medium (2-3 hours) |
| 9 | **Add explicit path traversal guard** in `commands.rs` for `delete_file` and `write_file_bytes` | Security hardening | Low (1 hour) |
| 10 | **Split large test files** (`CropOverlay.test.tsx` at 84KB, `CropOptionBar.test.tsx` at 77KB) by crop mode or interaction type | Maintenance — merge conflicts, readability | Medium (1 day) |
| 11 | **Decide Rust core crate fate** — start WASM migration or freeze and document as reference-only | Removes maintenance burden | Varies |
| 12 | **Add bundle size check to CI** (e.g., `size-limit` or `bundlemon`) | Prevents silent bundle growth | Low (1 hour) |

### P3 — Future Consideration

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 13 | **Delta-based history** — replace full-model snapshots with command pattern to reduce `ImageBitmap` retention | Memory optimization for large documents | High (1-2 weeks) |
| 14 | **History memory budget** — add total byte estimate signal, auto-evict oldest entries when approaching limit | Prevents OOM on long editing sessions | Medium (1-2 days) |
| 15 | **Accessibility audit** — canvas-based tools need keyboard alternatives beyond what's currently implemented | Compliance, usability | High (1 week) |
| 16 | **Visual regression testing** — screenshot comparison for rendered output (blend modes, transparency) | Rendering correctness | Medium (2-3 days) |
| 17 | **i18n string extraction** — move hardcoded UI strings to a message catalog | Localization readiness | Medium (2-3 days) |

---

> **Summary:** Photrez is a remarkably well-engineered project that demonstrates production-level discipline in performance optimization, defensive programming, and test coverage. The main technical debt is concentrated in the God Context pattern and file size violations — both are manageable with targeted refactoring. The architecture is sound, the rendering pipeline is correct, and the documentation ecosystem is outstanding.
