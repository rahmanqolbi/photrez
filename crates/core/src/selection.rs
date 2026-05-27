use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionRect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionState {
    pub current_selection: Option<SelectionRect>,
}

impl SelectionState {
    pub fn new() -> Self {
        Self {
            current_selection: None,
        }
    }

    pub fn set_selection(&mut self, rect: SelectionRect) {
        self.current_selection = Some(rect);
    }

    pub fn clear_selection(&mut self) {
        self.current_selection = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_selection() {
        let mut state = SelectionState::new();
        assert!(state.current_selection.is_none());

        state.set_selection(SelectionRect {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        });

        assert!(state.current_selection.is_some());
        let rect = state.current_selection.as_ref().unwrap();
        assert_eq!(rect.width, 100.0);
    }
}
