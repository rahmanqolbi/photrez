# Photrez Project Audit Report

This report outlines the findings from a comprehensive codebase audit of **Photrez**, assessing security vulnerabilities, logical correctness, reactivity hazards, and developer setup issues.

---

## 1. Security & Safety Assessment

We audited the Tauri backend interface, Capabilities, Content Security Policy (CSP), IPC message routing, and file handling mechanisms.

### 🔑 Tauri IPC Security & Sanity
- **File System Sanitation:** All file reading/writing handlers in `src-tauri/src/commands.rs` (e.g., `read_file_bytes`, `write_file_bytes`, `save_project`, `load_project`, `print_image`) route through `validate_path_extension`. This function strictly permits only designated extensions (`.png`, `.jpg`, `.jpeg`, `.ptz`, `.pdf`), preventing arbitrary file system writes/reads of executable or configuration files.
- **Resource Constraints:** Bytes are transferred as base64 strings with an in-memory size limit of `MAX_FILE_IO_BYTES` set to `268435456` (256 MB) to prevent denial-of-service memory exhaustion.
- **Atomic Operations:** Window persistence state (`window_state.rs`) is written atomically using a temporary file rename strategy. This guards against data corruption if the application exits abruptly.

### 🛡️ Zip Slip Path Traversal
- **Archive Extraction Safe-Guard:** The `load_project` command extracts `.ptz` zip archives directly in-memory using the `zip` crate. It decodes the contents directly into memory buffers without writing files back to the local disk, successfully mitigating any risk of Zip Slip path traversal.

### 🕸️ Content Security Policy (CSP) & External Network Dependencies
- **CSP Configuration:** The CSP defined in `src-tauri/tauri.conf.json` allows loading styles and fonts from Google CDNs:
  ```
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' ipc: https://ipc.localhost http://localhost:1420 ws: https://fonts.googleapis.com https://fonts.gstatic.com;
  ```
- **Offline Usability & Privacy Risk (Google Fonts):** The HTML template (`index.html`) relies on preconnecting to and loading Inter/Outfit fonts directly from Google CDNs (`https://fonts.googleapis.com`).
  - **Offline Failure:** When the application runs in an offline environment (such as during flights or in offline editing bays), these typography resources fail to load, falling back to system generic fonts and degrading UI styling.
  - **GDPR & Privacy:** Initiating connections to external CDNs exposes the user's IP address and client signature to third-party servers.
  - **Recommendation:** Download the necessary TTF/WOFF2 files, bundle them locally within the application package (`src/assets/fonts/`), and load them via local `@font-face` stylesheet rules to enforce 100% offline-first operations.

---

## 2. Reactivity & Logical Sanity (SolidJS Frontend)

We evaluated potential reactivity loop hazards, state desynchronization issues, and coordinate translation mathematics.

### 🔄 SolidJS Reactivity Safety
- **PropertiesPanel Resolution:** A potential reactivity stale-value error was reviewed. In `PropertiesPanel.tsx`, canvas actions could trigger updates on `activeLayer()` when layers were being added, deleted, or merged. This has been resolved by utilizing a stable memo (`safeLayer`) that checks and handles optional layer presence, preventing unhandled runtime errors in active-layer computations.
- **Synchronous vs Asynchronous State Sync:** The `workspaceSync.ts` module uses non-looping, single-direction side effects to synchronize the camera and viewport state without generating cyclic reactivity cascades.

### 📐 Geometry & Transformation Mathematics
- **Transform Control Safety:** In `transformGeometry.ts`, methods for scaling (`applyResizeHandle`) and rotation (`applyRotationDrag`) correctly handle negative width/height flips, aspect ratio constraints, and pan offsets.
- **Test Integrity:** The entire math suite (79 tests in `transform-geometry.test.ts` and 80 tests in `modern-crop-geometry.test.ts`) is passing, ensuring core visual transformation logic remains consistent and regression-free.

---

## 3. User Experience & Usability Assessment

We audited the application from an end-user perspective, assessing data safety, workflow friction, and canvas interaction controls.

### 💾 Gaps in Crash Recovery & Auto-Save
- **Usability Risk:** The application lacks background auto-saving or draft recovery. While closing the window cleanly via UI handles prompts the user to save, an abrupt process termination (e.g., system reboot, out-of-memory crash, WebGL driver crash) results in 100% loss of unsaved changes.
- **Recommendation:** Implement a background auto-save cycle that writes the document model and layer bitmap caches to the application’s cache directory, restoring open tabs upon crash recovery.

