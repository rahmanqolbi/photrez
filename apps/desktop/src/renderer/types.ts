import type { RenderState, ViewportState } from "../engine/types";

export interface RenderCapabilities {
  backend: "webgl2" | "webgpu" | "cpu";
  maxTextureSize: number;
  supportsFloatTextures: boolean;
  supportsLinearFilteringFloat: boolean;
}

export interface TextureRef {
  id: string;
  texture: WebGLTexture;
  width: number;
  height: number;
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

  readPixel(x: number, y: number): [number, number, number, number] | null;
}
