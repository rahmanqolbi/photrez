use serde::{Deserialize, Serialize};
use crate::layers::Layer;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub width: u32,
    pub height: u32,
    pub layers: Vec<Layer>,
}

impl Document {
    pub fn new(id: String, width: u32, height: u32) -> Self {
        Self {
            id,
            width,
            height,
            layers: Vec::new(),
        }
    }

    pub fn add_layer(&mut self, layer: Layer) {
        self.layers.push(layer);
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
}
