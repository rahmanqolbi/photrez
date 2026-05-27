use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Transform {
    pub scale_x: f32,
    pub scale_y: f32,
    pub rotation: f32, // rotation in degrees
    pub flip_h: bool,
    pub flip_v: bool,
}

impl Transform {
    pub fn new() -> Self {
        Self {
            scale_x: 1.0,
            scale_y: 1.0,
            rotation: 0.0,
            flip_h: false,
            flip_v: false,
        }
    }

    pub fn rotate(&mut self, degrees: f32) {
        self.rotation = (self.rotation + degrees) % 360.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transform() {
        let mut transform = Transform::new();
        assert_eq!(transform.rotation, 0.0);
        
        transform.rotate(45.0);
        assert_eq!(transform.rotation, 45.0);

        transform.rotate(360.0);
        assert_eq!(transform.rotation, 45.0);
    }
}
