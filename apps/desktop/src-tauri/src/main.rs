#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use serde::Serialize;
use serde_json::Value;
use photrez_core::document::Document;
use photrez_core::layers::Layer;
use photrez_core::history::HistoryStore;
use photrez_core::transform::Transform;

// Canonical Response Envelope definitions matching docs/15-command-contract-spec.md
#[derive(Serialize)]
struct ApiSuccessResponse {
    ok: bool,
    contract_version: String,
    data: Value,
}

#[derive(Serialize)]
struct ApiErrorPayload {
    code: String,
    message: String,
    details: Value,
}

#[derive(Serialize)]
struct ApiErrorResponse {
    ok: bool,
    contract_version: String,
    error: ApiErrorPayload,
}

struct EditorState {
    document: Mutex<Document>,
    history: Mutex<HistoryStore>,
}

impl EditorState {
    fn new() -> Self {
        let mut doc = Document::new("default-doc".to_string(), 800, 600);
        // Bootstrap with a default background layer
        let bg = Layer::new("layer-bg".to_string(), "Background".to_string(), 800, 600);
        doc.add_layer(bg);

        Self {
            document: Mutex::new(doc),
            history: Mutex::new(HistoryStore::new(50)),
        }
    }
}

// Helpers to format success/error envelopes
fn ok_response<T: Serialize>(data: T) -> Result<Value, Value> {
    let success = ApiSuccessResponse {
        ok: true,
        contract_version: "1.0.0".to_string(),
        data: serde_json::to_value(data).unwrap(),
    };
    Ok(serde_json::to_value(&success).unwrap())
}

fn err_response(code: &str, message: &str) -> Result<Value, Value> {
    let error = ApiErrorResponse {
        ok: false,
        contract_version: "1.0.0".to_string(),
        error: ApiErrorPayload {
            code: code.to_string(),
            message: message.to_string(),
            details: Value::Null,
        },
    };
    Err(serde_json::to_value(&error).unwrap())
}

#[tauri::command]
fn ping() -> Result<Value, Value> {
    ok_response(serde_json::json!({
        "status": "ok",
        "service": "core"
    }))
}

#[tauri::command]
fn get_contract_info() -> Result<Value, Value> {
    ok_response(serde_json::json!({
        "name": "photrez-command-contract",
        "version": "1.0.0",
        "supported_commands": [
            "ping",
            "get_contract_info",
            "get_document_state",
            "add_layer",
            "delete_layer",
            "reorder_layer",
            "update_layer",
            "undo",
            "redo",
            "create_selection",
            "clear_selection",
            "select_all",
            "move_layer",
            "transform_layer",
            "crop_canvas",
            "resize_canvas",
            "draw_brush_stroke"
        ]
    }))
}

#[tauri::command]
fn get_document_state(state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let doc = state.document.lock().unwrap();
    ok_response(&*doc)
}

#[tauri::command]
fn add_layer(name: String, state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();

    let width = doc.width;
    let height = doc.height;
    let additional_bytes = (width * height * 4) as usize;
    
    if doc.calculate_memory_usage() + additional_bytes > photrez_core::document::MAX_PIXEL_BUDGET {
        return err_response("E_RESOURCE_LIMIT", "Document memory exceeds max pixel budget of 256MB");
    }

    // Commit snapshot before modifying
    history.commit((*doc).clone());

    let id = format!("layer-{}", uuid::Uuid::new_v4().simple());
    let new_layer = Layer::new(id, name, width, height);
    
    doc.add_layer(new_layer);
    ok_response(&*doc)
}

#[tauri::command]
fn delete_layer(id: String, state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();

    if doc.layers.len() <= 1 {
        return err_response("CANNOT_DELETE_LAST_LAYER", "Cannot delete the only remaining layer");
    }

    history.commit((*doc).clone());

    match doc.delete_layer(&id) {
        Ok(_) => ok_response(&*doc),
        Err(e) => err_response("LAYER_NOT_FOUND", &e),
    }
}

#[tauri::command]
fn reorder_layer(from_idx: usize, to_idx: usize, state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();

    history.commit((*doc).clone());

    match doc.reorder_layer(from_idx, to_idx) {
        Ok(_) => ok_response(&*doc),
        Err(e) => err_response("INDEX_OUT_OF_BOUNDS", &e),
    }
}

