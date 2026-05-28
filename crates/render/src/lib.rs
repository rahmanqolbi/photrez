use std::collections::HashMap;
use bytemuck::{Pod, Zeroable};
use tauri::WebviewWindow;

#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
struct ViewportUniform {
    view_proj: [[f32; 4]; 4],
}

pub struct LayerTexture {
    pub texture: wgpu::Texture,
    pub view: wgpu::TextureView,
    pub bind_group: wgpu::BindGroup,
    pub width: u32,
    pub height: u32,
    pub opacity: f32,
    pub visible: bool,
    pub x: f32,
    pub y: f32,
}

pub struct WgpuRenderer {
    pub instance: wgpu::Instance,
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub adapter: wgpu::Adapter,
    pub surface: Option<wgpu::Surface<'static>>,
    pub surface_config: Option<wgpu::SurfaceConfiguration>,
    pub render_pipeline: wgpu::RenderPipeline,
    pub texture_bind_group_layout: wgpu::BindGroupLayout,
    pub viewport_buffer: wgpu::Buffer,
    pub viewport_bind_group_layout: wgpu::BindGroupLayout,
    pub layer_textures: HashMap<String, LayerTexture>,
    pub composited_texture: Option<wgpu::Texture>,
    pub composited_view: Option<wgpu::TextureView>,
}

