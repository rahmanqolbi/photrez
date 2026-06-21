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
  lockTransparency?: boolean;
  lockPosition?: boolean;
  lockRotation?: boolean;
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
  angle: number;
  /** When true, the selected pixels are everything outside these bounds. */
  inverted?: boolean;
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
  documentSize: { width: number; height: number };
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
export interface DocumentTabSummary {
  id: DocumentId;
  displayName: string;
  isDirty: boolean;
}

export const DEFAULT_DOCUMENT_WIDTH = 800;
export const DEFAULT_DOCUMENT_HEIGHT = 600;
