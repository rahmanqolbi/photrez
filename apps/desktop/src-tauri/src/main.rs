#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use serde_json::Value;

// ─── Response Envelope ───
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

fn ok_response<T: Serialize>(data: T) -> Result<Value, Value> {
    let success = ApiSuccessResponse {
        ok: true,
        contract_version: "2.0.0".to_string(),
        data: serde_json::to_value(data).unwrap(),
    };
    Ok(serde_json::to_value(&success).unwrap())
}

fn err_response(code: &str, message: &str) -> Result<Value, Value> {
    let error = ApiErrorResponse {
        ok: false,
        contract_version: "2.0.0".to_string(),
        error: ApiErrorPayload {
            code: code.to_string(),
            message: message.to_string(),
            details: Value::Null,
        },
    };
    Err(serde_json::to_value(&error).unwrap())
}

// ─── Commands ───

#[tauri::command]
fn ping() -> Result<Value, Value> {
    ok_response(serde_json::json!({ "status": "ok", "service": "native" }))
}

#[tauri::command]
fn get_contract_info() -> Result<Value, Value> {
    ok_response(serde_json::json!({
        "name": "photrez-command-contract",
        "version": "2.0.0",
        "supported_commands": [
            "ping", "get_contract_info",
            "read_file_bytes", "write_file_bytes"
        ]
    }))
}

/// Read file bytes from disk. Returns base64-encoded bytes.
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Value, Value> {
    match std::fs::read(&path) {
        Ok(bytes) => {
            use base64::Engine;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            ok_response(serde_json::json!({
                "path": path,
                "size": bytes.len(),
                "data": b64
            }))
        }
        Err(e) => err_response("E_IO", &format!("Failed to read file: {}", e)),
    }
}

/// Write bytes to disk.
#[tauri::command]
fn write_file_bytes(path: String, data: String) -> Result<Value, Value> {
    use base64::Engine;
    let bytes = match base64::engine::general_purpose::STANDARD.decode(&data) {
        Ok(b) => b,
        Err(e) => return err_response("E_VALIDATION", &format!("Invalid base64: {}", e)),
    };

    match std::fs::write(&path, &bytes) {
        Ok(_) => ok_response(serde_json::json!({
            "path": path,
            "size": bytes.len()
        })),
        Err(e) => err_response("E_IO", &format!("Failed to write: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            get_contract_info,
            read_file_bytes,
            write_file_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Photrez");
}
