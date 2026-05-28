use serde::{Deserialize, Serialize};
use crate::layers::Layer;
use crate::selection::SelectionRect;
use crate::transform::Transform;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Document {
    pub id: String,
    pub width: u32,
    pub height: u32,
    pub layers: Vec<Layer>,
    pub selection: Option<SelectionRect>,
}

pub const MAX_PIXEL_BUDGET: usize = 268_435_456; // 256 MB in bytes

impl Document {
    pub fn new(id: String, width: u32, height: u32) -> Self {
        Self {
            id,
            width,
            height,
            layers: Vec::new(),
            selection: None,
        }
    }

    pub fn calculate_memory_usage(&self) -> usize {
        self.layers.iter().map(|l| (l.width * l.height * 4) as usize).sum()
    }

    pub fn add_layer_safe(&mut self, layer: Layer) -> Result<(), String> {
        let additional_bytes = (layer.width * layer.height * 4) as usize;
        let current_bytes = self.calculate_memory_usage();
        if current_bytes + additional_bytes > MAX_PIXEL_BUDGET {
            return Err("E_RESOURCE_LIMIT: Document memory exceeds max pixel budget of 256MB".to_string());
        }
        // Insert at index 0 (top of the layer stack) to match high-fidelity design standards
        self.layers.insert(0, layer);
        Ok(())
    }

    pub fn add_layer(&mut self, layer: Layer) {
        let _ = self.add_layer_safe(layer);
    }

    pub fn delete_layer(&mut self, id: &str) -> Result<Layer, String> {
        let index = self.layers.iter().position(|l| l.id == id)
            .ok_or_else(|| format!("Layer with id '{}' not found", id))?;
        Ok(self.layers.remove(index))
    }

    pub fn reorder_layer(&mut self, from_idx: usize, to_idx: usize) -> Result<(), String> {
        if from_idx >= self.layers.len() || to_idx >= self.layers.len() {
            return Err("Index out of bounds".to_string());
        }
        let layer = self.layers.remove(from_idx);
        self.layers.insert(to_idx, layer);
        Ok(())
    }

    pub fn update_layer_properties(
        &mut self,
        id: &str,
        opacity: Option<f32>,
        visible: Option<bool>,
        locked: Option<bool>,
        name: Option<String>,
        blend_mode: Option<String>,
    ) -> Result<(), String> {
        let layer = self.layers.iter_mut().find(|l| l.id == id)
            .ok_or_else(|| format!("Layer with id '{}' not found", id))?;

        if let Some(o) = opacity {
            layer.opacity = o.clamp(0.0, 1.0);
        }
        if let Some(v) = visible {
            layer.visible = v;
        }
        if let Some(l) = locked {
            layer.locked = l;
        }
        if let Some(n) = name {
            layer.name = n;
        }
        if let Some(bm) = blend_mode {
            layer.blend_mode = bm;
        }
        Ok(())
    }

    // ── Selection Operations ──

    pub fn create_selection(&mut self, x: f32, y: f32, width: f32, height: f32) {
        let rect = SelectionRect { x, y, width, height }.normalize();
        let clamped = rect.clamp_to_canvas(self.width, self.height);
        self.selection = Some(clamped);
    }

    pub fn clear_selection(&mut self) {
        self.selection = None;
    }

    pub fn select_all(&mut self) {
        let rect = SelectionRect {
            x: 0.0,
            y: 0.0,
            width: self.width as f32,
            height: self.height as f32,
        };
        self.selection = Some(rect);
    }

    pub fn move_selection(&mut self, dx: f32, dy: f32) -> Option<SelectionRect> {
        let rect = self.selection.as_ref()?;
        let moved = rect.translate(dx, dy);
        let clamped = moved.clamp_to_canvas(self.width, self.height);
        self.selection = Some(clamped);
        self.selection
    }

    // ── Layer Transform Operations ──

    pub fn move_layer(&mut self, id: &str, x: f32, y: f32) -> Result<(), String> {
        let layer = self.layers.iter_mut().find(|l| l.id == id)
            .ok_or_else(|| format!("Layer with id '{}' not found", id))?;
        layer.x = x;
        layer.y = y;
        Ok(())
    }

