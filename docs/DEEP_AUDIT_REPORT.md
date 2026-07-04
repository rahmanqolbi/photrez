# Photrez Deep Audit Report: Latent Risks & Vulnerabilities

This document details the hidden edge cases, security vulnerabilities, and logical hazards uncovered during a deep audit of the Photrez codebase.

---

## 1. Security Vulnerabilities

### 🚨 1. Unvalidated File Execution in `print_image` (IPC command)
- **Path:** `apps/desktop/src-tauri/src/commands.rs` (line 192)
- **Vulnerability:** Unlike other file-based IPC commands, `print_image` does not execute `validate_path_extension(&path, ...)` prior to calling Windows `ShellExecuteW`.
- **Attack Vector:** An attacker who achieves execution in the frontend context (or via local script manipulation) can invoke `print_image` on a local executable (`.exe`) or script (`.bat` / `.cmd` / `.vbs`). 
- **Impact:** Depending on the user's OS file association for the `print` action, executing ShellExecute on scripts can trigger command execution, bypass UI controls, or result in arbitrary code execution.
- **Remedy:** Apply `validate_path_extension(&path, READ_FILE_EXTENSIONS, "print")?` at the beginning of the `print_image` command.

### 💣 2. Zip Bomb Vulnerability in `load_project` (OOM / Denial of Service)
- **Path:** `apps/desktop/src-tauri/src/commands.rs` (line 140)
- **Vulnerability:** The project loading parser extracts files in the `.ptz` archive (`document.json` and layer `.png` bitmaps) directly to memory using `read_to_end` and `read_to_string` without monitoring accumulated data size or per-file size limits.
- **Attack Vector:** Loading a crafted 10KB `.ptz` file containing highly compressed files that decompress to 10GB will cause the Rust thread to allocate massive memory, triggering an Out Of Memory (OOM) crash or OS freeze.
- **Remedy:** Restrict decompression size by taking a limited read stream:
  ```rust
  let mut limit_reader = file.take(MAX_FILE_IO_BYTES);
  limit_reader.read_to_end(&mut bytes)?;
  ```

---

## 2. Resource Leaks

### 💾 3. Temp File Accumulation in `printDocument`
- **Path:** `apps/desktop/src/components/editor/printDocument.ts` (line 8)
- **Leak:** In `printDocument`, the frontend generates a temporary composite image and saves it to disk:
  ```typescript
  const filePath = `${tmpDir}${filename}`;
  await writeFileBytes(filePath, bytes);
  ```
  It then calls `invoke("print_image", { path: filePath })` and exits. The temporary file is **never deleted**.
- **Impact:** Every printing action leaks a high-resolution PNG image file in the user's temporary folder, eventually consuming gigabytes of storage over prolonged usage.
- **Remedy:** Delete the temp file after a safe timeout, or prune older `photrez-print-*` files from the temporary directory when the application boots.

---

## 3. Reliability & Reactivity Risks

### 💥 4. Lack of Global ErrorBoundary in SolidJS App Shell
- **Path:** `apps/desktop/src/App.tsx` and `apps/desktop/src/components/editor/shell/EditorShell.tsx`
- **Risk:** There is no `<ErrorBoundary>` wrapping the main application layout or editor shell.
- **Impact:** In SolidJS, any unhandled runtime error within a reactive derivation (such as a null pointer exception in a state subscription) will cause the entire component subtree to unmount, resulting in a blank screen and potential loss of unsaved changes.
- **Remedy:** Wrap the main editor structure in `<ErrorBoundary fallback={(err) => <ErrorUI error={err} />}>`.

### ⚡ 5. Blocking IPC Channels via Large Base64 Serialization
- **Path:** `apps/desktop/src/components/editor/exportDocument.ts` and project loading
- **Risk:** Large document layers are read/written by converting binary buffers to Base64 strings, serializing them into JSON, and sending them over the Tauri IPC channel.
- **Impact:** Serializing and parsing 100MB+ JSON payloads blocks the JavaScript single-thread execution, causing visible interface stutter and frame drops.
- **Remedy:** Migrate to Tauri's direct binary payload support (`Uint8Array` / raw binary envelopes) to bypass Base64 encoding.

### 🧩 6. Weak Type Guarding on Local Storage Parsing
- **Path:** `apps/desktop/src/lib/recentFiles.ts` (line 12)
- **Risk:** The parsing code for `photrez:recentFiles` asserts `raw` data as `RecentFile[]` via a simple cast after verifying `Array.isArray(parsed)`. It does not validate structural schema properties (`path` or `name` fields).
- **Impact:** If local storage is corrupted, runtime crashes can occur when accessing string operations on corrupted elements (e.g., `file.path.toLowerCase()`).
- **Remedy:** Add structural item checks inside the parsing loop.
