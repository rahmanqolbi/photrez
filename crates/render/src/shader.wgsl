// Multi-layer compositing shader
// Each layer is a texture with its own transform and opacity

struct LayerData {
    transform: mat4x4<f32>,
    opacity: f32,
    visible: u32,
    pad1: u32,
    pad2: u32,
};

@group(0) @binding(0) var texture: texture_2d<f32>;
@group(0) @binding(1) var tex_sampler: sampler;

struct ViewportUniform {
    view_proj: mat4x4<f32>,
};
@group(1) @binding(0) var<uniform> viewport: ViewportUniform;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> VertexOutput {
    var out: VertexOutput;
    switch (in_vertex_index) {
        case 0u: { out.position = vec4<f32>(-1.0, -1.0, 0.0, 1.0); out.tex_coords = vec2<f32>(0.0, 1.0); }
        case 1u: { out.position = vec4<f32>(1.0, -1.0, 0.0, 1.0); out.tex_coords = vec2<f32>(1.0, 1.0); }
        case 2u: { out.position = vec4<f32>(-1.0, 1.0, 0.0, 1.0); out.tex_coords = vec2<f32>(0.0, 0.0); }
        case 3u: { out.position = vec4<f32>(1.0, -1.0, 0.0, 1.0); out.tex_coords = vec2<f32>(1.0, 1.0); }
        case 4u: { out.position = vec4<f32>(-1.0, 1.0, 0.0, 1.0); out.tex_coords = vec2<f32>(0.0, 0.0); }
        case 5u: { out.position = vec4<f32>(1.0, 1.0, 0.0, 1.0); out.tex_coords = vec2<f32>(1.0, 0.0); }
        default: { out.position = vec4<f32>(0.0, 0.0, 0.0, 1.0); out.tex_coords = vec2<f32>(0.0, 0.0); }
    }
    out.position = viewport.view_proj * out.position;
    return out;
}

fn alpha_blend(src: vec4<f32>, dst: vec4<f32>) -> vec4<f32> {
    let out_a = src.a + dst.a * (1.0 - src.a);
    if (out_a <= 0.0) {
        return vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
    return vec4<f32>(
        (src.r * src.a + dst.r * dst.a * (1.0 - src.a)) / out_a,
        (src.g * src.a + dst.g * dst.a * (1.0 - src.a)) / out_a,
        (src.b * src.a + dst.b * dst.a * (1.0 - src.a)) / out_a,
        out_a
    );
}

@fragment
fn fs_main(@location(0) in_tex_coords: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(texture, tex_sampler, in_tex_coords);
}
