// ─── Window State Persistence ───
//
// Saves and restores window size, position, and maximized state across
// app launches. Written to `<app_config_dir>/window-state.json`.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Manager, Runtime};

pub(crate) const DEFAULT_WINDOW_WIDTH: u32 = 1280;
pub(crate) const DEFAULT_WINDOW_HEIGHT: u32 = 832;
const WINDOW_STATE_FILENAME: &str = "window-state.json";

const MIN_DIMENSION: u32 = 320;
const MAX_DIMENSION: u32 = 16384;
const MIN_POSITION: i32 = -32768;
const MAX_POSITION: i32 = 32768;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct SavedWindowState {
    pub width: u32,
    pub height: u32,
    #[serde(default)]
    pub x: Option<i32>,
    #[serde(default)]
    pub y: Option<i32>,
    pub maximized: bool,
}

impl Default for SavedWindowState {
    fn default() -> Self {
        Self {
            width: DEFAULT_WINDOW_WIDTH,
            height: DEFAULT_WINDOW_HEIGHT,
            x: None,
            y: None,
            maximized: false,
        }
    }
}

pub(crate) fn validate_window_state(mut state: SavedWindowState) -> SavedWindowState {
    state.width = state.width.clamp(MIN_DIMENSION, MAX_DIMENSION);
    state.height = state.height.clamp(MIN_DIMENSION, MAX_DIMENSION);
    if let Some(x) = state.x {
        state.x = Some(x.clamp(MIN_POSITION, MAX_POSITION));
    }
    if let Some(y) = state.y {
        state.y = Some(y.clamp(MIN_POSITION, MAX_POSITION));
    }
    state
}

fn window_state_path<R: Runtime>(app: &tauri::AppHandle<R>) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(WINDOW_STATE_FILENAME))
}

pub(crate) fn load_window_state<R: Runtime>(app: &tauri::AppHandle<R>) -> SavedWindowState {
    let Some(path) = window_state_path(app) else {
        return SavedWindowState::default();
    };
    match std::fs::read_to_string(&path) {
        Ok(json) => serde_json::from_str::<SavedWindowState>(&json)
            .map(validate_window_state)
            .unwrap_or_default(),
        Err(_) => SavedWindowState::default(),
    }
}

pub(crate) fn save_window_state<R: Runtime>(window: &tauri::Window<R>) {
    let Some(path) = window_state_path(window.app_handle()) else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let (size, pos, maximized) = match (
        window.inner_size(),
        window.outer_position(),
        window.is_maximized(),
    ) {
        (Ok(s), Ok(p), Ok(m)) => (s, p, m),
        _ => return,
    };
    let state = SavedWindowState {
        width: size.width,
        height: size.height,
        x: Some(pos.x),
        y: Some(pos.y),
        maximized,
    };
    if let Ok(json) = serde_json::to_string_pretty(&state) {
        let _ = std::fs::write(&path, json);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_state_roundtrip() {
        let original = SavedWindowState {
            width: 1600,
            height: 900,
            x: Some(120),
            y: Some(80),
            maximized: false,
        };
        let json = serde_json::to_string_pretty(&original).expect("serialize");
        let parsed: SavedWindowState = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(parsed.width, original.width);
        assert_eq!(parsed.height, original.height);
        assert_eq!(parsed.x, original.x);
        assert_eq!(parsed.y, original.y);
        assert_eq!(parsed.maximized, original.maximized);
    }

    #[test]
    fn test_window_state_default_matches_tauri_config() {
        let defaults = SavedWindowState::default();
        assert_eq!(defaults.width, DEFAULT_WINDOW_WIDTH);
        assert_eq!(defaults.height, DEFAULT_WINDOW_HEIGHT);
        assert_eq!(defaults.x, None, "first launch should not force position");
        assert_eq!(defaults.y, None, "first launch should not force position");
        assert!(!defaults.maximized);
    }

    #[test]
    fn test_window_state_legacy_format_without_optional_position() {
        let legacy_json = r#"{ "width": 1024, "height": 768, "maximized": false }"#;
        let parsed: SavedWindowState = serde_json::from_str(legacy_json).expect("deserialize");
        assert_eq!(parsed.width, 1024);
        assert_eq!(parsed.height, 768);
        assert_eq!(parsed.x, None);
        assert_eq!(parsed.y, None);
        assert!(!parsed.maximized);
    }

    #[test]
    fn test_window_state_clamps_out_of_range_values() {
        let json = r#"{
            "width": 99999999,
            "height": 1,
            "x": -99999,
            "y": 99999,
            "maximized": false
        }"#;
        let parsed: SavedWindowState = serde_json::from_str(json).expect("deserialize");
        let clamped = validate_window_state(parsed);
        assert_eq!(clamped.width, MAX_DIMENSION, "width clamped to max");
        assert_eq!(clamped.height, MIN_DIMENSION, "height clamped to min");
        assert_eq!(clamped.x, Some(MIN_POSITION), "x clamped to min");
        assert_eq!(clamped.y, Some(MAX_POSITION), "y clamped to max");
    }

    #[test]
    fn test_window_state_in_range_values_pass_through() {
        let json = r#"{
            "width": 1600,
            "height": 900,
            "x": 120,
            "y": 80,
            "maximized": false
        }"#;
        let parsed: SavedWindowState = serde_json::from_str(json).expect("deserialize");
        let clamped = validate_window_state(parsed);
        assert_eq!(clamped.width, 1600);
        assert_eq!(clamped.height, 900);
        assert_eq!(clamped.x, Some(120));
        assert_eq!(clamped.y, Some(80));
    }
}