### 🎯 Bounding Box Hijack during Layer Selection
- **Usability Risk:** When the user clicks on the canvas to select a layer, the hit-test (`viewport/layerHitTest.ts`) checks only if the clicked coordinates fall inside the layer's transformed bounding box. It is not alpha-channel aware.
- **Impact:** Clicking transparent areas of a large, overlapping upper layer selects it, blocking the user from selecting visible layers underneath.
- **Recommendation:** Implement alpha-aware hit-testing (e.g., selecting only if the pixel alpha under the cursor is greater than 10%).

### ⚙️ Non-Functional "Constrain Aspect Ratio" Option Bar UI
- **Usability Risk:** The "Constrain" field in the Move Tool's option bar (`MoveOptionBar.tsx`) renders a static dropdown `<SelectField value="Lock Aspect Ratio" />` that is not bound to any reactive state.
- **Impact:** Users cannot toggle proportional scaling as a default behavior and are forced to hold the `Shift` key during every single resizing operation.
- **Recommendation:** Bind the field to a new `lockAspectRatio` signal in the editor state and respect it inside the canvas resize handlers.

### 🖌️ Jagged Brush Strokes due to Lack of Input Coalescing
- **Usability Risk:** During rapid drawing or painting gestures on high-frequency monitors or stylus digitizers, the stroke path displays straight segments and jagged corners instead of smooth curves. This occurs because the pointer move handler in `useCanvasPointerTools.ts` reads only the standard rate-limited event ticks.
- **Recommendation:** Loop through `e.getCoalescedEvents()` to capture sub-frame cursor coordinates, ensuring high-fidelity curves.

### 🔍 Missing Precision Magnifier for the Eyedropper
- **Usability Risk:** The Eyedropper tool samples colors directly under the pointer tip without providing any zoomed-in grid or magnified preview. This makes picking individual pixels in high-resolution documents extremely difficult.
- **Recommendation:** Render a pixel magnification HUD overlay next to the cursor when the Eyedropper tool is active.

### ⛓️ No Multi-Layer Selection or Group Transform
- **Usability Risk:** Users can select and move only a single layer at a time. Workflows requiring moving, rotating, or resizing multiple layers together are not supported.
- **Recommendation:** Extend the editor selection state to support multi-layer selections and apply transforms in unison across all selected layers.

### 🖌️ Aspect/Rotation Skew in Brush Cursor Preview (Stretched Layer Mismatch)
- **Usability Risk:** The brush cursor outline (`BrushCursorOverlay.tsx`) renders as a perfect circle based solely on the global zoom level. It does not account for the selected layer's individual scale factor (`scaleX`, `scaleY`) or rotation.
- **Impact:** If the active layer is stretched (e.g., scaleX = 2.0) or rotated, the painted stroke will render as a stretched oval, but the cursor outline remains a static circle. This visual mismatch makes precise editing on transformed layers impossible.
- **Recommendation:** Transform the brush cursor ring SVG elements using the selected layer's transform matrix so that it correctly previews skew, scale, and orientation.

### 🧲 Stuck Drag State on Aborted OS File Drags
- **Usability Risk:** When a user drags a file from the OS File Explorer into the application, `DragGlobalGuard` (`DragController.tsx`) intercepts the dragover event and begins a file-drag session (`dragKind = "file"`). However, if the user moves their cursor out of the window and releases the drag (aborting the drop), there is no document-level listener to clean up the state.
- **Impact:** The internal state `dragKind` remains stuck as `"file"` in the background, causing persistent UI drop highlights or blocking subsequent click/drag inputs in the application shell.
- **Recommendation:** Attach document-level listeners for `"dragleave"` and `"drop"` inside `DragGlobalGuard` to safely call `dragController.endDrag()` when an external drag session leaves the window or completes elsewhere.

### 🔄 Missing Canvas Viewport Rotation (Rotate View Tool)
- **Usability Risk:** Traditional graphics editors allow users (especially digital artists using drawing tablets) to rotate the entire viewport canvas to sketch lines and paint details at comfortable hand angles.
- **Impact:** The viewport navigation camera only supports panning (translation) and zooming (scaling). Rotational navigation is not supported.
- **Recommendation:** Extend the `camera.ts` matrix computations to support viewport rotation angles, and provide a Rotate View tool.

