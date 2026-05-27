use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    PNG,
    JPEG,
    WebP,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSettings {
    pub format: ExportFormat,
    pub quality: u8, // 1 to 100
}

impl ExportSettings {
    pub fn new(format: ExportFormat, quality: u8) -> Self {
        Self { format, quality }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_settings() {
        let settings = ExportSettings::new(ExportFormat::PNG, 100);
        assert_eq!(settings.quality, 100);
    }
}
