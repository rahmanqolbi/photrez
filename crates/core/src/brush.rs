use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrushSettings {
    pub size: f32,
    pub hardness: f32,
    pub color: [f32; 4], // RGBA
}

impl BrushSettings {
    pub fn new(size: f32, hardness: f32, color: [f32; 4]) -> Self {
        Self { size, hardness, color }
    }

    pub fn paint_pixel(&self, pixel: &mut [u8], dist: f32) {
        let r = self.size / 2.0;
        let hardness_r = r * self.hardness;
        
        let alpha_factor = if dist <= hardness_r {
            1.0
        } else if dist < r {
            if r > hardness_r {
                1.0 - (dist - hardness_r) / (r - hardness_r)
            } else {
                1.0
            }
        } else {
            0.0
        };
        
        let brush_alpha = self.color[3] * alpha_factor;
        if brush_alpha <= 0.0 {
            return;
        }
        
        let src_r = (self.color[0] * 255.0) as u32;
        let src_g = (self.color[1] * 255.0) as u32;
        let src_b = (self.color[2] * 255.0) as u32;
        
        let dest_r = pixel[0] as u32;
        let dest_g = pixel[1] as u32;
        let dest_b = pixel[2] as u32;
        let dest_a = pixel[3] as u32;
        
        let out_r = ((src_r as f32 * brush_alpha) + (dest_r as f32 * (1.0 - brush_alpha))) as u8;
        let out_g = ((src_g as f32 * brush_alpha) + (dest_g as f32 * (1.0 - brush_alpha))) as u8;
        let out_b = ((src_b as f32 * brush_alpha) + (dest_b as f32 * (1.0 - brush_alpha))) as u8;
        let out_a = ((brush_alpha * 255.0) + (dest_a as f32 * (1.0 - brush_alpha))) as u8;
        
        pixel[0] = out_r;
        pixel[1] = out_g;
        pixel[2] = out_b;
        pixel[3] = out_a;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_brush_settings() {
        let settings = BrushSettings::new(10.0, 0.5, [1.0, 1.0, 1.0, 1.0]);
        assert_eq!(settings.size, 10.0);
        assert_eq!(settings.hardness, 0.5);
    }
}
