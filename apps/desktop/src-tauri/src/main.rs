#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use serde::Serialize;
use serde_json::Value;
use photrez_core::document::Document;
use photrez_core::layers::Layer;
use photrez_core::transform::Transform;
use photrez_core::workspace::{WorkspaceState, DocumentSession};
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

struct AppRuntime {
    workspace: Mutex<WorkspaceState>,
    viewport: Mutex<ViewportState>,
}

#[derive(Clone, Debug)]
struct ViewportState {
    artboard_x: f32,
    artboard_y: f32,
    artboard_w: f32,
    artboard_h: f32,
    pan_x: f32,
    pan_y: f32,
    zoom: f32,
    doc_width: f32,
    doc_height: f32,
}

impl Default for ViewportState {
    fn default() -> Self {
        Self {
            artboard_x: 0.0,
            artboard_y: 0.0,
            artboard_w: 800.0,
            artboard_h: 600.0,
            pan_x: 0.0,
            pan_y: 0.0,
            zoom: 1.0,
            doc_width: 800.0,
            doc_height: 600.0,
        }
    }
}

struct WgpuState {
    renderer: Mutex<photrez_render::WgpuRenderer>,
}

impl AppRuntime {
    fn new() -> Self {
        Self {
            workspace: Mutex::new(WorkspaceState::new()),
            viewport: Mutex::new(ViewportState::default()),
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

// ── Workspace Commands ──

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
            "get_workspace_state",
            "get_document_state",
            "open_images",
            "switch_document",
            "close_document",
            "set_selected_layer",
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
            "sample_pixel",
            "open_image",
            "trigger_render",
            "update_viewport_state",
            "preview_frame"
        ]
    }))
}

#[tauri::command]
fn get_workspace_state(state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let ws = state.workspace.lock().unwrap();
    ok_response(ws.snapshot())
}

/// Compatibility: returns the active document state (or error if none active).
#[tauri::command]
fn get_document_state(state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let ws = state.workspace.lock().unwrap();
    match ws.get_active_session() {
        Some(session) => ok_response(&session.document),
        None => err_response("E_NOT_FOUND", "No document is open"),
    }
}

#[tauri::command]
fn open_images(
    paths: Vec<String>,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let mut opened = 0u32;
    let mut failed = 0u32;
    let mut failures: Vec<serde_json::Value> = Vec::new();

    for path in &paths {
        // Check limit before each open
        if ws.is_full() {
            failures.push(serde_json::json!({
                "path": path,
                "code": "E_RESOURCE_LIMIT",
                "message": "Close a document before opening more images."
            }));
            failed += 1;
            continue;
        }

        let bytes = match std::fs::read(path) {
            Ok(b) => b,
            Err(e) => {
                failures.push(serde_json::json!({
                    "path": path,
                    "code": "E_IO",
                    "message": format!("Failed to read file: {}", e)
                }));
                failed += 1;
                continue;
            }
        };

        let display_name = std::path::Path::new(path)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("Image")
            .to_string();

        let doc_id = format!("doc-{}", uuid::Uuid::new_v4().simple());
        let mut doc = Document::new(doc_id.clone(), 800, 600);

        match doc.load_image_from_bytes(bytes, display_name.clone()) {
            Ok(_) => {
                let mut session = DocumentSession::new(doc_id, doc, display_name)
                    .with_source_path(path.clone());
                // Newly opened documents start clean
                session.mark_clean();
                let _ = ws.add_document(session);
                opened += 1;
            }
            Err(e) => {
                failures.push(serde_json::json!({
                    "path": path,
                    "code": "E_VALIDATION",
                    "message": if e.contains("E_RESOURCE_LIMIT") {
                        "Image exceeds maximum size. Try a smaller image.".to_string()
                    } else if e.contains("Failed to decode") {
                        "File appears to be damaged.".to_string()
                    } else {
                        format!("Cannot open this file: {}", e)
                    }
                }));
                failed += 1;
            }
        }
    }

    let snapshot = ws.snapshot();

    if opened == 0 && failed > 0 {
        return err_response("E_VALIDATION", &format!(
            "Opened 0 images. {} failed.", failed
        ));
    }

    ok_response(serde_json::json!({
        "workspace": snapshot,
        "summary": {
            "opened": opened,
            "failed": failed,
            "failures": failures
        }
    }))
}

#[tauri::command]
fn switch_document(
    document_id: String,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    match ws.switch_document(&document_id) {
        Ok(_) => ok_response(ws.snapshot()),
        Err(code) => err_response(&code, "Document not found"),
    }
}