    pub fn apply_transform(&mut self, id: &str, transform: Transform) -> Result<(), String> {
        let layer = self.layers.iter_mut().find(|l| l.id == id)
            .ok_or_else(|| format!("Layer with id '{}' not found", id))?;
        layer.transform = transform;
        Ok(())
    }

    pub fn get_layer_transform(&self, id: &str) -> Option<Transform> {
        self.layers.iter().find(|l| l.id == id).map(|l| l.transform)
    }

    pub fn get_layer_by_id(&self, id: &str) -> Option<&Layer> {
        self.layers.iter().find(|l| l.id == id)
    }

    pub fn crop_canvas(&mut self, x: f32, y: f32, width: u32, height: u32) -> Result<(), String> {
        if width == 0 || height == 0 {
            return Err("Crop dimensions must be greater than zero".to_string());
        }
        self.width = width;
        self.height = height;
        for layer in self.layers.iter_mut() {
            layer.x -= x;
            layer.y -= y;
        }
        self.selection = None; // Clear selection after crop
        Ok(())
    }

    pub fn resize_canvas(&mut self, width: u32, height: u32) -> Result<(), String> {
        if width == 0 || height == 0 {
            return Err("Canvas dimensions must be greater than zero".to_string());
        }
        self.width = width;
        self.height = height;
        Ok(())
    }

