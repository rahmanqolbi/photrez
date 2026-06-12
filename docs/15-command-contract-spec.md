# 15 - Command Contract Specification (MVP Baseline)

This file defines the authoritative IPC contract between Shell (Tauri) and Rust Core.

## 1) Contract Metadata

- Contract name: `photrez-command-contract`
- Current version: `1.0.0`
- Transport: Tauri command invoke (request/response)
- Encoding: JSON

## 2) Canonical Response Envelope

All command responses MUST follow exactly one of these envelopes.

Success:

```json
{
  "ok": true,
  "contract_version": "1.0.0",
  "data": {}
}
```

Error:

```json
{
  "ok": false,
  "contract_version": "1.0.0",
  "error": {
    "code": "E_VALIDATION",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

Rules:

- `ok` is required.
- `contract_version` is required in both success and error.
- `error.details` is optional and must be JSON-serializable.
- No mixed envelope (`ok: true` with `error`, or `ok: false` with `data`).

## 3) Standard Error Codes

| Code | Meaning | Typical HTTP Analogy |
| --- | --- | --- |
| `E_VALIDATION` | Payload shape/value invalid | 400 |
| `E_NOT_FOUND` | Target resource/document/layer not found | 404 |
| `E_CONFLICT` | State conflict (version mismatch/invalid order) | 409 |
| `E_UNSUPPORTED` | Feature/operation not supported in MVP | 422 |
| `E_RESOURCE_LIMIT` | Memory/dimension/size guardrail exceeded | 413 |
| `E_IO` | File read/write failure | 500 |
| `E_INTERNAL` | Unexpected internal failure | 500 |
| `E_TIMEOUT` | Operation timed out | 504 |

Notes:

- Keep `message` concise and user-safe.
- Internal diagnostic detail should go into logs, not sensitive response text.

## 4) Versioning Rules

- Patch (`1.0.x`): non-breaking changes (new optional fields, better messages).
- Minor (`1.x.0`): additive backward-compatible command/data expansion.
- Major (`x.0.0`): breaking schema/envelope semantics.
- Any breaking change requires ADR update and migration note.

## 5) Request Model Baseline

For command payloads, use deterministic field names and explicit IDs.

Conventions:

- IDs are string-based (`doc_id`, `layer_id`).
- Coordinates are numeric pixels (`x`, `y`, `width`, `height`).
- Angles in degrees (`rotate_deg`).
- Opacity in range `[0..1]`.
- Booleans are explicit (`flip_x`, `flip_y`, `preserve_aspect`).

## 6) Milestone 1 Baseline Commands

### 6.1 `ping`

Purpose: bridge health check.

Request:

```json
{}
```

Success `data`:

```json
{
  "status": "ok",
  "service": "core"
}
```

### 6.2 `get_contract_info`

Purpose: expose contract metadata to shell/tests.

Request:

```json
{}
```

Success `data`:

```json
{
  "name": "photrez-command-contract",
  "version": "1.0.0",
  "supported_commands": ["ping", "get_contract_info"]
}
```

## 7) Planned MVP Commands (Reserved Names)

These names are reserved to prevent drift during implementation:

- `create_document`
- `open_document`
- `close_document`
- `import_image`
- `add_layer`
- `delete_layer`
- `reorder_layer`
- `set_layer_opacity`
- `move_selection`
- `transform_layer`
- `crop_canvas`
- `resize_canvas`
- `brush_stroke_begin`
- `brush_stroke_move`
- `brush_stroke_end`
- `eraser_stroke_begin`
- `eraser_stroke_move`
- `eraser_stroke_end`
- `export_document`
- `undo`
- `redo`

If a new command name is needed, update this file first.

## 8) Example Error Cases

### Invalid opacity

```json
{
  "ok": false,
  "contract_version": "1.0.0",
  "error": {
    "code": "E_VALIDATION",
    "message": "opacity must be between 0 and 1",
    "details": {
      "field": "opacity",
      "received": 1.7
    }
  }
}
```

### Unsupported command in current milestone

```json
{
  "ok": false,
  "contract_version": "1.0.0",
  "error": {
    "code": "E_UNSUPPORTED",
    "message": "command is not available in this milestone",
    "details": {
      "command": "export_document",
      "milestone": 1
    }
  }
}
```

## 9) Contract Test Minimum

At minimum, contract tests must verify:

1. Envelope shape for success and error.
2. `contract_version` presence in all responses.
3. Deterministic `E_VALIDATION` on malformed payload.
4. Deterministic `E_UNSUPPORTED` for unavailable command paths.
5. No panic/uncaught failure leaks to shell.

## 10) Ownership and Change Control

- Primary owner: Core + Shell maintainers.
- Any change to envelope, versioning semantics, or error code set must update:
1. `docs/03-trd.md`
2. `docs/05-adr/0002-command-contract-versioning.md` (if breaking/major behavior)
3. Contract tests and evidence in milestone report.
