// ─── Native OS Cursor Override ───
//
// On Windows, WebView2 overrides the CSS cursor by handling WM_SETCURSOR
// in its own child window.  Tauri's built-in setCursorIcon calls SetCursor
// via tao, but WebView2's child window intercepts WM_SETCURSOR before
// the parent sees it.
//
// This module uses the Win32 SetCursor call from the main thread to
// forcibly set the cursor AFTER WebView2 has set its own.  SetCursor
// affects the calling thread's message queue, so calling it from the
// Tauri main thread (which owns the window) overrides the webview cursor.
//
// For "copy" / "move" the load chain is:
//   LoadCursorW(NULL, MAKEINTRESOURCE(OCR_COPY))  — works on Win10+

#[cfg(not(windows))]
use tauri::Manager;
use tauri::{AppHandle, Runtime};

/// System cursor IDs from Windows SDK (winuser.h → OCR_*).
#[cfg(windows)]
mod sys_id {
    // Re-export from windows-sys
    pub use windows_sys::Win32::UI::WindowsAndMessaging::{
        IDC_ARROW, LoadCursorW, SetCursor,
    };
    // OCR_COPY = 32642, OCR_MOVE = 32641 — not in windows-sys as named
    // constants, so we define them inline.
    pub const OCR_COPY: u16 = 32642;
    pub const OCR_MOVE: u16 = 32641;
}

/// Tauri IPC command: override the native cursor to the given OS icon.
///
/// Call with icon = "copy" | "move" | "default" to switch the cursor.
/// Only affects Windows; no-op on macOS/Linux (those platforms respect
/// CSS cursor natively).
#[tauri::command]
pub(crate) fn set_native_cursor<R: Runtime>(
    _app: AppHandle<R>,
    icon: String,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        let cursor_id = match icon.as_str() {
            "copy" => sys_id::OCR_COPY,
            "move" => sys_id::OCR_MOVE,
            _ => sys_id::IDC_ARROW as u16,
        };

        unsafe {
            // LoadCursorW with system OCR values works on modern Windows.
            let hcursor = sys_id::LoadCursorW(std::ptr::null_mut(), cursor_id as *const u16);
            if hcursor.is_null() {
                // Fallback: use LoadImageW with LR_SHARED (more reliable
                // for drag-drop cursors on some Windows builds).
                let hcursor2 = windows_sys::Win32::UI::WindowsAndMessaging::LoadImageW(
                    std::ptr::null_mut(),
                    cursor_id as *const u16,
                    windows_sys::Win32::UI::WindowsAndMessaging::IMAGE_CURSOR,
                    0,
                    0,
                    windows_sys::Win32::UI::WindowsAndMessaging::LR_DEFAULTSIZE
                        | windows_sys::Win32::UI::WindowsAndMessaging::LR_SHARED,
                );
                if !hcursor2.is_null() {
                    sys_id::SetCursor(hcursor2);
                }
            } else {
                sys_id::SetCursor(hcursor);
            }
        }
    }

    #[cfg(not(windows))]
    {
        // Non-Windows: attempt Tauri's built-in setCursorIcon.
        if let Some(w) = _app.get_webview_window("main") {
            let _ = w.set_cursor_icon(
                match icon.as_str() {
                    "copy" => tauri::cursor::CursorIcon::Copy,
                    "move" => tauri::cursor::CursorIcon::Move,
                    _ => tauri::cursor::CursorIcon::Default,
                },
            );
        }
    }

    Ok(())
}
