#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use serde::Serialize;
use serde_json::Value;
use photrez_core::document::Document;
use photrez_core::layers::Layer;
use photrez_core::history::HistoryStore;
use photrez_core::transform::Transform;
use tauri::Manager;

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

struct WgpuState {
    renderer: Mutex<photrez_render::WgpuRenderer>,
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
            "draw_brush_stroke",
            "export_document",
            "sample_pixel"
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
fn export_document(
    format: String,
    quality: u8,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    let doc = state.document.lock().unwrap();

    let core_format = match format.to_uppercase().as_str() {
        "PNG" => photrez_core::export::ExportFormat::PNG,
        "JPEG" | "JPG" => photrez_core::export::ExportFormat::JPEG,
        "WEBP" => photrez_core::export::ExportFormat::WebP,
        _ => return err_response("E_VALIDATION", "Unsupported export format"),
    };

    let settings = photrez_core::export::ExportSettings::new(core_format, quality);
    let encoded_bytes = match photrez_core::export::export_document(&*doc, &settings) {
        Ok(bytes) => bytes,
        Err(e) => return err_response("E_ENCODING", &e),
    };

    // Invoke RFD native save file dialog in a worker thread
    let default_name = format!("untitled.{}", format.to_lowercase());
    let dialog = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter(&format, &[&format.to_lowercase()])
        .save_file();

    if let Some(path) = dialog {
        if let Err(e) = std::fs::write(&path, encoded_bytes) {
            err_response("E_IO", &format!("Failed to write file to disk: {}", e))
        } else {
            ok_response(serde_json::json!({
                "status": "success",
                "path": path.to_string_lossy()
            }))
        }
    } else {
        err_response("E_CANCEL", "Export cancelled by user")
    }
}

#[tauri::command]
fn sample_pixel(
    x: f32,
    y: f32,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    let doc = state.document.lock().unwrap();
    let color = doc.sample_pixel(x, y);
    ok_response(color)
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

#[tauri::command]
fn show_open_dialog() -> Result<Value, Value> {
    let dialog = rfd::FileDialog::new()
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "bmp", "gif"])
        .pick_file();
    
    if let Some(path) = dialog {
        ok_response(serde_json::json!({
            "path": path.to_string_lossy()
        }))
    } else {
        err_response("E_CANCEL", "No file selected")
    }
}

#[tauri::command]
fn open_image(
    path: String,
    state: tauri::State<'_, EditorState>,
) -> Result<Value, Value> {
    let bytes = match std::fs::read(&path) {
        Ok(b) => b,
        Err(e) => return err_response("E_IO", &format!("Failed to read file: {}", e)),
    };

    let name = std::path::Path::new(&path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Image")
        .to_string();

    let mut doc = state.document.lock().unwrap();
    let mut history = state.history.lock().unwrap();
    history.commit((*doc).clone());

    match doc.load_image_from_bytes(bytes, name) {
        Ok(_) => ok_response(&*doc),
        Err(e) => err_response("E_DECODE", &e),
    }
}

#[tauri::command]
fn trigger_render(state: tauri::State<'_, EditorState>) -> Result<Value, Value> {
    let mut doc = state.document.lock().unwrap();
    let ids: Vec<String> = doc.layers.iter().map(|l| l.id.clone()).collect();
    for id in &ids {
        doc.mark_dirty(id);
    }
    ok_response(serde_json::json!({ "triggered": true }))
}

fn main() {
    println!("{}", photrez_core::init_core());
    println!("{}", photrez_render::init_render());

    let app = tauri::Builder::default()
        .manage(EditorState::new())
        .setup(|app| {
            let window = app.get_webview_window("main")
                .expect("Failed to get main window");
            
            let mut renderer = pollster::block_on(photrez_render::WgpuRenderer::new());
            renderer.set_surface_from_window(window);
            
            app.manage(WgpuState {
                renderer: Mutex::new(renderer),
            });
            
            Ok(())
        })
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
            draw_brush_stroke,
            export_document,
            sample_pixel,
            open_image,
            show_open_dialog,
            trigger_render
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        match event {
            tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::Resized(size),
                ..
            } => {
                if label == "main" {
                    let state = app_handle.state::<WgpuState>();
                    let mut renderer = state.renderer.lock().unwrap();
                    renderer.resize(size.width.max(1), size.height.max(1));
                }
            }
            tauri::RunEvent::MainEventsCleared => {
                let doc_state = app_handle.state::<EditorState>();
                let mut doc = doc_state.document.lock().unwrap();
                
                if doc.has_dirty_layers() {
                    let layer_data: Vec<(&str, &[u8], u32, u32, f32, bool, f32, f32)> = doc.layers.iter()
                        .filter(|l| l.visible)
                        .map(|l| {
                            (
                                l.id.as_str(),
                                l.bitmap_ref.pixel_data.as_slice(),
                                l.width,
                                l.height,
                                l.opacity,
                                l.visible,
                                l.x,
                                l.y,
                            )
                        })
                        .collect();
                    
                    {
                        let state = app_handle.state::<WgpuState>();
                        let mut renderer = state.renderer.lock().unwrap();
                        renderer.render_layers(&layer_data);
                    }
                    
                    doc.clear_dirty();
                }
            }
            _ => (),
        }
    });
}
