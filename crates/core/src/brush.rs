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
