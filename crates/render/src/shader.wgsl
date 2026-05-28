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

@fragment
fn fs_main(@location(0) in_tex_coords: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(texture, tex_sampler, in_tex_coords);
}