#[tauri::command]
fn close_document(
    document_id: String,
    discard_changes: bool,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();

    // Check if document exists and is dirty
    if let Some(session) = ws.get_session(&document_id) {
        if session.dirty && !discard_changes {
            return err_response("E_CONFLICT", "Document has changes that have not been exported.");
        }
    } else {
        return err_response("E_NOT_FOUND", "Document not found");
    }

    ws.remove_document(&document_id);
    ok_response(ws.snapshot())
}

#[tauri::command]
fn set_selected_layer(
    layer_id: Option<String>,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    // Validate layer_id exists in document if provided
    if let Some(ref id) = layer_id {
        if session.document.get_layer_by_id(id).is_none() {
            return err_response("E_VALIDATION", "Layer not found in active document.");
        }
    }

    session.select_layer(layer_id);
    ok_response(ws.snapshot())
}

// ── Active Document Commands ──

#[tauri::command]
fn add_layer(name: String, state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    let width = session.document.width;
    let height = session.document.height;
    let additional_bytes = (width * height * 4) as usize;

    if session.document.calculate_memory_usage() + additional_bytes > photrez_core::document::MAX_PIXEL_BUDGET {
        return err_response("E_RESOURCE_LIMIT", "Document memory exceeds max pixel budget of 256MB");
    }

    session.history.commit(session.document.clone());

    let id = format!("layer-{}", uuid::Uuid::new_v4().simple());
    let new_layer = Layer::new(id, name, width, height);

    session.document.add_layer(new_layer);
    session.mark_dirty();
    ok_response(&session.document)
}

#[tauri::command]
fn delete_layer(id: String, state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    if session.document.layers.len() <= 1 {
        return err_response("CANNOT_DELETE_LAST_LAYER", "Cannot delete the only remaining layer");
    }

    session.history.commit(session.document.clone());

    match session.document.delete_layer(&id) {
        Ok(_) => {
            session.mark_dirty();
            ok_response(&session.document)
        }
        Err(e) => err_response("LAYER_NOT_FOUND", &e),
    }
}

#[tauri::command]
fn reorder_layer(from_idx: usize, to_idx: usize, state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());

    match session.document.reorder_layer(from_idx, to_idx) {
        Ok(_) => {
            session.mark_dirty();
            ok_response(&session.document)
        }
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
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());

    match session.document.update_layer_properties(&id, opacity, visible, locked, name, blend_mode) {
        Ok(_) => {
            session.mark_dirty();
            ok_response(&session.document)
        }
        Err(e) => err_response("LAYER_UPDATE_FAILED", &e),
    }
}

#[tauri::command]
fn undo(state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    if let Some(prev_state) = session.history.undo(session.document.clone()) {
        session.document = prev_state;
        ok_response(&session.document)
    } else {
        err_response("NO_UNDO_HISTORY", "No history available to undo")
    }
}

#[tauri::command]
fn redo(state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    if let Some(next_state) = session.history.redo(session.document.clone()) {
        session.document = next_state;
        ok_response(&session.document)
    } else {
        err_response("NO_REDO_HISTORY", "No history available to redo")
    }
}

#[tauri::command]
fn create_selection(
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    if width <= 0.0 || height <= 0.0 {
        return err_response("E_VALIDATION", "Selection width and height must be positive");
    }

    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());
    session.document.create_selection(x, y, width, height);
    session.mark_dirty();
    ok_response(&session.document)
}

#[tauri::command]
fn clear_selection(state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());
    session.document.clear_selection();
    ok_response(&session.document)
}

#[tauri::command]
fn select_all(state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());
    session.document.select_all();
    ok_response(&session.document)
}

#[tauri::command]
fn move_layer(
    id: String,
    x: f32,
    y: f32,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());

    match session.document.move_layer(&id, x, y) {
        Ok(_) => {
            session.mark_dirty();
            ok_response(&session.document)
        }
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
    state: tauri::State<'_, AppRuntime>,
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

    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());

    match session.document.apply_transform(&id, transform) {
        Ok(_) => {
            session.mark_dirty();
            ok_response(&session.document)
        }
        Err(e) => err_response("LAYER_NOT_FOUND", &e),
    }
}

#[tauri::command]
fn crop_canvas(
    x: f32,
    y: f32,
    width: u32,
    height: u32,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());

    match session.document.crop_canvas(x, y, width, height) {
        Ok(_) => {
            session.mark_dirty();
            ok_response(&session.document)
        }
        Err(e) => err_response("E_VALIDATION", &e),
    }
}

