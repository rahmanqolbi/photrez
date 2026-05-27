use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub id: String,
    pub name: String,
    pub opacity: f32,
    pub visible: bool,
    pub locked: bool,
}

impl Layer {
    pub fn new(id: String, name: String) -> Self {
        Self {
            id,
            name,
            opacity: 1.0,
            visible: true,
            locked: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_layer() {
        let layer = Layer::new("layer-1".to_string(), "Background".to_string());
        assert_eq!(layer.id, "layer-1");
        assert_eq!(layer.name, "Background");
        assert_eq!(layer.opacity, 1.0);
        assert!(layer.visible);
        assert!(!layer.locked);
    }
}
