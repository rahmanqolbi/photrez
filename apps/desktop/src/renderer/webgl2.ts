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

  // Shaders
  private layerProgram: WebGLProgram | null = null;
  private checkerboardProgram: WebGLProgram | null = null;

  // Uniform locations
  private layerUniforms: {
    viewProj: WebGLUniformLocation;
    layerRect: WebGLUniformLocation;
    layerCenter: WebGLUniformLocation;
    layerRotation: WebGLUniformLocation;
    flipSign: WebGLUniformLocation;
    texture: WebGLUniformLocation;
    backdrop: WebGLUniformLocation;
    opacity: WebGLUniformLocation;
    blendMode: WebGLUniformLocation;
    useBackdrop: WebGLUniformLocation;
    flipTexY: WebGLUniformLocation;
    resolution: WebGLUniformLocation;
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

  // Ping-pong Framebuffers & Textures
  private pingPongFbos: [WebGLFramebuffer | null, WebGLFramebuffer | null] = [null, null];
  private pingPongTextures: [WebGLTexture | null, WebGLTexture | null] = [null, null];
  private currentWidth = 0;
  private currentHeight = 0;

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
      layerCenter: gl.getUniformLocation(this.layerProgram, "u_layerCenter")!,
      layerRotation: gl.getUniformLocation(this.layerProgram, "u_layerRotation")!,
      flipSign: gl.getUniformLocation(this.layerProgram, "u_flipSign")!,
      texture: gl.getUniformLocation(this.layerProgram, "u_texture")!,
      backdrop: gl.getUniformLocation(this.layerProgram, "u_backdrop")!,
      opacity: gl.getUniformLocation(this.layerProgram, "u_opacity")!,
      blendMode: gl.getUniformLocation(this.layerProgram, "u_blendMode")!,
      useBackdrop: gl.getUniformLocation(this.layerProgram, "u_useBackdrop")!,
      flipTexY: gl.getUniformLocation(this.layerProgram, "u_flipTexY")!,
      resolution: gl.getUniformLocation(this.layerProgram, "u_resolution")!
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

    // Ensure ping-pong FBOs exist and are sized properly
    const docW = state.documentSize.width;
    const docH = state.documentSize.height;
    const viewProj = this.computeViewMatrix(docW, docH);

    // Filter visible layers with textures
    const visibleLayers = [];
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const renderLayer = state.layers[i];
      if (renderLayer.visible && this.textures.has(renderLayer.id)) {
        visibleLayers.push(renderLayer);
      }
    }

    let activeFboIndex = 0;

    if (visibleLayers.length > 0 && this.layerProgram && this.layerUniforms) {
      gl.useProgram(this.layerProgram);
      gl.bindVertexArray(this.vao);
      
      // Clear both FBOs
      for (let i = 0; i < 2; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPongFbos[i]);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }

      let firstDraw = true;
      let prevFboIndex = 0;
      let currFboIndex = 1;

      for (const renderLayer of visibleLayers) {
        const ref = this.textures.get(renderLayer.id)!;

        if (firstDraw) {
          // Render directly into FBO 0
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPongFbos[0]);
          gl.viewport(0, 0, canvas.width, canvas.height);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, ref.texture);
          gl.uniform1i(this.layerUniforms.texture, 0);

          gl.uniformMatrix4fv(this.layerUniforms.viewProj, false, viewProj);
          gl.uniform1f(this.layerUniforms.opacity, renderLayer.opacity);
          gl.uniform1i(this.layerUniforms.blendMode, 0); // Normal
          gl.uniform1i(this.layerUniforms.useBackdrop, 0); // No backdrop
          gl.uniform1i(this.layerUniforms.flipTexY, 0); // Raw texture, no flip

          const t = renderLayer.transform;
          const effW = renderLayer.width * Math.abs(t.scaleX);
          const effH = renderLayer.height * Math.abs(t.scaleY);
          const cx = t.x + effW / 2;
          const cy = t.y + effH / 2;
          const flipX = t.flipH ? -1 : 1;
          const flipY = t.flipV ? -1 : 1;

          gl.uniform4f(this.layerUniforms.layerRect, t.x, t.y, effW, effH);
          gl.uniform2f(this.layerUniforms.layerCenter, cx, cy);
          gl.uniform1f(this.layerUniforms.layerRotation, t.rotation || 0);
          gl.uniform2f(this.layerUniforms.flipSign, flipX, flipY);

          gl.drawArrays(gl.TRIANGLES, 0, 6);

          firstDraw = false;
          activeFboIndex = 0;
        } else {
          // Bind FBO currFboIndex as target
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPongFbos[currFboIndex]);
          gl.viewport(0, 0, canvas.width, canvas.height);

          // 1. Copy prevFboIndex texture to currFboIndex
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, this.pingPongTextures[prevFboIndex]);
          gl.uniform1i(this.layerUniforms.texture, 0);

          gl.uniformMatrix4fv(this.layerUniforms.viewProj, false, viewProj);
          gl.uniform1f(this.layerUniforms.opacity, 1.0);
          gl.uniform1i(this.layerUniforms.blendMode, 0);
          gl.uniform1i(this.layerUniforms.useBackdrop, 0);
          gl.uniform1i(this.layerUniforms.flipTexY, 1); // FBO texture, flip Y

          // Fullscreen quad in document coords
          gl.uniform4f(this.layerUniforms.layerRect, 0, 0, docW, docH);
          gl.uniform2f(this.layerUniforms.layerCenter, docW / 2, docH / 2);
          gl.uniform1f(this.layerUniforms.layerRotation, 0);
          gl.uniform2f(this.layerUniforms.flipSign, 1.0, 1.0);

          gl.drawArrays(gl.TRIANGLES, 0, 6);

          // 2. Composite new layer onto currFboIndex using prevFboIndex texture as backdrop
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, ref.texture);
          gl.uniform1i(this.layerUniforms.texture, 0);

          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, this.pingPongTextures[prevFboIndex]);
          gl.uniform1i(this.layerUniforms.backdrop, 1);

          gl.uniformMatrix4fv(this.layerUniforms.viewProj, false, viewProj);
          gl.uniform1f(this.layerUniforms.opacity, renderLayer.opacity);
          
          // Map blend mode string to ID
          const modeId = this.getBlendModeId(renderLayer.blendMode || "normal");
          gl.uniform1i(this.layerUniforms.blendMode, modeId);
          gl.uniform1i(this.layerUniforms.useBackdrop, 1);
          gl.uniform1i(this.layerUniforms.flipTexY, 0); // Raw layer texture, no flip
          gl.uniform2f(this.layerUniforms.resolution, canvas.width, canvas.height);

          const t = renderLayer.transform;
          const effW = renderLayer.width * Math.abs(t.scaleX);
          const effH = renderLayer.height * Math.abs(t.scaleY);
          const cx = t.x + effW / 2;
          const cy = t.y + effH / 2;
          const flipX = t.flipH ? -1 : 1;
          const flipY = t.flipV ? -1 : 1;

          gl.uniform4f(this.layerUniforms.layerRect, t.x, t.y, effW, effH);
          gl.uniform2f(this.layerUniforms.layerCenter, cx, cy);
          gl.uniform1f(this.layerUniforms.layerRotation, t.rotation || 0);
          gl.uniform2f(this.layerUniforms.flipSign, flipX, flipY);

          gl.drawArrays(gl.TRIANGLES, 0, 6);

          activeFboIndex = currFboIndex;
          prevFboIndex = currFboIndex;
          currFboIndex = 1 - currFboIndex;
        }
      }
    }

    // Now render to main screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

      const checkerRectLocation = gl.getUniformLocation(this.checkerboardProgram, "u_layerRect");
      const checkerProjLocation = gl.getUniformLocation(this.checkerboardProgram, "u_viewProj");
      
      // Render checkerboard ONLY within the bounds of the artboard/document
      gl.uniform4f(checkerRectLocation, 0, 0, docW, docH);
      gl.uniformMatrix4fv(checkerProjLocation, false, viewProj);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // 2. Render final FBO onto the checkerboard
    if (visibleLayers.length > 0 && this.layerProgram && this.layerUniforms) {
      gl.useProgram(this.layerProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pingPongTextures[activeFboIndex]);
      gl.uniform1i(this.layerUniforms.texture, 0);

      gl.uniformMatrix4fv(this.layerUniforms.viewProj, false, viewProj);
      gl.uniform1f(this.layerUniforms.opacity, 1.0);
      gl.uniform1i(this.layerUniforms.blendMode, 0); // Normal
      gl.uniform1i(this.layerUniforms.useBackdrop, 0); // No backdrop
      gl.uniform1i(this.layerUniforms.flipTexY, 1); // FBO texture, flip Y

      // Fullscreen quad in document coords
      gl.uniform4f(this.layerUniforms.layerRect, 0, 0, docW, docH);
      gl.uniform2f(this.layerUniforms.layerCenter, docW / 2, docH / 2);
      gl.uniform1f(this.layerUniforms.layerRotation, 0);
      gl.uniform2f(this.layerUniforms.flipSign, 1.0, 1.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.bindVertexArray(null);
  }

  private getBlendModeId(mode: string): number {
    switch (mode) {
      case "normal": return 0;
      case "multiply": return 1;
      case "screen": return 2;
      case "overlay": return 3;
      case "darken": return 4;
      case "lighten": return 5;
      case "color-dodge": return 6;
      case "color-burn": return 7;
      case "hard-light": return 8;
      case "soft-light": return 9;
      case "difference": return 10;
      case "exclusion": return 11;
      default: return 0;
    }
  }

  resize(docWidth: number, docHeight: number, zoom: number, dpr: number): void {
    const w = Math.round(docWidth * zoom * dpr);
    const h = Math.round(docHeight * zoom * dpr);

    if (this.canvas) {
      // Scale pixel buffer by zoom × dpr so visual area = device pixel area (sharp on HiDPI)
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const gl = this.gl;
    if (!gl) return;

    if (w !== this.currentWidth || h !== this.currentHeight) {
      this.currentWidth = w;
      this.currentHeight = h;

      // Delete existing ping-pong buffers
      for (let i = 0; i < 2; i++) {
        if (this.pingPongFbos[i]) {
          gl.deleteFramebuffer(this.pingPongFbos[i]);
          this.pingPongFbos[i] = null;
        }
        if (this.pingPongTextures[i]) {
          gl.deleteTexture(this.pingPongTextures[i]);
          this.pingPongTextures[i] = null;
        }
      }

      // Recreate them
      for (let i = 0; i < 2; i++) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          w,
          h,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          texture,
          0
        );

        this.pingPongTextures[i] = texture;
        this.pingPongFbos[i] = fbo;
      }

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

      for (let i = 0; i < 2; i++) {
        if (this.pingPongFbos[i]) this.gl.deleteFramebuffer(this.pingPongFbos[i]);
        if (this.pingPongTextures[i]) this.gl.deleteTexture(this.pingPongTextures[i]);
      }
      this.pingPongFbos = [null, null];
      this.pingPongTextures = [null, null];

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

  private computeViewMatrix(docW: number, docH: number): Float32Array {
    // Identity orthographic projection: map document bounds [0,docW]x[0,docH]
    // directly to NDC [-1,1]x[-1,1]. Pan and zoom are handled entirely by
    // the CSS transform in CanvasViewport — the WebGL canvas renders at 1:1
    // document pixel resolution with no viewport transform applied here.
    const m = new Float32Array(16);
    m[0] = 2.0 / docW;   // scale X: [0, docW] → [-1, 1]
    m[5] = -2.0 / docH;  // scale Y: [0, docH] → [1, -1] (Y flip)
    m[10] = 1.0;
    m[12] = -1.0;         // offset X: center
    m[13] = 1.0;          // offset Y: center
    m[15] = 1.0;
    return m;
  }
}
