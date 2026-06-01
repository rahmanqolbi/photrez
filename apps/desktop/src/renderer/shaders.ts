// Vertex shader: Fullscreen quad with view projection matrix transforms
export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform mat4 u_viewProj;
uniform vec4 u_layerRect;  // x, y, width, height in document space

out vec2 v_texCoord;

void main() {
  // Generate fullscreen quad vertices (0,1,2,3,4,5 -> 2 triangles)
  vec2 positions[6] = vec2[6](
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0)
  );

  vec2 pos = positions[gl_VertexID];
  v_texCoord = vec2(pos.x, pos.y); // Y-axis already handled by view matrix flip

  // Map to layer position in document coordinates
  vec2 docPos = u_layerRect.xy + pos * u_layerRect.zw;

  // Apply view-projection matrix (pan/zoom)
  gl_Position = u_viewProj * vec4(docPos, 0.0, 1.0);
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
