// Vertex shader: Fullscreen quad with view projection matrix transforms
// Handles center-anchored flip, rotation, and scale.
// u_layerRect.zw = effective pixel dimensions (layerWidth * scaleX, layerHeight * scaleY)
// u_flipSign = (±1, ±1) — from flipH/flipV booleans only (not from scaleX sign)
export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform mat4 u_viewProj;
uniform vec4 u_layerRect;   // x, y, effWidth, effHeight
uniform vec2 u_layerCenter; // center of layer (rotation/flip pivot)
uniform float u_layerRotation; // degrees, clockwise
uniform vec2 u_flipSign;    // (±1, ±1) — mirrored when negative

out vec2 v_texCoord;

void main() {
  vec2 positions[6] = vec2[6](
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0)
  );

  vec2 pos = positions[gl_VertexID];
  // No Y-flip needed: computeViewMatrix flips Y (m[5] = -2/docH) so pos.y=0 is visual TOP.
  // default UNPACK_FLIP_Y_WEBGL=false means texel v=0 = first uploaded row = top of image.
  // pos.y=0 → v=0 → top of image ✓ — without 1.0-pos.y double-flip.
  v_texCoord = vec2(pos.x, pos.y);

  // Map to layer-local in effective pixel dimensions
  vec2 localPos = pos * u_layerRect.zw;

  // Center for rotation pivot
  vec2 centered = localPos - u_layerRect.zw * 0.5;

  // Mirror (flip) around center — order: center first, then flip
  centered *= u_flipSign;

  // Rotation — positive angle = CW in screen space
  float rad = radians(u_layerRotation);
  float c = cos(rad);
  float s = sin(rad);
  vec2 rotated = vec2(
    centered.x * c - centered.y * s,
    centered.x * s + centered.y * c
  );

  // Translate to document position
  gl_Position = u_viewProj * vec4(rotated + u_layerCenter, 0.0, 1.0);
}`;

// Fragment shader: Texture sampling with opacity and FBO blend modes
export const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_backdrop;
uniform float u_opacity;
uniform int u_blendMode;
uniform bool u_useBackdrop;
uniform bool u_flipTexY;
uniform vec2 u_resolution;

in vec2 v_texCoord;
out vec4 fragColor;

vec3 blendColors(int mode, vec3 b, vec3 s) {
  if (mode == 0) { // Normal
    return s;
  } else if (mode == 1) { // Multiply
    return b * s;
  } else if (mode == 2) { // Screen
    return b + s - b * s;
  } else if (mode == 3) { // Overlay
    vec3 result;
    for (int i = 0; i < 3; i++) {
      result[i] = b[i] < 0.5 ? (2.0 * b[i] * s[i]) : (1.0 - 2.0 * (1.0 - b[i]) * (1.0 - s[i]));
    }
    return result;
  } else if (mode == 4) { // Darken
    return min(b, s);
  } else if (mode == 5) { // Lighten
    return max(b, s);
  } else if (mode == 6) { // Color Dodge
    vec3 result;
    for (int i = 0; i < 3; i++) {
      result[i] = s[i] == 1.0 ? 1.0 : min(1.0, b[i] / (1.0 - s[i]));
    }
    return result;
  } else if (mode == 7) { // Color Burn
    vec3 result;
    for (int i = 0; i < 3; i++) {
      result[i] = s[i] == 0.0 ? 0.0 : max(0.0, 1.0 - (1.0 - b[i]) / s[i]);
    }
    return result;
  } else if (mode == 8) { // Hard Light
    vec3 result;
    for (int i = 0; i < 3; i++) {
      result[i] = s[i] < 0.5 ? (2.0 * b[i] * s[i]) : (1.0 - 2.0 * (1.0 - b[i]) * (1.0 - s[i]));
    }
    return result;
  } else if (mode == 9) { // Soft Light
    vec3 result;
    for (int i = 0; i < 3; i++) {
      if (s[i] <= 0.5) {
        result[i] = b[i] - (1.0 - 2.0 * s[i]) * b[i] * (1.0 - b[i]);
      } else {
        float d = (b[i] <= 0.25) ? (((16.0 * b[i] - 12.0) * b[i] + 4.0) * b[i]) : sqrt(b[i]);
        result[i] = b[i] + (2.0 * s[i] - 1.0) * (d - b[i]);
      }
    }
    return result;
  } else if (mode == 10) { // Difference
    return abs(b - s);
  } else if (mode == 11) { // Exclusion
    return b + s - 2.0 * b * s;
  }
  return s;
}

void main() {
  vec2 texCoord = v_texCoord;
  if (u_flipTexY) {
    texCoord.y = 1.0 - texCoord.y;
  }
  vec4 src = texture(u_texture, texCoord);
  src.a *= u_opacity;

  if (!u_useBackdrop) {
    fragColor = src;
    return;
  }

  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 dst = texture(u_backdrop, uv);

  if (src.a == 0.0) {
    fragColor = dst;
    return;
  }
  if (dst.a == 0.0) {
    fragColor = src;
    return;
  }

  vec3 blended = blendColors(u_blendMode, dst.rgb, src.rgb);
  float outAlpha = src.a + dst.a * (1.0 - src.a);
  vec3 outColor = (src.a * blended + dst.a * (1.0 - src.a) * dst.rgb) / outAlpha;

  fragColor = vec4(outColor, outAlpha);
}`;

// Dedicated vertex shader for the checkerboard pass. Renders a full-viewport
// quad in normalized device coordinates (NDC), bypassing the layer program's
// complex transform math (which depends on u_layerRect + u_layerCenter to
// position the quad). The checkerboard should always fill the entire
// framebuffer; per-artboard clipping is left to the fragment shader (which
// is currently full-frame, matching the design where the artboard is the
// whole canvas in the MVP).
export const CHECKERBOARD_VERTEX_SOURCE = `#version 300 es
precision highp float;

out vec2 v_texCoord;

void main() {
  // Two triangles covering the full NDC range [-1, 1] × [-1, 1].
  // gl_VertexID 0,1,2 = first triangle; 3,4,5 = second.
  // Standard NDC fullscreen quad layout (Y up).
  vec2 pos;
  if (gl_VertexID == 0) pos = vec2(-1.0, -1.0);
  else if (gl_VertexID == 1) pos = vec2( 1.0, -1.0);
  else if (gl_VertexID == 2) pos = vec2(-1.0,  1.0);
  else if (gl_VertexID == 3) pos = vec2(-1.0,  1.0);
  else if (gl_VertexID == 4) pos = vec2( 1.0, -1.0);
  else                  pos = vec2( 1.0,  1.0);

  v_texCoord = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
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
  // Screen-space checkerboard — independent of any transform state.
  vec2 pos = gl_FragCoord.xy / u_checkSize;
  float checker = mod(floor(pos.x) + floor(pos.y), 2.0);
  fragColor = mix(u_color1, u_color2, checker);
}`;
