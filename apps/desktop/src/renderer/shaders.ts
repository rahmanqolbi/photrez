// Vertex shader: Fullscreen quad with view projection matrix transforms
// Handles center-anchored flip, rotation, and scale.
// u_layerRect.zw = effective pixel dimensions (layerWidth * scaleX, layerHeight * scaleY)
// u_flipSign = (±1, ±1) — from flipH/flipV booleans only (not from scaleX sign)
export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform mat4 u_viewProj;
uniform vec4 u_layerRect;   // x, y, effWidth, effHeight
uniform vec2 u_layerCenter; // center of layer (rotation/flip pivot)
uniform float u_layerRotation; // degrees, CW (Photoshop convention)
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

  // Rotation — negate for CW (Photoshop convention)
  float rad = -radians(u_layerRotation);
  float c = cos(rad);
  float s = sin(rad);
  vec2 rotated = vec2(
    centered.x * c - centered.y * s,
    centered.x * s + centered.y * c
  );

  // Translate to document position
  gl_Position = u_viewProj * vec4(rotated + u_layerCenter, 0.0, 1.0);
}`;

// Fragment shader: Texture sampling with opacity
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
uniform mat4 u_viewProj; // Optional viewport alignment if requested

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  // Simple screen-space checkerboard
  vec2 pos = gl_FragCoord.xy / u_checkSize;
  float checker = mod(floor(pos.x) + floor(pos.y), 2.0);
  fragColor = mix(u_color1, u_color2, checker);
}`;