#[tauri::command]
fn resize_canvas(
    width: u32,
    height: u32,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());

    match session.document.resize_canvas(width, height) {
        Ok(_) => {
            session.mark_dirty();
            ok_response(&session.document)
        }
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
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    if path.is_empty() {
        return err_response("E_VALIDATION", "Stroke path cannot be empty");
    }

    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };

    session.history.commit(session.document.clone());

    let settings = photrez_core::brush::BrushSettings::new(size, hardness, color);

    if let Some(layer) = session.document.layers.iter_mut().find(|l| l.id == layer_id) {
        layer.draw_brush_stroke(&path, &settings, is_eraser);
        session.document.mark_dirty(&layer_id);
        session.mark_dirty();
        ok_response(&session.document)
    } else {
        err_response("LAYER_NOT_FOUND", "Layer not found")
    }
}

#[tauri::command]
fn export_document(
    format: String,
    quality: u8,
    path: String,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image before exporting."),
    };

    let core_format = match format.to_uppercase().as_str() {
        "PNG" => photrez_core::export::ExportFormat::PNG,
        "JPEG" | "JPG" => photrez_core::export::ExportFormat::JPEG,
        "WEBP" => photrez_core::export::ExportFormat::WebP,
        _ => return err_response("E_VALIDATION", "Unsupported export format"),
    };

    let settings = photrez_core::export::ExportSettings::new(core_format, quality);
    let encoded_bytes = match photrez_core::export::export_document(&session.document, &settings) {
        Ok(bytes) => bytes,
        Err(e) => return err_response("E_ENCODING", &e),
    };

    if let Err(e) = std::fs::write(&path, encoded_bytes) {
        err_response("E_IO", &format!("Failed to write file to disk: {}", e))
    } else {
        session.mark_clean();
        ok_response(serde_json::json!({
            "status": "success",
            "path": path
        }))
    }
}

#[tauri::command]
fn sample_pixel(
    x: f32,
    y: f32,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "Open an image first."),
    };
    let color = session.document.sample_pixel(x, y);
    ok_response(color)
}

/// Legacy single-file open — kept for compatibility with existing frontend code.
#[tauri::command]
fn open_image(
    path: String,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    // Delegate to open_images
    open_images(vec![path], state)
}

#[tauri::command]
fn trigger_render(state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    let mut ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session_mut() {
        Some(s) => s,
        None => return ok_response(serde_json::json!({ "triggered": false })),
    };

    let ids: Vec<String> = session.document.layers.iter().map(|l| l.id.clone()).collect();
    for id in &ids {
        session.document.mark_dirty(id);
    }
    ok_response(serde_json::json!({ "triggered": true }))
}

#[tauri::command]
fn preview_frame(state: tauri::State<'_, AppRuntime>) -> Result<Value, Value> {
    use base64::Engine;
    let ws = state.workspace.lock().unwrap();
    let session = match ws.get_active_session() {
        Some(s) => s,
        None => return err_response("E_NOT_FOUND", "No document is open"),
    };
    let settings = photrez_core::export::ExportSettings::new(photrez_core::export::ExportFormat::PNG, 80);
    let png_bytes = match photrez_core::export::export_document(&session.document, &settings) {
        Ok(bytes) => bytes,
        Err(e) => return err_response("E_PREVIEW", &e),
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    ok_response(serde_json::json!({ "dataUri": format!("data:image/png;base64,{}", b64) }))
}

#[tauri::command]
fn update_viewport_state(
    artboard_x: f32,
    artboard_y: f32,
    artboard_w: f32,
    artboard_h: f32,
    pan_x: f32,
    pan_y: f32,
    zoom: f32,
    doc_width: f32,
    doc_height: f32,
    state: tauri::State<'_, AppRuntime>,
) -> Result<Value, Value> {
    let mut vp = state.viewport.lock().unwrap();
    vp.artboard_x = artboard_x;
    vp.artboard_y = artboard_y;
    vp.artboard_w = artboard_w;
    vp.artboard_h = artboard_h;
    vp.pan_x = pan_x;
    vp.pan_y = pan_y;
    vp.zoom = zoom;
    vp.doc_width = doc_width;
    vp.doc_height = doc_height;
    ok_response(serde_json::json!({ "updated": true }))
}

fn main() {
    println!("{}", photrez_core::init_core());
    println!("{}", photrez_render::init_render());

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppRuntime::new())
        .setup(|app| {
            let _window = app.get_webview_window("main")
                .expect("Failed to get main window");

            let renderer = pollster::block_on(photrez_render::WgpuRenderer::new());

            app.manage(WgpuState {
                renderer: Mutex::new(renderer),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            get_contract_info,
            get_workspace_state,
            get_document_state,
            open_images,
            switch_document,
            close_document,
            set_selected_layer,
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
            trigger_render,
            update_viewport_state,
            preview_frame
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, _event| {});
}