#[tauri::command]
fn update_layer(
    id: String,
    opacity: Option<f32>,
    visible: Option<bool>,
    locked: Option<bool>,
    name: Option<String>,
    blend_mode: Option<String>,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();

    history.commit((*doc).clone());

    match doc.update_layer_properties(&id, opacity, visible, locked, name, blend_mode) {
        Ok(_) => ok_response(&*doc),
        Err(e) => err_response("LAYER_UPDATE_FAILED", &e),
    }
}

#[tauri::command]
fn undo(state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();

    if let Some(prev_state) = history.undo((*doc).clone()) {
        *doc = prev_state;
        ok_response(&*doc)
    } else {
        err_response("NO_UNDO_HISTORY", "No history available to undo")
    }
}

#[tauri::command]
fn create_selection(
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    if width <= 0.0 || height <= 0.0 {
        return err_response("E_VALIDATION", "Selection width and height must be positive");
    }

    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    doc.create_selection(x, y, width, height);
    ok_response(&*doc)
}

#[tauri::command]
fn clear_selection(state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    doc.clear_selection();
    ok_response(&*doc)
}

#[tauri::command]
fn select_all(state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    doc.select_all();
    ok_response(&*doc)
}

#[tauri::command]
fn move_layer(
    id: String,
    x: f32,
    y: f32,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    match doc.move_layer(&id, x, y) {
        Ok(_) => ok_response(&*doc),
        Err(e) => err_response("LAYER_NOT_FOUND", &e),
    }
}

#[tauri::command]
fn transform_layer(
    id: String,
    scale_x: f32,
    scale_y: f32,
    rotation: f32,
    flip_h: bool,
    flip_v: bool,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    if scale_x == 0.0 || scale_y == 0.0 {
        return err_response("E_VALIDATION", "Transform dimensions must be greater than zero");
    }

    let transform = Transform {
        scale_x,
        scale_y,
        rotation,
        flip_h,
        flip_v,
    };

    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    match doc.apply_transform(&id, transform) {
        Ok(_) => ok_response(&*doc),
        Err(e) => err_response("LAYER_NOT_FOUND", &e),
    }
}

#[tauri::command]
fn crop_canvas(
    x: f32,
    y: f32,
    width: u32,
    height: u32,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    match doc.crop_canvas(x, y, width, height) {
        Ok(_) => ok_response(&*doc),
        Err(e) => err_response("E_VALIDATION", &e),
    }
}

#[tauri::command]
fn resize_canvas(
    width: u32,
    height: u32,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    match doc.resize_canvas(width, height) {
        Ok(_) => ok_response(&*doc),
        Err(e) => err_response("E_VALIDATION", &e),
    }
}

#[tauri::command]
fn draw_brush_stroke(
    layer_id: String,
    path: Vec<(f32, f32)>,
    size: f32,
    hardness: f32,
    color: [f32; 4],
    is_eraser: bool,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    if path.is_empty() {
        return err_response("E_VALIDATION", "Stroke path cannot be empty");
    }

    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    let settings = photrez_core::brush::BrushSettings::new(size, hardness, color);
    
    if let Some(layer) = doc.layers.iter_mut().find(|l| l.id == layer_id) {
        layer.draw_brush_stroke(&path, &settings, is_eraser);
        ok_response(&*doc)
    } else {
        err_response("LAYER_NOT_FOUND", "Layer not found")
    }
}

#[tauri::command]
fn redo(state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();

    if let Some(next_state) = history.redo((*doc).clone()) {
        *doc = next_state;
        ok_response(&*doc)
    } else {
        err_response("NO_REDO_HISTORY", "No history available to redo")
    }
}

fn main() {
    println!("{}", photrez_core::init_core());
    println!("{}", photrez_render::init_render());

    tauri::Builder::default()
        .manage(EditorState::new())
        .invoke_handler(tauri::generate_handler![
            ping,
            get_contract_info,
            get_document_state,
            add_layer,
            delete_layer,
            reorder_layer,
            update_layer,
            undo,
            redo,
            create_selection,
            clear_selection,
            select_all,
            move_layer,
            transform_layer,
            crop_canvas,
            resize_canvas,
            draw_brush_stroke
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
