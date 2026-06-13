# 35 - Error Code Registry (MVP)

This document maps specific error scenarios to error codes and user-facing messages.

Base error codes are defined in `docs/reference/command-contract-spec.md`.
UI message format follows `docs/archive/planning/28-ui-copy-guidelines.md`.

## 1) Message Format

```
<what happened>. <what user can do>. (Error: <CODE>)
```

## 2) File Operations

| Scenario | Code | User Message | Internal Log |
| --- | --- | --- | --- |
| File extension not in supported list | `E_VALIDATION` | `Unsupported file format. Please choose JPG, PNG, WebP, BMP, or GIF.` | `import_rejected: ext={ext}` |
| File magic bytes don't match extension | `E_VALIDATION` | `File appears to be damaged or misnamed. Try a different file.` | `magic_mismatch: expected={ext}, found={actual}` |
| Image decode failure | `E_VALIDATION` | `Cannot read this image file. It may be corrupted.` | `decode_error: {decoder_error}` |
| Image dimensions exceed max | `E_RESOURCE_LIMIT` | `Image is too large to open ({w}x{h}). Maximum is 16384x16384.` | `dimension_exceeded: {w}x{h}` |
| Decoded size exceeds memory budget | `E_RESOURCE_LIMIT` | `Image requires too much memory. Try a smaller image.` | `memory_exceeded: {bytes} > MAX_PIXEL_BUDGET` |
| File path not accessible | `E_IO` | `Cannot access the selected file. Check file permissions.` | `io_error: {os_error}` |
| Export write failed | `E_IO` | `Cannot save file. Check destination path and try again.` | `export_write_error: {path}, {os_error}` |
| Export path not writable | `E_IO` | `Cannot write to this location. Choose a different folder.` | `path_not_writable: {path}` |

## 3) Document Operations

| Scenario | Code | User Message | Internal Log |
| --- | --- | --- | --- |
| New doc dimensions invalid (zero/negative) | `E_VALIDATION` | `Canvas dimensions must be between 1 and 16384.` | `invalid_dimensions: {w}x{h}` |
| New doc memory exceeds budget | `E_RESOURCE_LIMIT` | `Canvas size exceeds maximum. Try smaller dimensions.` | `canvas_budget_exceeded: {w}x{h}` |
| Document not found (internal) | `E_NOT_FOUND` | `Document not found. It may have been closed.` | `doc_not_found: {doc_id}` |

## 4) Layer Operations

| Scenario | Code | User Message | Internal Log |
| --- | --- | --- | --- |
| Delete last remaining layer | `E_CONFLICT` | `Cannot delete the only layer. Add another layer first.` | `delete_last_layer: {layer_id}` |
| Layer not found | `E_NOT_FOUND` | `Layer not found. It may have been deleted.` | `layer_not_found: {layer_id}` |
| Opacity out of range | `E_VALIDATION` | `Opacity must be between 0% and 100%.` | `opacity_range: {value}` |
| Reorder index out of bounds | `E_VALIDATION` | `Invalid layer position.` | `reorder_bounds: idx={idx}, max={max}` |
| Edit on locked layer | `E_CONFLICT` | `This layer is locked. Unlock it to make changes.` | `layer_locked: {layer_id}` |

## 5) Selection/Transform Operations

| Scenario | Code | User Message | Internal Log |
| --- | --- | --- | --- |
| Selection bounds exceed canvas | `E_VALIDATION` | `Selection extends beyond canvas bounds.` | `selection_bounds: {rect}` |
| Transform with zero dimension | `E_VALIDATION` | `Transform dimensions must be greater than zero.` | `transform_zero: {dimension}` |
| Crop bounds invalid | `E_VALIDATION` | `Crop area is invalid. Adjust the crop bounds.` | `crop_invalid: {rect}` |
| Crop bounds exceed canvas | â€” | Allowed for canvas expansion | crop_overflow: {rect} (Deprecated) |
| Resize dimensions invalid | `E_VALIDATION` | `Resize dimensions must be between 1 and 16384.` | `resize_invalid: {w}x{h}` |

## 6) Brush/Eraser Operations

| Scenario | Code | User Message | Internal Log |
| --- | --- | --- | --- |
| Brush size out of range | `E_VALIDATION` | `Brush size must be between 1 and 500.` | `brush_size_range: {value}` |
| No active layer for drawing | `E_CONFLICT` | `Select a layer to draw on.` | `no_active_layer_for_draw` |
| Draw on locked layer | `E_CONFLICT` | `This layer is locked. Unlock it to draw.` | `draw_on_locked: {layer_id}` |

## 7) Export Operations

| Scenario | Code | User Message | Internal Log |
| --- | --- | --- | --- |
| Quality value out of range | `E_VALIDATION` | `Quality must be between 0% and 100%.` | `quality_range: {value}` |
| No document open | `E_CONFLICT` | `No document to export. Open or create one first.` | `export_no_document` |
| Encoder failure | `E_INTERNAL` | `Export failed unexpectedly. Try a different format.` | `encoder_error: {format}, {error}` |

## 8) System/Contract Operations

| Scenario | Code | User Message | Internal Log |
| --- | --- | --- | --- |
| Command not available in milestone | `E_UNSUPPORTED` | `This feature is not available yet.` | `unsupported_command: {cmd}, milestone={m}` |
| Malformed command payload | `E_VALIDATION` | `Invalid request. Please try again.` | `payload_malformed: {cmd}, {details}` |
| Internal panic/unexpected error | `E_INTERNAL` | `Something went wrong. Please restart the app.` | `internal_panic: {stack}` |
| Operation timeout | `E_TIMEOUT` | `Operation took too long. Try with a smaller image.` | `timeout: {cmd}, {duration_ms}` |
| Undo on empty stack | â€” | No error (silent no-op) | `undo_empty_stack` |
| Redo on empty stack | â€” | No error (silent no-op) | `redo_empty_stack` |

## 9) Severity Classification

| Severity | Behavior | Example |
| --- | --- | --- |
| **Blocking** | Dialog with action required | Export write failure, decode failure |
| **Warning** | Toast/snackbar, auto-dismiss | Undo on empty stack (optional) |
| **Silent** | Internal log only | Autosave write failure |

## 10) Change Control

- New error scenarios must be added to this file.
- Error codes must match `docs/reference/command-contract-spec.md`.
- User messages must follow `docs/archive/planning/28-ui-copy-guidelines.md` format.
