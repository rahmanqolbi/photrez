#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use serde_json::Value;

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

#[tauri::command]
fn ping() -> Result<Value, Value> {
    let success = ApiSuccessResponse {
        ok: true,
        contract_version: "1.0.0".to_string(),
        data: serde_json::json!({
            "status": "ok",
            "service": "core"
        }),
    };
    Ok(serde_json::to_value(&success).unwrap())
}

#[tauri::command]
fn get_contract_info() -> Result<Value, Value> {
    let success = ApiSuccessResponse {
        ok: true,
        contract_version: "1.0.0".to_string(),
        data: serde_json::json!({
            "name": "photrez-command-contract",
            "version": "1.0.0",
            "supported_commands": ["ping", "get_contract_info"]
        }),
    };
    Ok(serde_json::to_value(&success).unwrap())
}

fn main() {
    println!("{}", photrez_core::init_core());
    println!("{}", photrez_render::init_render());

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ping, get_contract_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
