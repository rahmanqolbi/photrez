# Architecture Migration v2 — Full Execution Blueprint

> **Status**: PLAN ONLY — not yet executing
> **Created**: 2026-05-29
> **Decisions locked**:
> - Preserve project structure + UI shell
> - WebGL2-only for MVP first
> - English for code comments and type definitions
> - Frontend-owned Document Engine (no Rust for realtime state)

---

## Table of Contents

1. [Target File Structure](#1-target-file-structure)
2. [Phase 1: Engine Types + Document Engine](#2-phase-1-engine-types--document-engine)
3. [Phase 2: Command System (History/Undo)](#3-phase-2-command-system-historyundo)
4. [Phase 3: Workspace Manager](#4-phase-3-workspace-manager)
5. [Phase 4: WebGL2 Render Backend](#5-phase-4-webgl2-render-backend)
6. [Phase 5: Canvas Viewport Component](#6-phase-5-canvas-viewport-component)
7. [Phase 6: Tauri Native Core (Simplified)](#7-phase-6-tauri-native-core-simplified)
8. [Phase 7: App.tsx Rewrite + Component Extraction](#8-phase-7-apptsx-rewrite--component-extraction)
9. [Phase 8: File Pipeline (Open Image)](#9-phase-8-file-pipeline-open-image)
10. [Phase 9: Editing Features](#10-phase-9-editing-features)
11. [Phase 10: Export Pipeline](#11-phase-10-export-pipeline)
12. [Rust Cleanup Plan](#12-rust-cleanup-plan)
13. [Test Plan](#13-test-plan)
14. [Documentation Updates](#14-documentation-updates)
15. [Migration Checklist](#15-migration-checklist)

---

## 1. Target File Structure

```
apps/desktop/src/
├── App.tsx                          # Shell layout only (~200 lines)
├── index.tsx                        # Entry point (unchanged)
├── index.css                        # Design tokens (unchanged)
│
├── engine/                          # Document Engine (the "brain")
│   ├── types.ts                     # All core type definitions
│   ├── document.ts                  # DocumentEngine class
│   ├── history.ts                   # CommandHistory + Command implementations
│   ├── workspace.ts                 # WorkspaceManager (multi-document)
│   └── __tests__/
│       ├── document.test.ts
│       ├── history.test.ts
│       └── workspace.test.ts
│
├── renderer/                        # GPU Render Backend
│   ├── types.ts                     # RenderBackend interface, capabilities
│   ├── webgl2.ts                    # WebGL2Backend implementation
│   ├── shaders.ts                   # GLSL shader source strings
│   ├── scheduler.ts                 # Render-on-demand scheduler
│   └── __tests__/
│       └── scheduler.test.ts
│
├── viewport/                        # Canvas Viewport
│   ├── CanvasViewport.tsx           # SolidJS component wrapping <canvas>
│   ├── input-handler.ts            # Centralized input routing per tool
│   └── coords.ts                   # Coordinate conversion utilities
│
├── components/                      # UI Components (extracted from App.tsx)
│   ├── MenuBar.tsx                  # Top menu bar + file menu dropdown
│   ├── Toolbar.tsx                  # Secondary toolbar (brush, export, inspector toggle)
│   ├── ToolRail.tsx                 # Left tool panel (all tools)
│   ├── Inspector.tsx                # Right inspector panel (properties + layers + history)
│   ├── TabStrip.tsx                 # Document tab strip
│   ├── StatusBar.tsx                # Bottom status bar
│   ├── ExportModal.tsx              # Export dialog popup
│   ├── ConfirmDialog.tsx            # Generic confirmation dialog
│   └── ColorSwatches.tsx            # Foreground/background color swatches
│
├── tauri/                           # Tauri IPC wrappers (cold-path only)
│   └── native.ts                    # Type-safe wrappers for Tauri commands
│
├── __tests__/                       # Existing test dir (will be updated)
│   ├── keyboard-shortcuts.test.ts   # Keep, re-wire to Document Engine
│   ├── viewport.test.ts             # Keep, re-wire
│   ├── transform.test.ts            # Keep, re-wire
│   └── renderer.test.ts             # Keep, re-wire
│
└── ui-sanity.test.ts                # Keep (basic UI sanity)
```

```
apps/desktop/src-tauri/src/
└── main.rs                          # Simplified: ~80 lines (from ~809)

crates/
├── core/src/                        # Drastically reduced
│   ├── lib.rs                       # Just re-exports
│   └── export.rs                    # PNG/JPEG/WebP encoding (kept for advanced export)
└── render/                          # DELETE entirely
```

---

## 2. Phase 1: Engine Types + Document Engine

### File: `src/engine/types.ts`

```typescript
// ─── Identifiers ───
export type DocumentId = string;
export type LayerId = string;

// ─── Blend Modes ───
export type BlendMode = "normal" | "multiply" | "screen" | "overlay";

// ─── Transform ───
export interface Transform2D {
  x: number;       // position x
  y: number;       // position y
  scaleX: number;  // default 1
  scaleY: number;  // default 1
  rotation: number; // degrees, default 0
  flipH: boolean;
  flipV: boolean;
}

// ─── Layer ───
export interface LayerNode {
  id: LayerId;
  name: string;
  type: "raster" | "adjustment" | "group";
  visible: boolean;
  opacity: number;   // 0.0 - 1.0
  locked: boolean;
  blendMode: BlendMode;
  transform: Transform2D;
  width: number;
  height: number;
  // Pixel data reference — actual pixels stored as ImageBitmap or
  // texture handle, NOT as raw RGBA array in JS (too expensive)
  imageBitmap: ImageBitmap | null;
}

// ─── Selection ───
export interface SelectionState {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Viewport ───
export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;      // 1.0 = 100%
  rotation: number;  // degrees, default 0
}

// ─── Document Model ───
export interface DocumentModel {
  id: DocumentId;
  name: string;
  width: number;
  height: number;
  layers: LayerNode[];
  activeLayerId: LayerId | null;
  selection: SelectionState | null;
  viewport: ViewportState;
  dirty: boolean;
}

// ─── Render State (sent to renderer) ───
export interface TextureHandle {
  id: string;
  glTexture?: WebGLTexture;
}

export interface RenderLayer {
  id: LayerId;
  textureHandle: TextureHandle;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: Transform2D;
  width: number;
  height: number;
}

export interface RenderState {
  documentId: DocumentId;
  viewport: ViewportState;
  canvasSize: { width: number; height: number };
  layers: RenderLayer[];
  selection: SelectionState | null;
  checkerboard: boolean;
  backgroundColor: [number, number, number, number]; // RGBA
}

// ─── Dirty Region ───
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Constants ───
export const MAX_LAYERS = 100;
export const MAX_OPEN_DOCUMENTS = 16;
export const MAX_HISTORY_DEPTH = 50;
export const MAX_PIXEL_BUDGET = 256 * 1024 * 1024; // 256 MB
export const DEFAULT_DOCUMENT_WIDTH = 800;
export const DEFAULT_DOCUMENT_HEIGHT = 600;
```

### File: `src/engine/document.ts`

```typescript
import type {
  DocumentId, LayerId, DocumentModel, LayerNode,
  ViewportState, SelectionState, RenderState, BlendMode,
  Transform2D, TextureHandle
} from "./types";
import { MAX_LAYERS, MAX_PIXEL_BUDGET } from "./types";

export class DocumentEngine {
  private model: DocumentModel;
  private textureHandles: Map<LayerId, TextureHandle>;
  private dirtyLayerIds: Set<LayerId>;
  private onChangeCallback: (() => void) | null = null;

  constructor(id: DocumentId, name: string, width: number, height: number) {
    this.model = { /* initialize */ };
    this.textureHandles = new Map();
    this.dirtyLayerIds = new Set();
  }

  // ─── Accessors ───
  getModel(): Readonly<DocumentModel> { /* ... */ }
  getId(): DocumentId { /* ... */ }
  getName(): string { /* ... */ }
  getWidth(): number { /* ... */ }
  getHeight(): number { /* ... */ }
  getLayers(): readonly LayerNode[] { /* ... */ }
  getActiveLayerId(): LayerId | null { /* ... */ }
  getLayer(id: LayerId): LayerNode | undefined { /* ... */ }
  getSelection(): SelectionState | null { /* ... */ }
  getViewport(): ViewportState { /* ... */ }
  isDirty(): boolean { /* ... */ }

  // ─── Layer Operations ───
  addLayer(name: string, width?: number, height?: number): LayerNode { /* ... */ }
  deleteLayer(id: LayerId): void { /* ... */ }
  reorderLayer(fromIndex: number, toIndex: number): void { /* ... */ }
  setActiveLayer(id: LayerId | null): void { /* ... */ }

  // ─── Layer Properties ───
  setLayerOpacity(id: LayerId, opacity: number): void { /* ... */ }
  setLayerVisibility(id: LayerId, visible: boolean): void { /* ... */ }
  setLayerLocked(id: LayerId, locked: boolean): void { /* ... */ }
  setLayerName(id: LayerId, name: string): void { /* ... */ }
  setLayerBlendMode(id: LayerId, mode: BlendMode): void { /* ... */ }

  // ─── Layer Transform ───
  moveLayer(id: LayerId, x: number, y: number): void { /* ... */ }
  transformLayer(id: LayerId, transform: Partial<Transform2D>): void { /* ... */ }
  flipLayer(id: LayerId, axis: "h" | "v"): void { /* ... */ }

  // ─── Selection ───
  createSelection(x: number, y: number, w: number, h: number): void { /* ... */ }
  clearSelection(): void { /* ... */ }
  selectAll(): void { /* ... */ }

  // ─── Viewport ───
  setViewport(viewport: Partial<ViewportState>): void { /* ... */ }
  pan(dx: number, dy: number): void { /* ... */ }
  zoom(factor: number, anchorX?: number, anchorY?: number): void { /* ... */ }
  fitToScreen(containerWidth: number, containerHeight: number): void { /* ... */ }

  // ─── Canvas Operations ───
  cropCanvas(x: number, y: number, width: number, height: number): void { /* ... */ }
  resizeCanvas(width: number, height: number): void { /* ... */ }

  // ─── Image Data ───
  setLayerImageBitmap(id: LayerId, bitmap: ImageBitmap): void { /* ... */ }

  // ─── Texture Handles (renderer integration) ───
  setTextureHandle(layerId: LayerId, handle: TextureHandle): void { /* ... */ }
  getTextureHandle(layerId: LayerId): TextureHandle | undefined { /* ... */ }

  // ─── Render State Generation ───
  getRenderState(canvasWidth: number, canvasHeight: number): RenderState { /* ... */ }

  // ─── Dirty Tracking ───
  markLayerDirty(id: LayerId): void { /* ... */ }
  getDirtyLayerIds(): LayerId[] { /* ... */ }
  clearDirty(): void { /* ... */ }

  // ─── Change Notification ───
  onChange(callback: () => void): void { /* ... */ }
  private notifyChange(): void { /* ... */ }

  // ─── Serialization (for save/autosave) ───
  snapshot(): DocumentModel { /* deep clone */ }
  restore(model: DocumentModel): void { /* ... */ }

  // ─── Memory Budget ───
  calculateMemoryUsage(): number { /* ... */ }
  canAddLayer(width: number, height: number): boolean { /* ... */ }

  // ─── Pixel Sampling ───
  samplePixel(x: number, y: number): [number, number, number, number] { /* ... */ }
}
```

**Key implementation details**:
- `LayerNode.imageBitmap` stores decoded pixel data as `ImageBitmap` (browser-native, GPU-friendly)
- `textureHandles` maps layer IDs to GPU texture references
- `getRenderState()` produces a read-only snapshot for the renderer
- `notifyChange()` calls the registered callback so UI can react
- `snapshot()` / `restore()` used by history system for undo/redo
- All methods are synchronous (no IPC) — this is the key architectural change

---

## 3. Phase 2: Command System (History/Undo)

### File: `src/engine/history.ts`

```typescript
import type { DocumentModel, LayerId, Rect } from "./types";
import type { DocumentEngine } from "./document";
import { MAX_HISTORY_DEPTH } from "./types";

// ─── Command Interface ───
export interface Command {
  readonly id: string;
  readonly label: string;
  readonly affectedLayers?: LayerId[];
  readonly dirtyRegion?: Rect;

  execute(engine: DocumentEngine): void;
  undo(engine: DocumentEngine): void;
}

// ─── Command History ───
export class CommandHistory {
  private undoStack: SnapshotEntry[] = [];
  private redoStack: SnapshotEntry[] = [];
  private maxDepth: number;

  constructor(maxDepth: number = MAX_HISTORY_DEPTH) { /* ... */ }

  // Save snapshot before mutation
  commit(snapshot: DocumentModel): void {
    // Push to undoStack, clear redoStack
    // Evict oldest if over maxDepth
  }

  canUndo(): boolean { /* ... */ }
  canRedo(): boolean { /* ... */ }

  undo(currentSnapshot: DocumentModel): DocumentModel | null {
    // Push current to redoStack, pop from undoStack
  }

  redo(currentSnapshot: DocumentModel): DocumentModel | null {
    // Push current to undoStack, pop from redoStack
  }

  clear(): void { /* ... */ }
  getUndoCount(): number { /* ... */ }
  getRedoCount(): number { /* ... */ }
}

interface SnapshotEntry {
  snapshot: DocumentModel;
  timestamp: number;
}

// Note: Using snapshot-based history (same pattern as current Rust impl)
// rather than command-based, because:
// 1. Simpler to implement correctly
// 2. Works with any operation type without custom inverse logic
// 3. Memory overhead manageable with MAX_HISTORY_DEPTH = 50
// Command-based undo can be adopted later if memory pressure requires it.
```

---

## 4. Phase 3: Workspace Manager

### File: `src/engine/workspace.ts`

```typescript
import type { DocumentId, DocumentModel } from "./types";
import { MAX_OPEN_DOCUMENTS } from "./types";
import { DocumentEngine } from "./document";
import { CommandHistory } from "./history";

export interface DocumentSession {
  engine: DocumentEngine;
  history: CommandHistory;
  displayName: string;
  sourcePath: string | null;
  dirty: boolean;
}

export interface DocumentTabSummary {
  id: DocumentId;
  displayName: string;
  isDirty: boolean;
}

export class WorkspaceManager {
  private sessions: Map<DocumentId, DocumentSession> = new Map();
  private activeDocumentId: DocumentId | null = null;
  private onChangeCallback: (() => void) | null = null;

  // ─── Document Lifecycle ───
  addDocument(session: DocumentSession): void { /* ... */ }
  removeDocument(id: DocumentId): void { /* ... */ }
  switchDocument(id: DocumentId): void { /* ... */ }

  // ─── Accessors ───
  getActiveSession(): DocumentSession | null { /* ... */ }
  getActiveEngine(): DocumentEngine | null { /* ... */ }
  getActiveHistory(): CommandHistory | null { /* ... */ }
  getSession(id: DocumentId): DocumentSession | null { /* ... */ }
  getDocumentCount(): number { /* ... */ }
  isFull(): boolean { /* ... */ }
  getActiveDocumentId(): DocumentId | null { /* ... */ }

  // ─── Tab Info ───
  getTabSummaries(): DocumentTabSummary[] { /* ... */ }

  // ─── Change Notification ───
  onChange(callback: () => void): void { /* ... */ }
  private notifyChange(): void { /* ... */ }

  // ─── Factory Method ───
  static createDocumentFromImage(
    id: DocumentId,
    name: string,
    bitmap: ImageBitmap
  ): DocumentSession {
    // Create DocumentEngine with bitmap dimensions
    // Create initial raster layer with the bitmap
    // Return DocumentSession
  }

  static createBlankDocument(
    id: DocumentId,
    name: string,
    width: number,
    height: number
  ): DocumentSession {
    // Create DocumentEngine with blank canvas
    // Create initial empty raster layer
    // Return DocumentSession
  }
}
```

---

## 5. Phase 4: WebGL2 Render Backend

### File: `src/renderer/types.ts`

```typescript
import type { RenderState, ViewportState } from "../engine/types";

export interface RenderCapabilities {
  backend: "webgl2" | "webgpu" | "cpu";
  maxTextureSize: number;
  supportsFloatTextures: boolean;
  supportsLinearFilteringFloat: boolean;
}

export interface RenderBackend {
  readonly name: string;
  readonly capabilities: RenderCapabilities;

  initialize(canvas: HTMLCanvasElement): void;
  uploadImage(layerId: string, source: ImageBitmap): TextureRef;
  destroyTexture(layerId: string): void;
  render(state: RenderState): void;
  resize(width: number, height: number): void;
  dispose(): void;

  // Pixel readback for eyedropper
  readPixel(x: number, y: number): [number, number, number, number] | null;
}

export interface TextureRef {
  id: string;
  texture: WebGLTexture;
  width: number;
  height: number;
}
```

### File: `src/renderer/shaders.ts`

```typescript
// Vertex shader: fullscreen quad with viewport transform
export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform mat4 u_viewProj;
uniform vec4 u_layerRect;  // x, y, width, height in document coords

out vec2 v_texCoord;

void main() {
  // Generate fullscreen quad vertices (0,1,2,3,4,5 -> 2 triangles)
  vec2 positions[6] = vec2[6](
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0)
  );

  vec2 pos = positions[gl_VertexID];
  v_texCoord = pos;

  // Map to layer position in document space
  vec2 docPos = u_layerRect.xy + pos * u_layerRect.zw;

  // Apply viewport transform (pan/zoom)
  gl_Position = u_viewProj * vec4(docPos, 0.0, 1.0);
}`;

// Fragment shader: texture sampling with opacity
export const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_opacity;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  fragColor = vec4(color.rgb, color.a * u_opacity);
}`;

// Checkerboard fragment shader
export const CHECKERBOARD_FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_checkSize;
uniform vec4 u_color1;
uniform vec4 u_color2;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec2 pos = v_texCoord * u_resolution / u_checkSize;
  float checker = mod(floor(pos.x) + floor(pos.y), 2.0);
  fragColor = mix(u_color1, u_color2, checker);
}`;
```

### File: `src/renderer/webgl2.ts`

```typescript
import type { RenderBackend, RenderCapabilities, TextureRef } from "./types";
import type { RenderState } from "../engine/types";
import {
  VERTEX_SHADER_SOURCE,
  FRAGMENT_SHADER_SOURCE,
  CHECKERBOARD_FRAGMENT_SOURCE
} from "./shaders";

export class WebGL2Backend implements RenderBackend {
  readonly name = "webgl2";
  readonly capabilities: RenderCapabilities;

  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // Shader programs
  private layerProgram: WebGLProgram | null = null;
  private checkerboardProgram: WebGLProgram | null = null;

  // Uniform locations
  private layerUniforms: {
    viewProj: WebGLUniformLocation;
    layerRect: WebGLUniformLocation;
    texture: WebGLUniformLocation;
    opacity: WebGLUniformLocation;
  } | null = null;

  // Textures
  private textures: Map<string, TextureRef> = new Map();

  // VAO (empty — we use gl_VertexID)
  private vao: WebGLVertexArrayObject | null = null;

  constructor() {
    this.capabilities = {
      backend: "webgl2",
      maxTextureSize: 0, // set during initialize
      supportsFloatTextures: false,
      supportsLinearFilteringFloat: false,
    };
  }

  initialize(canvas: HTMLCanvasElement): void {
    // 1. Get WebGL2 context
    // 2. Compile shaders, create programs
    // 3. Get uniform locations
    // 4. Create VAO
    // 5. Set capabilities from gl.getParameter()
    // 6. Enable blending: gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  }

  uploadImage(layerId: string, source: ImageBitmap): TextureRef {
    // 1. Delete existing texture if any
    // 2. gl.createTexture()
    // 3. gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    // 4. Set filtering (NEAREST for pixel art, LINEAR for photos)
    // 5. Store in textures map
    // 6. Return TextureRef
  }

  destroyTexture(layerId: string): void {
    // gl.deleteTexture() + remove from map
  }

  render(state: RenderState): void {
    // 1. Clear canvas
    // 2. Compute viewport matrix from state.viewport
    //    - Translation for pan
    //    - Scale for zoom
    //    - Map document coords [0,docW] x [0,docH] to clip space [-1,1]
    // 3. If state.checkerboard, render checkerboard pattern
    // 4. For each layer in state.layers (bottom to top):
    //    a. Skip if !visible
    //    b. Bind layer texture
    //    c. Set u_layerRect (layer position + size in doc coords)
    //    d. Set u_opacity
    //    e. Set u_viewProj
    //    f. gl.drawArrays(gl.TRIANGLES, 0, 6)
    // 5. If state.selection, render selection overlay
  }

  resize(width: number, height: number): void {
    // Update canvas size + gl.viewport
  }

  readPixel(x: number, y: number): [number, number, number, number] | null {
    // gl.readPixels for eyedropper
  }

  dispose(): void {
    // Clean up all GL resources
  }

  // ─── Private Helpers ───
  private compileShader(type: number, source: string): WebGLShader { /* ... */ }
  private createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram { /* ... */ }
  private computeViewMatrix(viewport: ViewportState, canvasW: number, canvasH: number, docW: number, docH: number): Float32Array { /* ... */ }
}
```

### File: `src/renderer/scheduler.ts`

```typescript
export class RenderScheduler {
  private framePending = false;
  private renderCallback: (() => void) | null = null;
  private rafId: number | null = null;

  constructor(renderCallback: () => void) {
    this.renderCallback = renderCallback;
  }

  requestRender(): void {
    if (this.framePending) return;
    this.framePending = true;

    this.rafId = requestAnimationFrame(() => {
      this.framePending = false;
      this.renderCallback?.();
    });
  }

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.framePending = false;
  }

  dispose(): void {
    this.cancel();
    this.renderCallback = null;
  }
}
```

---

## 6. Phase 5: Canvas Viewport Component

### File: `src/viewport/coords.ts`

```typescript
import type { ViewportState } from "../engine/types";

/**
 * Convert screen (client) coordinates to document coordinates.
 * This is the inverse of the viewport transform.
 */
export function screenToDocument(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  viewport: ViewportState
): { x: number; y: number } {
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;

  // Invert pan and zoom
  const docX = (canvasX - viewport.panX) / viewport.zoom;
  const docY = (canvasY - viewport.panY) / viewport.zoom;

  return { x: docX, y: docY };
}

/**
 * Convert document coordinates to screen coordinates.
 */
export function documentToScreen(
  docX: number,
  docY: number,
  canvasRect: DOMRect,
  viewport: ViewportState
): { x: number; y: number } {
  const screenX = docX * viewport.zoom + viewport.panX + canvasRect.left;
  const screenY = docY * viewport.zoom + viewport.panY + canvasRect.top;
  return { x: screenX, y: screenY };
}

/**
 * Compute zoom level to fit document inside container with padding.
 */
export function computeFitZoom(
  docWidth: number,
  docHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = 80
): { zoom: number; panX: number; panY: number } {
  if (docWidth === 0 || docHeight === 0) {
    return { zoom: 1, panX: 0, panY: 0 };
  }

  const fitZoom = Math.min(
    (containerWidth - padding) / docWidth,
    (containerHeight - padding) / docHeight,
    1 // don't zoom beyond 100%
  );

  const panX = (containerWidth - docWidth * fitZoom) / 2;
  const panY = (containerHeight - docHeight * fitZoom) / 2;

  return { zoom: fitZoom, panX, panY };
}
```

### File: `src/viewport/CanvasViewport.tsx`

```typescript
// SolidJS component that owns the <canvas> element and renders via WebGL2.
//
// Props:
//   engine: DocumentEngine — the active document (or null)
//   renderer: WebGL2Backend — shared renderer instance
//   scheduler: RenderScheduler
//   onDocumentCoords: (x: number, y: number) => void — mouse position in doc coords
//   activeTool: string
//   fgColor: string
//   selectedLayerId: string | null
//   onSelectionCreated: (rect) => void
//   onLayerMoved: (id, x, y) => void
//   ... other tool callbacks
//
// Responsibilities:
//   - Mount WebGL2 on <canvas> element
//   - Handle wheel zoom (Ctrl+scroll)
//   - Handle pan (Space+drag)
//   - Dispatch tool-specific mouse events to input-handler
//   - Call scheduler.requestRender() when viewport changes
//   - ResizeObserver to keep canvas size in sync
//   - Render empty state when no document
```

### File: `src/viewport/input-handler.ts`

```typescript
import type { DocumentEngine } from "../engine/document";
import type { CommandHistory } from "../engine/history";

export type ToolType =
  | "move" | "selection" | "pen" | "brush"
  | "eraser" | "eyedropper" | "text" | "crop";

/**
 * Centralized input routing. Given a tool type, routes pointer events
 * to the appropriate handler that directly mutates the DocumentEngine.
 *
 * All handlers follow the pattern:
 *   1. Read current state from engine
 *   2. history.commit(engine.snapshot())  -- before mutation
 *   3. Mutate engine state
 *   4. requestRender()
 *
 * NO IPC. All synchronous frontend operations.
 */
export function handlePointerDown(
  tool: ToolType,
  docX: number,
  docY: number,
  engine: DocumentEngine,
  history: CommandHistory,
  requestRender: () => void,
  context: ToolContext
): void { /* dispatch to tool-specific handler */ }

export function handlePointerMove(
  tool: ToolType,
  docX: number,
  docY: number,
  engine: DocumentEngine,
  requestRender: () => void,
  context: ToolContext
): void { /* dispatch to tool-specific handler */ }

export function handlePointerUp(
  tool: ToolType,
  docX: number,
  docY: number,
  engine: DocumentEngine,
  history: CommandHistory,
  requestRender: () => void,
  context: ToolContext
): void { /* dispatch to tool-specific handler */ }

export interface ToolContext {
  fgColor: string;
  bgColor: string;
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  selectedLayerId: string | null;

  // Transient drag state
  isDragging: boolean;
  dragStart: { x: number; y: number };
  dragCurrent: { x: number; y: number };
}
```

---

## 7. Phase 6: Tauri Native Core (Simplified)

### File: `src-tauri/src/main.rs` (new version, ~80 lines)

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use serde_json::Value;
use tauri::Manager;

// ─── Response Envelope (kept from existing) ───
#[derive(Serialize)]
struct ApiSuccessResponse { ok: bool, contract_version: String, data: Value }
#[derive(Serialize)]
struct ApiErrorPayload { code: String, message: String, details: Value }
#[derive(Serialize)]
struct ApiErrorResponse { ok: bool, contract_version: String, error: ApiErrorPayload }

fn ok_response<T: Serialize>(data: T) -> Result<Value, Value> { /* same as current */ }
fn err_response(code: &str, message: &str) -> Result<Value, Value> { /* same as current */ }

// ─── Commands: Only cold-path native operations ───

#[tauri::command]
fn ping() -> Result<Value, Value> {
    ok_response(serde_json::json!({ "status": "ok", "service": "native" }))
}

#[tauri::command]
fn get_contract_info() -> Result<Value, Value> {
    ok_response(serde_json::json!({
        "name": "photrez-command-contract",
        "version": "2.0.0",
        "supported_commands": [
            "ping", "get_contract_info",
            "read_file_bytes", "write_file_bytes",
            "get_recent_files"
        ]
    }))
}

/// Read file bytes from disk. Returns base64-encoded bytes.
/// Frontend will decode and create ImageBitmap from them.
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Value, Value> {
    match std::fs::read(&path) {
        Ok(bytes) => {
            use base64::Engine;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            ok_response(serde_json::json!({
                "path": path,
                "size": bytes.len(),
                "data": b64
            }))
        }
        Err(e) => err_response("E_IO", &format!("Failed to read file: {}", e)),
    }
}

/// Write bytes to disk (for export).
/// Receives base64-encoded bytes from frontend.
#[tauri::command]
fn write_file_bytes(path: String, data: String) -> Result<Value, Value> {
    use base64::Engine;
    let bytes = match base64::engine::general_purpose::STANDARD.decode(&data) {
        Ok(b) => b,
        Err(e) => return err_response("E_VALIDATION", &format!("Invalid base64: {}", e)),
    };

    match std::fs::write(&path, &bytes) {
        Ok(_) => ok_response(serde_json::json!({
            "path": path,
            "size": bytes.len()
        })),
        Err(e) => err_response("E_IO", &format!("Failed to write file: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            get_contract_info,
            read_file_bytes,
            write_file_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Photrez");
}
```

### File: `src-tauri/Cargo.toml` (simplified)

```toml
[package]
name = "photrez-desktop"
version = "0.2.0"
edition = "2021"

[dependencies]
tauri = { version = "2.0.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
base64 = "0.22"
tauri-plugin-dialog = "2"

# REMOVED: photrez-core, photrez-render, uuid, pollster, windows-sys

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }
```

### File: `src/tauri/native.ts`

```typescript
// Type-safe wrappers for Tauri commands.
// These are the ONLY functions that call invoke().
// Everything else in the app uses the frontend engine directly.

import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

interface ApiResponse<T = unknown> {
  ok: boolean;
  contract_version: string;
  data: T;
}

interface ApiErrorResponse {
  ok: false;
  contract_version: string;
  error: { code: string; message: string; details: unknown };
}

// ─── File Dialog ───
export async function showOpenImageDialog(): Promise<string[] | null> {
  const selected = await open({
    multiple: true,
    filters: [{
      name: "Images",
      extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif"]
    }]
  });

  if (!selected) return null;
  return Array.isArray(selected) ? selected : [selected];
}

export async function showSaveDialog(defaultName: string): Promise<string | null> {
  const ext = defaultName.split(".").pop() || "png";
  return await save({
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  });
}

// ─── File I/O ───
export async function readFileBytes(path: string): Promise<Uint8Array> {
  const result = await invoke("read_file_bytes", { path }) as ApiResponse<{ data: string }>;
  if (!result.ok) throw new Error("Failed to read file");

  // Decode base64 to Uint8Array
  const binaryString = atob(result.data.data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function writeFileBytes(path: string, data: Uint8Array): Promise<void> {
  // Encode Uint8Array to base64
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const b64 = btoa(binary);

  const result = await invoke("write_file_bytes", { path, data: b64 }) as ApiResponse;
  if (!result.ok) throw new Error("Failed to write file");
}

// ─── Ping ───
export async function ping(): Promise<boolean> {
  try {
    const result = await invoke("ping") as ApiResponse;
    return result.ok;
  } catch {
    return false;
  }
}
```

---

## 8. Phase 7: App.tsx Rewrite + Component Extraction

### Overall approach

The existing App.tsx (2171 lines) will be split into:

1. **`App.tsx`** (~200 lines) — grid layout shell, wires components together
2. **UI Components** — extracted from existing JSX, visual code preserved exactly
3. **Logic** — all `invoke()` calls replaced with direct engine/workspace calls

### `App.tsx` (new version, conceptual structure)

```tsx
import { createSignal, onMount, onCleanup } from "solid-js";
import { WorkspaceManager } from "./engine/workspace";
import { WebGL2Backend } from "./renderer/webgl2";
import { RenderScheduler } from "./renderer/scheduler";
import { MenuBar } from "./components/MenuBar";
import { Toolbar } from "./components/Toolbar";
import { ToolRail } from "./components/ToolRail";
import { Inspector } from "./components/Inspector";
import { TabStrip } from "./components/TabStrip";
import { StatusBar } from "./components/StatusBar";
import { CanvasViewport } from "./viewport/CanvasViewport";

export default function App() {
  // ─── Core Instances (singleton, not signals) ───
  const workspace = new WorkspaceManager();
  const renderer = new WebGL2Backend();
  const scheduler = new RenderScheduler(() => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const canvas = canvasRef;
    if (!canvas) return;
    renderer.render(engine.getRenderState(canvas.width, canvas.height));
  });

  // ─── UI State (signals) ───
  const [activeTool, setActiveTool] = createSignal("move");
  const [inspectorOpen, setInspectorOpen] = createSignal(true);
  const [fgColor, setFgColor] = createSignal("#E15A17");
  const [bgColor, setBgColor] = createSignal("#FFFFFF");
  const [zoom, setZoom] = createSignal(100);
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });

  // ─── Reactive Workspace State (derived from workspace) ───
  const [documents, setDocuments] = createSignal<DocumentTabSummary[]>([]);
  const [activeDocumentId, setActiveDocumentId] = createSignal<string | null>(null);
  const [layers, setLayers] = createSignal<LayerNode[]>([]);
  const [docWidth, setDocWidth] = createSignal(800);
  const [docHeight, setDocHeight] = createSignal(600);
  // ... etc

  // Sync UI signals from workspace state
  const syncUI = () => {
    const tabs = workspace.getTabSummaries();
    setDocuments(tabs);
    setActiveDocumentId(workspace.getActiveDocumentId());

    const engine = workspace.getActiveEngine();
    if (engine) {
      setLayers([...engine.getLayers()]);
      setDocWidth(engine.getWidth());
      setDocHeight(engine.getHeight());
    }
  };

  workspace.onChange(syncUI);

  // ─── Layout (preserved from current) ───
  return (
    <div class="app grid grid-rows-[44px_40px_30px_1fr_28px] h-screen overflow-hidden text-[13px] font-medium bg-studio-bg text-text-primary">
      <MenuBar />
      <Toolbar />
      <TabStrip />
      <div class={`workspace grid ${...} min-h-0 h-full overflow-hidden bg-studio-bg p-1.5 gap-1.5`}>
        <ToolRail />
        <CanvasViewport />
        <Show when={inspectorOpen()}>
          <Inspector />
        </Show>
      </div>
      <StatusBar />
    </div>
  );
}
```

### Component extraction mapping

| Component | Source lines in current App.tsx | Preserves visual? |
|-----------|-------------------------------|-------------------|
| `MenuBar.tsx` | L967-1068 (header + file menu) | ✅ Yes |
| `Toolbar.tsx` | L1068-1407 (secondary toolbar) | ✅ Yes |
| `TabStrip.tsx` | L1409-1468 (tabs + close confirm) | ✅ Yes |
| `ToolRail.tsx` | L1473-1633 (tool buttons + color swatches + zoom) | ✅ Yes |
| `CanvasViewport.tsx` | L1635-1852 (canvas area — rewritten to use WebGL2) | ✅ Visual frame, ❌ internals rewritten |
| `Inspector.tsx` | L1854-2143 (properties + layers + history) | ✅ Yes |
| `StatusBar.tsx` | L2146-2167 | ✅ Yes |
| `ExportModal.tsx` | L1351-1404 | ✅ Yes |
| `ColorSwatches.tsx` | L1549-1607 | ✅ Yes |

---

## 9. Phase 8: File Pipeline (Open Image)

### Flow

```text
1. User clicks Open (or Ctrl+O, or drag-drop)
2. showOpenImageDialog() → Tauri shows native file picker → returns paths[]
3. For each path:
   a. readFileBytes(path) → Tauri reads from disk → returns Uint8Array
   b. Create Blob from Uint8Array
   c. createImageBitmap(blob) → browser decodes image → returns ImageBitmap
   d. WorkspaceManager.createDocumentFromImage(id, name, bitmap) → creates DocumentSession
   e. workspace.addDocument(session)
   f. renderer.uploadImage(layerId, bitmap) → creates GL texture
   g. scheduler.requestRender()
4. UI signals update via workspace.onChange callback
```

### Code outline

```typescript
async function handleOpenFile() {
  const paths = await showOpenImageDialog();
  if (!paths) return;

  for (const path of paths) {
    if (workspace.isFull()) break;

    try {
      // Read file from disk via Tauri (cold-path IPC)
      const bytes = await readFileBytes(path);
      const blob = new Blob([bytes]);
      const bitmap = await createImageBitmap(blob);

      // Create document in frontend engine (no IPC)
      const id = `doc-${crypto.randomUUID()}`;
      const name = path.split(/[/\\]/).pop() || "Image";
      const session = WorkspaceManager.createDocumentFromImage(id, name, bitmap);
      workspace.addDocument(session);

      // Upload texture to GPU (frontend, no IPC)
      const layerId = session.engine.getLayers()[0].id;
      renderer.uploadImage(layerId, bitmap);

      scheduler.requestRender();
    } catch (e) {
      console.error(`Failed to open ${path}:`, e);
    }
  }
}
```

---

## 10. Phase 9: Editing Features

### Layer CRUD — direct engine calls

```typescript
// Add layer
const handleAddLayer = () => {
  const engine = workspace.getActiveEngine();
  const history = workspace.getActiveHistory();
  if (!engine || !history) return;

  history.commit(engine.snapshot());
  engine.addLayer(`Layer ${engine.getLayers().length + 1}`);
  scheduler.requestRender();
};

// Delete layer
const handleDeleteLayer = (id: string) => {
  const engine = workspace.getActiveEngine();
  const history = workspace.getActiveHistory();
  if (!engine || !history) return;
  if (engine.getLayers().length <= 1) return;

  history.commit(engine.snapshot());
  engine.deleteLayer(id);
  scheduler.requestRender();
};

// Opacity (hot path — no IPC, no history commit for live slider)
const handleOpacityChange = (id: string, opacity: number) => {
  const engine = workspace.getActiveEngine();
  if (!engine) return;

  engine.setLayerOpacity(id, opacity);
  scheduler.requestRender();
  // History commit on slider release (pointerup), not during drag
};
```

### Undo/Redo — instant, no IPC

```typescript
const handleUndo = () => {
  const engine = workspace.getActiveEngine();
  const history = workspace.getActiveHistory();
  if (!engine || !history || !history.canUndo()) return;

  const prev = history.undo(engine.snapshot());
  if (prev) {
    engine.restore(prev);
    // Re-upload textures for layers that changed
    reuploadChangedTextures(engine);
    scheduler.requestRender();
  }
};
```

### Brush/Eraser — offscreen canvas → commit to layer

```typescript
// During stroke: render to overlay <canvas> (existing pattern preserved)
// On pointer up: commit stroke to layer's ImageBitmap

const commitBrushStroke = (layerId: string, strokeCanvas: HTMLCanvasElement) => {
  const engine = workspace.getActiveEngine();
  const history = workspace.getActiveHistory();
  if (!engine || !history) return;

  const layer = engine.getLayer(layerId);
  if (!layer || !layer.imageBitmap) return;

  history.commit(engine.snapshot());

  // Composite stroke onto layer bitmap
  const offscreen = new OffscreenCanvas(layer.width, layer.height);
  const ctx = offscreen.getContext("2d")!;

  // Draw existing layer content
  ctx.drawImage(layer.imageBitmap, 0, 0);

  // Draw stroke overlay on top
  ctx.drawImage(strokeCanvas, -layer.transform.x, -layer.transform.y);

  // Create new ImageBitmap and update layer
  createImageBitmap(offscreen).then(bitmap => {
    engine.setLayerImageBitmap(layerId, bitmap);
    renderer.uploadImage(layerId, bitmap);
    scheduler.requestRender();
  });
};
```

---

## 11. Phase 10: Export Pipeline

### Frontend-only export (Canvas API)

```typescript
async function handleExport(format: string, quality: number) {
  const engine = workspace.getActiveEngine();
  if (!engine) return;

  const path = await showSaveDialog(`untitled.${format.toLowerCase()}`);
  if (!path) return;

  // Create offscreen canvas at document resolution
  const offscreen = new OffscreenCanvas(engine.getWidth(), engine.getHeight());
  const ctx = offscreen.getContext("2d")!;

  // Composite all visible layers
  const layers = engine.getLayers();
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || !layer.imageBitmap) continue;

    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(
      layer.imageBitmap,
      layer.transform.x,
      layer.transform.y,
      layer.width * layer.transform.scaleX,
      layer.height * layer.transform.scaleY
    );
  }

  // Encode to target format
  const mimeType = format === "PNG" ? "image/png"
    : format === "JPEG" ? "image/jpeg"
    : "image/webp";

  const blob = await offscreen.convertToBlob({
    type: mimeType,
    quality: quality / 100
  });

  // Write to disk via Tauri (cold-path IPC)
  const arrayBuffer = await blob.arrayBuffer();
  await writeFileBytes(path, new Uint8Array(arrayBuffer));
}
```

---

## 12. Rust Cleanup Plan

### Files to DELETE

```
crates/render/                       # Entire crate
crates/core/src/document.rs          # Document model → frontend
crates/core/src/layers.rs            # Layer model → frontend
crates/core/src/history.rs           # History → frontend
crates/core/src/workspace.rs         # Workspace → frontend
crates/core/src/brush.rs             # Brush → frontend
crates/core/src/selection.rs         # Selection → frontend
crates/core/src/transform.rs         # Transform → frontend
```

### Files to MODIFY

```
crates/core/src/lib.rs               # Remove all module registrations except export
crates/core/src/export.rs            # KEEP for now, but may be removed if frontend export works
Cargo.toml (workspace root)          # Remove render from members
apps/desktop/src-tauri/Cargo.toml    # Remove photrez-core, photrez-render deps
apps/desktop/src-tauri/src/main.rs   # Rewrite to ~80 lines
```

### Dependency cleanup

Current `photrez-desktop` Cargo deps to REMOVE:
- `photrez-core` (no longer needed by Tauri commands)
- `photrez-render` (deleted)
- `uuid` (frontend uses `crypto.randomUUID()`)
- `pollster` (no more wgpu init)
- `windows-sys` (no more window hacks)

Current `photrez-desktop` Cargo deps to KEEP:
- `tauri` (still the shell)
- `serde`, `serde_json` (response envelopes)
- `base64` (file transfer encoding)
- `tauri-plugin-dialog` (native file picker)

### Tauri config changes

`tauri.conf.json` — **may need to change**:
- `transparent: true` → probably change to `false` (no longer rendering wgpu behind webview)
- `decorations: false` → keep (custom title bar)

---

## 13. Test Plan

### Engine Tests (`src/engine/__tests__/`)

#### `document.test.ts`

```typescript
describe("DocumentEngine", () => {
  // Construction
  it("creates document with correct dimensions");
  it("creates document with empty layer list");
  it("generates unique layer IDs");

  // Layer CRUD
  it("adds a layer and updates layer list");
  it("deletes a layer by ID");
  it("prevents deleting the last layer");
  it("reorders layers correctly");
  it("sets active layer");

  // Layer Properties
  it("sets layer opacity (clamped 0-1)");
  it("sets layer visibility");
  it("sets layer locked state");
  it("sets layer name");
  it("sets layer blend mode");

  // Transform
  it("moves layer to new position");
  it("applies scale transform");
  it("applies rotation");
  it("flips layer horizontally");
  it("flips layer vertically");

  // Selection
  it("creates rectangular selection");
  it("clears selection");
  it("selects all (full document rect)");

  // Viewport
  it("updates viewport pan");
  it("updates viewport zoom");
  it("fits to screen calculates correct zoom and pan");

  // Canvas Operations
  it("crops canvas with valid bounds");
  it("rejects crop with invalid bounds");
  it("resizes canvas");

  // Render State
  it("generates correct render state");
  it("render state includes only visible layers");
  it("render state reflects current viewport");

  // Dirty Tracking
  it("marks layer dirty on modification");
  it("clears dirty flags");
  it("reports dirty layer IDs");

  // Snapshot / Restore
  it("snapshot creates deep clone");
  it("restore overwrites current state");
  it("snapshot and restore round-trip preserves data");

  // Memory Budget
  it("calculates memory usage correctly");
  it("canAddLayer returns false when over budget");
});
```

#### `history.test.ts`

```typescript
describe("CommandHistory", () => {
  it("starts with empty stacks");
  it("commit pushes to undo stack");
  it("undo pops from undo stack and pushes to redo");
  it("redo pops from redo stack and pushes to undo");
  it("undo returns null when empty");
  it("redo returns null when empty");
  it("commit clears redo stack (redo branch discard)");
  it("evicts oldest when exceeding max depth");
  it("canUndo and canRedo report correctly");
  it("clear empties both stacks");
  it("respects custom max depth");
});
```

#### `workspace.test.ts`

```typescript
describe("WorkspaceManager", () => {
  it("starts with no documents");
  it("adds a document and sets it active");
  it("switches active document");
  it("removes document and adjusts active");
  it("enforces max document limit");
  it("isFull returns true at limit");
  it("getTabSummaries returns correct info");
  it("onChange callback fires on mutations");
  it("createDocumentFromImage creates correct session");
  it("createBlankDocument creates correct session");
});
```

### Renderer Tests (`src/renderer/__tests__/`)

#### `scheduler.test.ts`

```typescript
describe("RenderScheduler", () => {
  it("calls render callback on next animation frame");
  it("coalesces multiple requestRender calls");
  it("cancel prevents pending render");
  it("dispose cleans up");
});
```

### Existing Tests (re-wire)

The 4 existing test files will be updated to test against the new engine:
- `keyboard-shortcuts.test.ts` — verify shortcuts dispatch to engine methods
- `viewport.test.ts` — test coordinate conversion utilities
- `transform.test.ts` — test transform operations on engine
- `renderer.test.ts` — test WebGL2 initialization

---

## 14. Documentation Updates

After migration is complete, these docs need updating:

| Document | Changes |
|----------|---------|
| `AI_CONTEXT.md` | Section 2 (Tauri commands), Section 6 (wgpu), Section 7 (history pattern), Section 9 (lessons) |
| `ARCHITECTURE.md` | Complete rewrite of diagram, data flow, registered commands, file structure |
| `FEATURES.md` | Update viewport status, renderer status |
| `AI_HISTORY.md` | Append migration entry |
| `AI_CURRENT_TASK.md` | Update current task |
| `docs/02-architecture.md` | Align with new architecture |
| `docs/03-trd.md` | Update tech requirements |
| `docs/15-command-contract-spec.md` | New contract v2.0.0 (only native commands) |
| `docs/31-dependency-inventory.md` | Remove Rust deps, document no new frontend deps |
| `GEMINI.md` | Remove wgpu references |

---

## 15. Migration Checklist

### Pre-Flight
- [ ] Create git branch `arch/frontend-engine-v2`
- [ ] Verify current build passes: `pnpm.cmd run build`
- [ ] Verify current tests pass: `pnpm.cmd --filter photrez-desktop test`

### Phase 1: Engine Foundation
- [ ] Create `src/engine/types.ts` with all type definitions
- [ ] Create `src/engine/document.ts` with DocumentEngine class
- [ ] Create `src/engine/__tests__/document.test.ts`
- [ ] Verify: `pnpm.cmd --filter photrez-desktop test` passes new tests

### Phase 2: History System
- [ ] Create `src/engine/history.ts` with CommandHistory
- [ ] Create `src/engine/__tests__/history.test.ts`
- [ ] Verify: tests pass

### Phase 3: Workspace Manager
- [ ] Create `src/engine/workspace.ts` with WorkspaceManager
- [ ] Create `src/engine/__tests__/workspace.test.ts`
- [ ] Verify: tests pass

### Phase 4: WebGL2 Renderer
- [ ] Create `src/renderer/types.ts`
- [ ] Create `src/renderer/shaders.ts`
- [ ] Create `src/renderer/webgl2.ts`
- [ ] Create `src/renderer/scheduler.ts`
- [ ] Create `src/renderer/__tests__/scheduler.test.ts`
- [ ] Verify: tests pass

### Phase 5: Canvas Viewport
- [ ] Create `src/viewport/coords.ts`
- [ ] Create `src/viewport/CanvasViewport.tsx`
- [ ] Create `src/viewport/input-handler.ts`
- [ ] Verify: `pnpm.cmd run build` passes (TypeScript check)

### Phase 6: Tauri Simplification
- [ ] Rewrite `main.rs` to ~80 lines (only native commands)
- [ ] Simplify `src-tauri/Cargo.toml` (remove heavy deps)
- [ ] Create `src/tauri/native.ts` (type-safe IPC wrappers)
- [ ] Verify: `cargo check -p photrez-desktop`
- [ ] Verify: `pnpm.cmd run build`

### Phase 7: App.tsx Rewrite
- [ ] Extract `MenuBar.tsx` from current App.tsx
- [ ] Extract `Toolbar.tsx`
- [ ] Extract `ToolRail.tsx`
- [ ] Extract `Inspector.tsx`
- [ ] Extract `TabStrip.tsx`
- [ ] Extract `StatusBar.tsx`
- [ ] Extract `ExportModal.tsx`
- [ ] Extract `ColorSwatches.tsx`
- [ ] Extract `ConfirmDialog.tsx`
- [ ] Rewrite `App.tsx` to use WorkspaceManager + components
- [ ] Remove all `invoke()` calls from editing logic
- [ ] Verify: `pnpm.cmd run build` passes
- [ ] Verify: `pnpm.cmd --filter photrez-desktop test` passes

### Phase 8: File Pipeline
- [ ] Implement open image flow (dialog → read → decode → engine → GPU)
- [ ] Implement drag & drop
- [ ] Verify: `pnpm.cmd tauri dev` → open image → see pixels

### Phase 9: Editing Features
- [ ] Wire layer CRUD to engine
- [ ] Wire undo/redo to engine
- [ ] Wire selection to engine
- [ ] Wire transform to engine
- [ ] Wire brush/eraser to engine
- [ ] Verify: full editing flow works

### Phase 10: Export
- [ ] Implement frontend export (Canvas API → Tauri write)
- [ ] Verify: export produces valid PNG/JPEG/WebP

### Cleanup
- [ ] Delete `crates/render/` entirely
- [ ] Reduce `crates/core/` to export-only (or delete entirely)
- [ ] Remove `Cargo.toml` workspace member for render
- [ ] Update `tauri.conf.json` (transparent: false)
- [ ] Clean up unused Rust deps

### Documentation
- [ ] Update `AI_CONTEXT.md`
- [ ] Update `ARCHITECTURE.md`
- [ ] Update `FEATURES.md`
- [ ] Update `AI_HISTORY.md`
- [ ] Update `docs/15-command-contract-spec.md`
- [ ] Update `GEMINI.md`

### Final Verification
- [ ] `pnpm.cmd run build` — passes
- [ ] `pnpm.cmd --filter photrez-desktop test` — all tests pass
- [ ] `cargo check -p photrez-desktop` — passes
- [ ] `pnpm.cmd tauri dev` — app launches
- [ ] Smoke test: open → pan/zoom → add layer → brush → undo → export
- [ ] Performance: pan/zoom at 60 FPS (no IPC per frame)