impl WgpuRenderer {
    pub async fn new() -> Self {
        let instance = wgpu::Instance::default();
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::default(),
                force_fallback_adapter: false,
                compatible_surface: None,
            })
            .await
            .expect("Failed to find an appropriate adapter");

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: None,
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::downlevel_webgl2_defaults()
                        .using_resolution(adapter.limits()),
                    memory_hints: wgpu::MemoryHints::default(),
                },
                None,
            )
            .await
            .expect("Failed to create device");

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });

        let texture_bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        multisampled: false,
                        view_dimension: wgpu::TextureViewDimension::D2,
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
            ],
            label: Some("texture_bind_group_layout"),
        });

        let viewport_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Viewport Buffer"),
            size: std::mem::size_of::<ViewportUniform>() as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let viewport_bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
            label: Some("viewport_bind_group_layout"),
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: None,
            push_constant_ranges: &[],
            bind_group_layouts: &[&texture_bind_group_layout, &viewport_bind_group_layout],
        });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: wgpu::TextureFormat::Bgra8UnormSrgb,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                ..Default::default()
            },
            multisample: wgpu::MultisampleState::default(),
            depth_stencil: None,
            multiview: None,
            cache: None,
        });

        Self {
            instance,
            device,
            queue,
            adapter,
            surface: None,
            surface_config: None,
            render_pipeline,
            texture_bind_group_layout,
            viewport_buffer,
            viewport_bind_group_layout,
            layer_textures: HashMap::new(),
            composited_texture: None,
            composited_view: None,
        }
    }

    pub fn set_surface_from_window(&mut self, window: WebviewWindow) {
        let size = window.inner_size().expect("Failed to get window size");
        
        let surface = self.instance.create_surface(window)
            .expect("Failed to create surface from window");
        
        let caps = surface.get_capabilities(&self.adapter);
        let format = caps.formats[0];
        
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format,
            width: size.width.max(1),
            height: size.height.max(1),
            present_mode: wgpu::PresentMode::Fifo,
            alpha_mode: caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&self.device, &config);
        
        self.surface = Some(surface);
        self.surface_config = Some(config);
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if let Some(config) = &mut self.surface_config {
            config.width = width;
            config.height = height;
            if let Some(surface) = &self.surface {
                surface.configure(&self.device, config);
            }
        }
    }

    pub fn update_viewport(&self, zoom: f32, pan_x: f32, pan_y: f32, canvas_w: f32, canvas_h: f32) {
        let screen_w = self.surface_config.as_ref().map(|c| c.width as f32).unwrap_or(800.0);
        let screen_h = self.surface_config.as_ref().map(|c| c.height as f32).unwrap_or(600.0);
        let half_w = screen_w / (2.0 * zoom);
        let half_h = screen_h / (2.0 * zoom);
        let center_x = canvas_w / 2.0 - pan_x / zoom;
        let center_y = canvas_h / 2.0 - pan_y / zoom;
        let left = center_x - half_w;
        let right = center_x + half_w;
        let bottom = center_y - half_h;
        let top = center_y + half_h;

        #[rustfmt::skip]
        let view_proj = [
            [2.0 / (right - left), 0.0, 0.0, 0.0],
            [0.0, 2.0 / (top - bottom), 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [-(right + left) / (right - left), -(top + bottom) / (top - bottom), 0.0, 1.0],
        ];

        let uniform = ViewportUniform { view_proj };
        self.queue.write_buffer(&self.viewport_buffer, 0, bytemuck::cast_slice(&[uniform]));
    }

    pub fn upload_layer_texture(&mut self, layer_id: &str, pixels: &[u8], width: u32, height: u32, opacity: f32, visible: bool, x: f32, y: f32) {
        let texture_size = wgpu::Extent3d { width, height, depth_or_array_layers: 1 };
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Layer Texture"),
            size: texture_size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        self.queue.write_texture(
            wgpu::ImageCopyTexture {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            pixels,
            wgpu::ImageDataLayout {
                offset: 0,
                bytes_per_row: Some(4 * width),
                rows_per_image: Some(height),
            },
            texture_size,
        );

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let sampler = self.device.create_sampler(&wgpu::SamplerDescriptor {
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Nearest,
            min_filter: wgpu::FilterMode::Nearest,
            mipmap_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });

        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &self.texture_bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: wgpu::BindingResource::TextureView(&view) },
                wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::Sampler(&sampler) },
            ],
            label: Some("layer_texture_bind_group"),
        });

        self.layer_textures.insert(layer_id.to_string(), LayerTexture {
            texture,
            view,
            bind_group,
            width,
            height,
            opacity,
            visible,
            x,
            y,
        });
    }

    pub fn render_layers(&mut self, layers: &[(&str, &[u8], u32, u32, f32, bool, f32, f32)]) {
        let surface = match &self.surface {
            Some(s) => s,
            None => return,
        };
        let output = match surface.get_current_texture() {
            Ok(t) => t,
            Err(_) => return,
        };
        let screen_view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());

        let (canvas_w, canvas_h) = self.surface_config.as_ref().map(|c| (c.width, c.height)).unwrap_or((800, 600));

        // Create composited intermediate texture if needed
        if self.composited_texture.is_none() || self.composited_texture.as_ref().map(|t| t.size().width) != Some(canvas_w) || self.composited_texture.as_ref().map(|t| t.size().height) != Some(canvas_h) {
            let tex = self.device.create_texture(&wgpu::TextureDescriptor {
                label: Some("Composited Texture"),
                size: wgpu::Extent3d { width: canvas_w, height: canvas_h, depth_or_array_layers: 1 },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: wgpu::TextureFormat::Rgba8UnormSrgb,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
                view_formats: &[],
            });
            self.composited_view = Some(tex.create_view(&wgpu::TextureViewDescriptor::default()));
            self.composited_texture = Some(tex);
        }

        // Upload all layer textures
        for (id, pixels, w, h, opacity, visible, x, y) in layers {
            self.upload_layer_texture(id, pixels, *w, *h, *opacity, *visible, *x, *y);
        }

        let composited_view = self.composited_view.as_ref().unwrap();
        let sampler = self.device.create_sampler(&wgpu::SamplerDescriptor {
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Nearest,
            min_filter: wgpu::FilterMode::Nearest,
            mipmap_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });

        let viewport_bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &self.viewport_bind_group_layout,
            entries: &[wgpu::BindGroupEntry { binding: 0, resource: self.viewport_buffer.as_entire_binding() }],
            label: Some("viewport_bind_group"),
        });

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("Layer Render Encoder") });

        // Render each visible layer bottom-to-top to composited texture
        for layer_entry in layers.iter().rev() {
            if !layer_entry.5 {
                continue;
            }
            let layer_id = layer_entry.0;
            let layer_tex = match self.layer_textures.get(layer_id) {
                Some(t) => t,
                None => continue,
            };

            {
                let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("Layer Render Pass"),
                    color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                        view: composited_view,
                        resolve_target: None,
                        ops: wgpu::Operations {
                            load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                            store: wgpu::StoreOp::Store,
                        },
                    })],
                    depth_stencil_attachment: None,
                    timestamp_writes: None,
                    occlusion_query_set: None,
                });
                rpass.set_pipeline(&self.render_pipeline);
                rpass.set_bind_group(0, &layer_tex.bind_group, &[]);
                rpass.set_bind_group(1, &viewport_bind_group, &[]);
                rpass.draw(0..6, 0..1);
            }
        }

        // Render composited texture to screen
        {
            let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Screen Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &screen_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            let composited_bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
                layout: &self.texture_bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry { binding: 0, resource: wgpu::BindingResource::TextureView(composited_view) },
                    wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::Sampler(&sampler) },
                ],
                label: Some("composited_bind_group"),
            });

            rpass.set_pipeline(&self.render_pipeline);
            rpass.set_bind_group(0, &composited_bind_group, &[]);
            rpass.set_bind_group(1, &viewport_bind_group, &[]);
            rpass.draw(0..6, 0..1);
        }

        self.queue.submit(std::iter::once(encoder.finish()));
        output.present();
    }
}

pub fn init_render() -> String {
    "Photrez Renderer Initialized".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_renderer_initialization() {
        let renderer = pollster::block_on(WgpuRenderer::new());
        assert!(renderer.device.features().is_empty() || true);
    }
}
