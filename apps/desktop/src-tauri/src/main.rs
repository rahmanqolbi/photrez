#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use serde_json::Value;

const CONTRACT_VERSION: &str = "2.0.0";
const MAX_FILE_IO_BYTES: u64 = 256 * 1024 * 1024;
const READ_FILE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"];
const WRITE_FILE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];

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
    let data = serde_json::to_value(data)
        .map_err(|e| internal_error_value(&format!("Failed to serialize response data: {}", e)))?;
    let success = ApiSuccessResponse {
        ok: true,
        contract_version: CONTRACT_VERSION.to_string(),
        data,
    };
    serde_json::to_value(&success)
        .map_err(|e| internal_error_value(&format!("Failed to serialize success envelope: {}", e)))
}

fn err_response(code: &str, message: &str) -> Result<Value, Value> {
    Err(error_value(code, message))
}

fn error_value(code: &str, message: &str) -> Value {
    let error = ApiErrorResponse {
        ok: false,
        contract_version: CONTRACT_VERSION.to_string(),
        error: ApiErrorPayload {
            code: code.to_string(),
            message: message.to_string(),
            details: Value::Null,
        },
    };
    serde_json::to_value(&error)
        .unwrap_or_else(|_| internal_error_value("Failed to serialize error envelope"))
}

fn internal_error_value(message: &str) -> Value {
    serde_json::json!({
        "ok": false,
        "contract_version": CONTRACT_VERSION,
        "error": {
            "code": "E_INTERNAL",
            "message": message,
            "details": null
        }
    })
}

fn validate_path_extension(path: &str, allowed: &[&str], operation: &str) -> Result<(), Value> {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase());

    if let Some(ext) = ext {
        if allowed.iter().any(|allowed_ext| *allowed_ext == ext) {
            return Ok(());
        }
    }

    Err(error_value(
        "E_VALIDATION",
        &format!(
            "Unsupported file extension for {}; supported extensions: {}",
            operation,
            allowed.join(", ")
        ),
    ))
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
        "version": CONTRACT_VERSION,
        "supported_commands": [
            "ping", "get_contract_info",
            "read_file_bytes", "write_file_bytes"
        ]
    }))
}