    pub fn sample_pixel(&self, x: f32, y: f32) -> [u8; 4] {
        let ix = x.floor() as i32;
        let iy = y.floor() as i32;
        
        if ix < 0 || ix >= self.width as i32 || iy < 0 || iy >= self.height as i32 {
            return [0, 0, 0, 0]; // Transparent black out of bounds
        }
        
        let mut blended = [0f32; 4];
        
        // Reverse order: blend bottom (N-1) to top (0)
        for layer in self.layers.iter().rev() {
            if !layer.visible {
                continue;
            }
            
            let lx = ix - layer.x as i32;
            let ly = iy - layer.y as i32;
            
            if lx >= 0 && lx < layer.width as i32 && ly >= 0 && ly < layer.height as i32 {
                let idx = ((ly * layer.width as i32 + lx) * 4) as usize;
                let src_r = layer.bitmap_ref.pixel_data[idx] as f32 / 255.0;
                let src_g = layer.bitmap_ref.pixel_data[idx + 1] as f32 / 255.0;
                let src_b = layer.bitmap_ref.pixel_data[idx + 2] as f32 / 255.0;
                let src_a = layer.bitmap_ref.pixel_data[idx + 3] as f32 / 255.0 * layer.opacity;
                
                if src_a <= 0.0 {
                    continue;
                }
                
                let dest_r = blended[0];
                let dest_g = blended[1];
                let dest_b = blended[2];
                let dest_a = blended[3];
                
                let out_a = src_a + dest_a * (1.0 - src_a);
                let out_r = if out_a > 0.0 {
                    (src_r * src_a + dest_r * dest_a * (1.0 - src_a)) / out_a
                } else {
                    0.0
                };
                let out_g = if out_a > 0.0 {
                    (src_g * src_a + dest_g * dest_a * (1.0 - src_a)) / out_a
                } else {
                    0.0
                };
                let out_b = if out_a > 0.0 {
                    (src_b * src_a + dest_b * dest_a * (1.0 - src_a)) / out_a
                } else {
                    0.0
                };
                
                blended = [out_r, out_g, out_b, out_a];
            }
        }
        
        [
            (blended[0] * 255.0).round().min(255.0) as u8,
            (blended[1] * 255.0).round().min(255.0) as u8,
            (blended[2] * 255.0).round().min(255.0) as u8,
            (blended[3] * 255.0).round().min(255.0) as u8,
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_document() {
        let doc = Document::new("doc-123".to_string(), 1920, 1080);
        assert_eq!(doc.id, "doc-123");
        assert_eq!(doc.width, 1920);
        assert_eq!(doc.height, 1080);
        assert_eq!(doc.layers.len(), 0);
    }

    #[test]
    fn test_layer_operations() {
        let mut doc = Document::new("doc-1".to_string(), 1000, 1000);
        let l1 = Layer::new("l-1".to_string(), "Layer 1".to_string(), 500, 500);
        let l2 = Layer::new("l-2".to_string(), "Layer 2".to_string(), 500, 500);

        doc.add_layer(l1);
        doc.add_layer(l2);

        // Since we insert at 0, "l-2" should be first (top of stack)
        assert_eq!(doc.layers[0].id, "l-2");
        assert_eq!(doc.layers[1].id, "l-1");

        // Test update properties
        let update_res = doc.update_layer_properties(
            "l-2",
            Some(0.5),
            Some(false),
            Some(true),
            Some("New Layer 2 Name".to_string()),
            Some("multiply".to_string()),
        );
        assert!(update_res.is_ok());
        assert_eq!(doc.layers[0].opacity, 0.5);
        assert!(!doc.layers[0].visible);
        assert!(doc.layers[0].locked);
        assert_eq!(doc.layers[0].name, "New Layer 2 Name");
        assert_eq!(doc.layers[0].blend_mode, "multiply");

        // Test reorder layers
        let reorder_res = doc.reorder_layer(0, 1);
        assert!(reorder_res.is_ok());
        assert_eq!(doc.layers[0].id, "l-1");
        assert_eq!(doc.layers[1].id, "l-2");

        // Test delete layer
        let delete_res = doc.delete_layer("l-1");
        assert!(delete_res.is_ok());
        assert_eq!(doc.layers.len(), 1);
        assert_eq!(doc.layers[0].id, "l-2");
    }

    #[test]
    fn test_memory_budget_under_limit() {
        let mut doc = Document::new("doc-budget-ok".to_string(), 1920, 1080);
        let l1 = Layer::new("layer-ok-1".to_string(), "Layer 1".to_string(), 800, 600);
        let l2 = Layer::new("layer-ok-2".to_string(), "Layer 2".to_string(), 800, 600);

        let r1 = doc.add_layer_safe(l1);
        let r2 = doc.add_layer_safe(l2);

        assert!(r1.is_ok());
        assert!(r2.is_ok());
        assert_eq!(doc.calculate_memory_usage(), (800 * 600 * 4 * 2) as usize);
    }

    #[test]
    fn test_memory_budget_over_limit() {
        let mut doc = Document::new("doc-budget-fail".to_string(), 1000, 1000);
        let huge_layer = Layer::new("layer-huge".to_string(), "Huge".to_string(), 10000, 8000);

        let res = doc.add_layer_safe(huge_layer);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("E_RESOURCE_LIMIT"));
    }

    #[test]
    fn test_selection_operations() {
        let mut doc = Document::new("doc-sel".to_string(), 800, 600);
        assert!(doc.selection.is_none());

        doc.create_selection(100.0, 50.0, 300.0, 200.0);
        assert!(doc.selection.is_some());
        let sel = doc.selection.unwrap();
        assert_eq!(sel.x, 100.0);
        assert_eq!(sel.y, 50.0);

        doc.clear_selection();
        assert!(doc.selection.is_none());
    }

    #[test]
    fn test_select_all() {
        let mut doc = Document::new("doc-all".to_string(), 800, 600);
        doc.select_all();
        let sel = doc.selection.unwrap();
        assert_eq!(sel.width, 800.0);
        assert_eq!(sel.height, 600.0);
    }

    #[test]
    fn test_move_layer() {
        let mut doc = Document::new("doc-move".to_string(), 1000, 1000);
        let l1 = Layer::new("l-1".to_string(), "Layer 1".to_string(), 500, 500);
        doc.add_layer(l1);

        let res = doc.move_layer("l-1", 100.0, 200.0);
        assert!(res.is_ok());
        assert_eq!(doc.layers[0].x, 100.0);
        assert_eq!(doc.layers[0].y, 200.0);
    }

    #[test]
    fn test_crop_canvas() {
        let mut doc = Document::new("doc-crop".to_string(), 800, 600);
        let l1 = Layer::new("l-1".to_string(), "Layer 1".to_string(), 100, 100);
        doc.add_layer(l1);
        doc.layers[0].x = 50.0;
        doc.layers[0].y = 50.0;

        let res = doc.crop_canvas(10.0, 10.0, 500, 400);
        assert!(res.is_ok());
        assert_eq!(doc.width, 500);
        assert_eq!(doc.height, 400);
        assert_eq!(doc.layers[0].x, 40.0);
        assert_eq!(doc.layers[0].y, 40.0);
    }

    #[test]
    fn test_resize_canvas() {
        let mut doc = Document::new("doc-resize".to_string(), 800, 600);
        let res = doc.resize_canvas(1024, 768);
        assert!(res.is_ok());
        assert_eq!(doc.width, 1024);
        assert_eq!(doc.height, 768);
    }

    #[test]
    fn test_sample_pixel() {
        let mut doc = Document::new("doc-1".to_string(), 2, 2);
        
        let mut l1 = Layer::new("l-1".to_string(), "Layer 1".to_string(), 2, 2);
        l1.bitmap_ref.pixel_data = vec![
            255, 0, 0, 255,   255, 0, 0, 255,
            255, 0, 0, 255,   255, 0, 0, 255,
        ];
        doc.add_layer(l1);
        
        let color = doc.sample_pixel(1.0, 1.0);
        assert_eq!(color, [255, 0, 0, 255]); // Sampled Red Background color
    }

    #[test]
    fn test_apply_transform() {
        let mut doc = Document::new("doc-1".to_string(), 100, 100);
        let layer = Layer::new("layer-1".to_string(), "Test".to_string(), 100, 100);
        doc.add_layer(layer);

        let transform = Transform {
            scale_x: 2.0,
            scale_y: 2.0,
            rotation: 45.0,
            flip_h: true,
            flip_v: false,
        };

        let result = doc.apply_transform("layer-1", transform);
        assert!(result.is_ok());

        let t = doc.get_layer_transform("layer-1").unwrap();
        assert_eq!(t.scale_x, 2.0);
        assert_eq!(t.scale_y, 2.0);
        assert_eq!(t.rotation, 45.0);
        assert!(t.flip_h);
        assert!(!t.flip_v);
    }

    #[test]
    fn test_apply_transform_nonexistent_layer() {
        let mut doc = Document::new("doc-1".to_string(), 100, 100);
        let transform = Transform::new();
        let result = doc.apply_transform("nonexistent", transform);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_layer_transform_nonexistent() {
        let doc = Document::new("doc-1".to_string(), 100, 100);
        let result = doc.get_layer_transform("nonexistent");
        assert!(result.is_none());
    }

    #[test]
    fn test_delete_layer_nonexistent() {
        let mut doc = Document::new("doc-1".to_string(), 100, 100);
        let layer = Layer::new("layer-1".to_string(), "Test".to_string(), 100, 100);
        doc.add_layer(layer);
        let result = doc.delete_layer("nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn test_reorder_layer_out_of_bounds() {
        let mut doc = Document::new("doc-1".to_string(), 100, 100);
        let layer = Layer::new("layer-1".to_string(), "Test".to_string(), 100, 100);
        doc.add_layer(layer);
        let result = doc.reorder_layer(0, 999);
        assert!(result.is_err());
    }

    #[test]
    fn test_update_layer_nonexistent() {
        let mut doc = Document::new("doc-1".to_string(), 100, 100);
        let result = doc.update_layer_properties("nonexistent", Some(0.5), None, None, None, None);
        assert!(result.is_err());
    }

    #[test]
    fn test_move_layer_nonexistent() {
        let mut doc = Document::new("doc-1".to_string(), 100, 100);
        let result = doc.move_layer("nonexistent", 50.0, 50.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_crop_canvas_zero_dimensions() {
        let mut doc = Document::new("doc-1".to_string(), 100, 100);
        let layer = Layer::new("layer-1".to_string(), "Test".to_string(), 100, 100);
        doc.add_layer(layer);
        let result = doc.crop_canvas(0.0, 0.0, 0, 0);
        assert!(result.is_err());
    }

    #[test]
    fn test_resize_canvas_zero_dimensions() {
        let mut doc = Document::new("doc-1".to_string(), 100, 100);
        let result = doc.resize_canvas(0, 0);
        assert!(result.is_err());
    }
}