### 🎨 Smudged Pixels under High Zoom (Hardcoded Bilinear Texture Filtering)
- **Usability Risk:** The WebGL renderer (`renderer/webgl2.ts`, line 263) hardcodes the texture magnification filter to `gl.LINEAR`.
- **Impact:** When zooming in closely (e.g., >400% zoom) to perform pixel-level edits or mask retouching, the image appears extremely blurry and anti-aliased instead of crisp and pixel-perfect. This renders the editor unsuitable for pixel art, icon design, or detailed mask cleanup.
- **Recommendation:** Switch the magnification filter dynamically to `gl.NEAREST` when the zoom level exceeds 200% (or provide a toggle in the UI for filtering preferences).

---

## 4. Error Handling & Resiliency Assessment

We audited the application's stability boundaries, panic recovery mechanisms, and exception logging in both frontend and backend layers.

### 🚫 Lack of SolidJS UI Error Boundaries
- **Usability Risk:** SolidJS is built on a reactive dependency graph. If any component throws an uncaught rendering error or fails in a reactive side effect, SolidJS halts execution of that reactive branch. Without an `<ErrorBoundary>`, this crashes the entire screen or viewport silently, leaving the UI completely frozen and unresponsive.
- **Recommendation:** Wrap major application regions (such as the main Canvas Viewport, Layer Panel, and Toolbar rails) in SolidJS's native `<ErrorBoundary>` components to display a friendly fallback layout and allow document recovery.

### 🔇 Silent Backend App Crashes (Panic Hooks)
- **Usability Risk:** In the Rust backend (`main.rs`), if a panic occurs in a thread or Tauri command, the application immediately terminates. Because desktop users launch the app as a window without an attached console terminal to view stderr, the application vanishes from the screen with no logs, crash dumps, or error dialogs.
- **Recommendation:** Implement a custom panic handler using `std::panic::set_hook` that captures backtraces, logs them to a `.log` file inside the local App Data directory, and prompts the user with a diagnostic crash message.

### ☣️ Mutex Poisoning Panic Hazard
- **Location:** `commands.rs` (line 37) inside `get_pending_open_path`.
- **Vulnerability:** The lock on `CliState` is acquired via `.lock().unwrap()`. If a thread panics while holding the mutex guard, the mutex becomes poisoned. Any subsequent call to `unwrap()` on a poisoned lock will panic, crashing the entire application process.
- **Recommendation:** Handle mutex results safely to avoid panics on poisoned locks (e.g., using `unwrap_or_else(|e| e.into_inner())`).

---

## 5. Developer Findings & Recommendations

We identified a few developer-experience and configuration inconsistencies during the audit:

### ⚠️ Issue 1: Outdated Test Paths in `test:dialogs`
- **Location:** `apps/desktop/package.json`
- **Description:** The package script `"test:dialogs"` is defined as:
  ```json
  "test:dialogs": "vitest run --maxWorkers=1 src/components/editor/__tests__/ResizeCanvasModal.test.tsx src/components/editor/__tests__/ExportDialog.test.tsx src/components/editor/__tests__/DialogProvider.test.tsx"
  ```
  However, these test files were refactored and moved to the `src/components/editor/dialogs/__tests__/` subdirectory.
- **Impact:** Running `bun run test:dialogs` fails with `No test files found, exiting with code 1`.
- **Mitigation:** Update the paths in `apps/desktop/package.json` to:
  ```json
  "test:dialogs": "vitest run --maxWorkers=1 src/components/editor/dialogs/__tests__/ResizeCanvasModal.test.tsx src/components/editor/dialogs/__tests__/ExportDialog.test.tsx src/components/editor/dialogs/__tests__/DialogProvider.test.tsx"
  ```

### ⚠️ Issue 2: JSDOM Thread Pool Worker Timeouts (Windows)
- **Location:** Vitest execution in the verify pipeline
- **Description:** Concurrently running all 120+ JSDOM component test suites in the Windows environment sometimes results in thread-runner exhaustion and timeouts (e.g., `Timeout waiting for worker to respond`).
- **Mitigation:**
  - Running single test files in isolation succeeds reliably.
  - Adding `--maxWorkers=1` or running tests in chunks on resource-constrained local/CI machines prevents thread worker stalls.

---

## 5. Conclusion

The **Photrez** project adheres to solid security and reactivity principles. However, resolving the developer test script paths and polishing the user experience gaps (auto-save recovery, alpha-aware selection, functional aspect ratio constraint) will significantly improve the product's quality and workflow speed.