/// Read file bytes from disk. Returns base64-encoded bytes.
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Value, Value> {
    validate_path_extension(&path, READ_FILE_EXTENSIONS, "read")?;

    match std::fs::metadata(&path) {
        Ok(metadata) if metadata.len() > MAX_FILE_IO_BYTES => {
            return err_response(
                "E_RESOURCE_LIMIT",
                "File is too large for IPC transfer; max supported size is 256 MB",
            );
        }
        Ok(_) => {}
        Err(e) => return err_response("E_IO", &format!("Failed to inspect file: {}", e)),
    }

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
    validate_path_extension(&path, WRITE_FILE_EXTENSIONS, "write")?;

    use base64::Engine;
    let bytes = match base64::engine::general_purpose::STANDARD.decode(&data) {
        Ok(b) => b,
        Err(e) => return err_response("E_VALIDATION", &format!("Invalid base64: {}", e)),
    };
    if bytes.len() as u64 > MAX_FILE_IO_BYTES {
        return err_response(
            "E_RESOURCE_LIMIT",
            "File is too large for IPC transfer; max supported size is 256 MB",
        );
    }

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

// ─── Tests ───
#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;

    fn temp_path(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join("photrez-test");
        let _ = std::fs::create_dir_all(&dir);
        dir.join(name)
    }

    #[test]
    fn test_write_file_bytes_creates_file() {
        let path = temp_path("test_write_creates.png");
        let _ = std::fs::remove_file(&path);

        let data = b"hello photrez export";
        let b64 = base64::engine::general_purpose::STANDARD.encode(data);
        let result = write_file_bytes(path.to_str().unwrap().to_string(), b64.clone());

        assert!(
            result.is_ok(),
            "write_file_bytes should succeed: {:?}",
            result
        );
        assert!(path.exists(), "file should exist on disk");

        let written = std::fs::read(&path).unwrap();
        assert_eq!(written, data, "written content should match input");
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_write_file_bytes_roundtrip() {
        let path = temp_path("test_roundtrip.png");
        let _ = std::fs::remove_file(&path);

        // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A + minimal valid pixel
        let original: Vec<u8> = vec![
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
            0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63,
            0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x27, 0x34, 0x27, 0x00, 0x00,
            0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82, // IEND chunk
        ];
        let b64 = base64::engine::general_purpose::STANDARD.encode(&original);

        // Write
        let write_result = write_file_bytes(path.to_str().unwrap().to_string(), b64.clone());
        assert!(write_result.is_ok());
        assert!(path.exists());

        // Read back via read_file_bytes
        let read_result = read_file_bytes(path.to_str().unwrap().to_string());
        assert!(read_result.is_ok());

        let value = read_result.unwrap();
        let obj = value.as_object().unwrap();
        let data_str = obj["data"]["data"].as_str().unwrap();
        let roundtrip = base64::engine::general_purpose::STANDARD
            .decode(data_str)
            .unwrap();
        assert_eq!(roundtrip, original, "roundtrip content should match");

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_write_file_bytes_invalid_base64() {
        let path = temp_path("test_invalid_b64.png");
        let result = write_file_bytes(
            path.to_str().unwrap().to_string(),
            "not-valid-base64!!!".to_string(),
        );
        assert!(result.is_err(), "invalid base64 should produce error");
        let err_value = result.unwrap_err();
        assert!(err_value.to_string().contains("E_VALIDATION"));
    }

    #[test]
    fn test_write_file_bytes_rejects_unsupported_extension() {
        let path = temp_path("test_unsupported_export.txt");
        let _ = std::fs::remove_file(&path);
        let b64 = base64::engine::general_purpose::STANDARD.encode(b"test");
        let result = write_file_bytes(path.to_str().unwrap().to_string(), b64);
        assert!(result.is_err(), "unsupported export extension should error");
        let err_value = result.unwrap_err();
        assert!(err_value.to_string().contains("E_VALIDATION"));
        assert!(
            !path.exists(),
            "unsupported export should not create a file"
        );
    }

    #[test]
    fn test_write_file_bytes_to_invalid_path() {
        let bad_path = format!("Z:\\nope\\{}", std::process::id());
        let b64 = base64::engine::general_purpose::STANDARD.encode(b"test");
        let result = write_file_bytes(bad_path, b64);
        assert!(result.is_err(), "write to invalid path should error");
    }

    #[test]
    fn test_read_file_bytes_nonexistent_file() {
        let result = read_file_bytes("Z:\\nonexistent_file_12345.png".to_string());
        assert!(result.is_err(), "reading nonexistent file should error");
        let err_value = result.unwrap_err();
        assert!(err_value.to_string().contains("E_IO"));
    }

    #[test]
    fn test_read_file_bytes_rejects_unsupported_extension() {
        let path = temp_path("test_unsupported_import.txt");
        std::fs::write(&path, b"not an image").unwrap();
        let result = read_file_bytes(path.to_str().unwrap().to_string());
        assert!(result.is_err(), "unsupported import extension should error");
        let err_value = result.unwrap_err();
        assert!(err_value.to_string().contains("E_VALIDATION"));
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_ping_response() {
        let result = ping();
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value["ok"], true);
        assert_eq!(value["data"]["status"], "ok");
        assert_eq!(value["data"]["service"], "native");
    }

    #[test]
    fn test_get_contract_info_includes_write_command() {
        let result = get_contract_info();
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value["contract_version"], CONTRACT_VERSION);
        assert_eq!(value["data"]["version"], CONTRACT_VERSION);
        let commands = value["data"]["supported_commands"].as_array().unwrap();
        let names: Vec<&str> = commands.iter().map(|c| c.as_str().unwrap()).collect();
        assert_eq!(
            names,
            vec![
                "ping",
                "get_contract_info",
                "read_file_bytes",
                "write_file_bytes"
            ]
        );
    }

    #[test]
    fn test_error_response_uses_contract_version() {
        let result = err_response("E_VALIDATION", "bad input");
        assert!(result.is_err());
        let value = result.unwrap_err();
        assert_eq!(value["contract_version"], CONTRACT_VERSION);
        assert_eq!(value["error"]["code"], "E_VALIDATION");
    }
}
