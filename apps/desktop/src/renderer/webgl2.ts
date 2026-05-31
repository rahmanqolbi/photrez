import type { RenderBackend, RenderCapabilities, TextureRef } from "./types";
import type { RenderState, ViewportState } from "../engine/types";
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

  // Shaders
  private layerProgram: WebGLProgram | null = null;
  private checkerboardProgram: WebGLProgram | null = null;

  // Uniform locations
  private layerUniforms: {
    viewProj: WebGLUniformLocation;
    layerRect: WebGLUniformLocation;
    texture: WebGLUniformLocation;
    opacity: WebGLUniformLocation;
  } | null = null;

  private checkerboardUniforms: {
    resolution: WebGLUniformLocation;
    checkSize: WebGLUniformLocation;
    color1: WebGLUniformLocation;
    color2: WebGLUniformLocation;
  } | null = null;

  // VAO (empty - we use gl_VertexID)
  private vao: WebGLVertexArrayObject | null = null;

  // Textures map
  private textures: Map<string, TextureRef> = new Map();

  constructor() {
    this.capabilities = {
      backend: "webgl2",
      maxTextureSize: 2048, // Fallback, updated during initialize
      supportsFloatTextures: false,
      supportsLinearFilteringFloat: false
    };
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      premultipliedAlpha: false,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });

    if (!this.gl) {
      throw new Error("WebGL2 not supported on this platform/browser");
    }

    const gl = this.gl;

    // Compile programs
    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    this.layerProgram = this.createProgram(vs, fs);

    const checkFs = this.compileShader(gl.FRAGMENT_SHADER, CHECKERBOARD_FRAGMENT_SOURCE);
    this.checkerboardProgram = this.createProgram(vs, checkFs);

    // Get Uniforms
    this.layerUniforms = {
      viewProj: gl.getUniformLocation(this.layerProgram, "u_viewProj")!,
      layerRect: gl.getUniformLocation(this.layerProgram, "u_layerRect")!,
      texture: gl.getUniformLocation(this.layerProgram, "u_texture")!,
      opacity: gl.getUniformLocation(this.layerProgram, "u_opacity")!
    };

    this.checkerboardUniforms = {
      resolution: gl.getUniformLocation(this.checkerboardProgram, "u_resolution")!,
      checkSize: gl.getUniformLocation(this.checkerboardProgram, "u_checkSize")!,
      color1: gl.getUniformLocation(this.checkerboardProgram, "u_color1")!,
      color2: gl.getUniformLocation(this.checkerboardProgram, "u_color2")!
    };

    // Setup empty VAO
    this.vao = gl.createVertexArray();

    // Enable Blend
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Update capabilities
    this.capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  }

  uploadImage(layerId: string, source: ImageBitmap): TextureRef {
    const gl = this.gl;
    if (!gl) throw new Error("Renderer not initialized");

    this.destroyTexture(layerId); // delete existing

    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create WebGL2 texture");

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Upload
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // Filtering rules: Clamped edges + Linear downscaling
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // Snappy pixel margins
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);

    const ref: TextureRef = {
      id: `tex-${layerId}`,
      texture,
      width: source.width,
      height: source.height
    };

    this.textures.set(layerId, ref);
    return ref;
  }

  destroyTexture(layerId: string): void {
    const ref = this.textures.get(layerId);
    if (ref && this.gl) {
      this.gl.deleteTexture(ref.texture);
      this.textures.delete(layerId);
    }
  }

  render(state: RenderState): void {
    const gl = this.gl;
    const canvas = this.canvas;
    if (!gl || !canvas) return;

    // Resize viewport matching drawing buffers
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear background
    const [bgR, bgG, bgB, bgA] = state.backgroundColor;
    gl.clearColor(bgR, bgG, bgB, bgA);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(this.vao);

    // 1. Render Checkerboard if requested
    if (state.checkerboard && this.checkerboardProgram) {
      gl.useProgram(this.checkerboardProgram);
      gl.uniform2f(this.checkerboardUniforms!.resolution, canvas.width, canvas.height);
      gl.uniform1f(this.checkerboardUniforms!.checkSize, 8.0); // 8px grids
      gl.uniform4f(this.checkerboardUniforms!.color1, 0.1, 0.11, 0.12, 1.0); // Sunken grays
      gl.uniform4f(this.checkerboardUniforms!.color2, 0.08, 0.09, 0.1, 1.0);

      // Render full screen check via static NDC quad (viewProj as identity matrix)
      const identityProj = new Float32Array([
        2 / canvas.width, 0, 0, 0,
        0, -2 / canvas.height, 0, 0,
        0, 0, 1, 0,
        -1, 1, 0, 1
      ]);
      const checkerRectLocation = gl.getUniformLocation(this.checkerboardProgram, "u_layerRect");
      const checkerProjLocation = gl.getUniformLocation(this.checkerboardProgram, "u_viewProj");
      
      gl.uniform4f(checkerRectLocation, 0, 0, canvas.width, canvas.height);
      gl.uniformMatrix4fv(checkerProjLocation, false, identityProj);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Compute document Viewport projection matrix
    const viewProj = this.computeViewMatrix(
      state.viewport,
      canvas.width,
      canvas.height,
      this.textures.size > 0 ? Array.from(this.textures.values())[0].width : 800, // Document dimensions fallback
      this.textures.size > 0 ? Array.from(this.textures.values())[0].height : 600
    );

    // 2. Render Layers (bottom-to-top)
    if (this.layerProgram && this.layerUniforms) {
      gl.useProgram(this.layerProgram);
      gl.uniformMatrix4fv(this.layerUniforms.viewProj, false, viewProj);

      // We traverse in reverse direction: layers stack is top-to-bottom, so bottom is at end
      for (let i = state.layers.length - 1; i >= 0; i--) {
        const renderLayer = state.layers[i];
        if (!renderLayer.visible) continue;

        const ref = this.textures.get(renderLayer.id);
        if (!ref) continue;

        gl.bindTexture(gl.TEXTURE_2D, ref.texture);
        gl.uniform1i(this.layerUniforms.texture, 0);
        gl.uniform1f(this.layerUniforms.opacity, renderLayer.opacity);

        // Compute layer boundaries incorporating scale and rotation in vertex shader rect
        // Rect: x, y, width, height in document coordinates
        gl.uniform4f(
          this.layerUniforms.layerRect,
          renderLayer.transform.x,
          renderLayer.transform.y,
          renderLayer.width * renderLayer.transform.scaleX,
          renderLayer.height * renderLayer.transform.scaleY
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }

    gl.bindVertexArray(null);
  }

  resize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  readPixel(x: number, y: number): [number, number, number, number] | null {
    const gl = this.gl;
    if (!gl) return null;

    const pixels = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return [pixels[0], pixels[1], pixels[2], pixels[3]];
  }

  dispose(): void {
    if (this.gl) {
      for (const [id, ref] of this.textures.entries()) {
        this.gl.deleteTexture(ref.texture);
      }
      this.textures.clear();

      if (this.vao) this.gl.deleteVertexArray(this.vao);
      if (this.layerProgram) this.gl.deleteProgram(this.layerProgram);
      if (this.checkerboardProgram) this.gl.deleteProgram(this.checkerboardProgram);

      this.gl = null;
    }
    this.canvas = null;
  }

  // ─── Compile Helpers ───
  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${log}`);
    }
    return shader;
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const gl = this.gl!;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader program link error: ${log}`);
    }
    return program;
  }

  private computeViewMatrix(
    viewport: ViewportState,
    canvasW: number,
    canvasH: number,
    docW: number,
    docH: number
  ): Float32Array {
    // 2D View Projection Matrix mapping Document Space to NDC Space.
    // 1. Scale document bounds by Zoom factor
    // 2. Translate offset by PanX and PanY
    // 3. Map result to clip space range [-1, 1] using standard orthographic projection
    const z = viewport.zoom;
    const px = viewport.panX;
    const py = viewport.panY;

    // Standard column-major 4x4 matrix
    const m = new Float32Array(16);
    m[0] = (2 * z) / canvasW;
    m[5] = (-2 * z) / canvasH;
    m[10] = 1.0;
    m[12] = (2 * px) / canvasW - 1.0;
    m[13] = 1.0 - (2 * py) / canvasH;
    m[15] = 1.0;

    return m;
  }
}
