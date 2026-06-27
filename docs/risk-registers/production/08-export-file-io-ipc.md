# Export, File IO, and IPC Risks

Hotspots:

- `apps/desktop/src/components/editor/ExportDialog.tsx`
- `apps/desktop/src/components/editor/exportDocument.ts`
- `apps/desktop/src/engine/layerComposite.ts`
- `apps/desktop/src-tauri/src/main.rs`
- `docs/reference/command-contract-spec.md`
- `docs/reference/file-format-support.md`
- `docs/reference/error-code-registry.md`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-EXPORT-001 | P0 | Exported image differs from visible editor | Canvas 2D export composite diverges from WebGL renderer | E2E export pixel parity for opacity, transform, visibility |
| PBR-EXPORT-002 | P0 | Export writes wrong file type or invalid bytes | MIME, extension, encoder, or quality mapping drift | Magic byte tests for PNG/JPEG/WebP |
| PBR-EXPORT-003 | P0 | Save overwrites or writes after dialog cancel | Dialog cancel path not respected or stale path reused | Cancel test and manual native dialog smoke |
| PBR-EXPORT-004 | P1 | Large export freezes or crashes app | Full composite plus base64 IPC duplicates memory | Large document memory/perf gate |
| PBR-EXPORT-005 | P1 | Invisible or locked layers unexpectedly included/excluded | Export composite ignores layer visibility or transform state | Export tests for invisible, opacity, transform, locked |
| PBR-EXPORT-006 | P1 | File IO error is swallowed or shown as success | Tauri error envelope not handled by UI | Error-path tests for invalid path/permission |
| PBR-EXPORT-007 | P1 | IPC contract docs and runtime contract version disagree | Runtime `contract_version` changes without docs/tests update | Contract test against `get_contract_info` and spec |
| PBR-EXPORT-008 | P1 | Unicode, long, or Windows-reserved paths fail unexpectedly | Path handling not tested outside simple ASCII temp files | Native file IO tests/manual smoke with spaces/unicode paths |
| PBR-EXPORT-009 | P2 | JPEG/WebP quality slider behaves nonlinearly or accepts invalid values | UI range and encoder quality range differ | Quality clamp tests at 0, 1, min, max |
| PBR-EXPORT-010 | P2 | Alpha in PNG/WebP differs at layer edges | Premultiplied vs straight alpha mismatch | Edge alpha pixel tests |
| PBR-EXPORT-011 | P2 | Export dialog remains open or disabled after failure | Async state not reset in `finally` | Failure UI state test |
| PBR-EXPORT-012 | P3 | Suggested filename extension mismatches selected format | Display name/path helper not updated on format switch | Dialog interaction test |

## Production Review Checklist

- Verify visible canvas vs exported pixels for transformed layers.
- Verify output magic bytes and dimensions for all formats.
- Verify cancel, permission error, invalid path, and large document behavior.
- Verify IPC envelope version and error codes stay documented.
- Run real Tauri manual smoke for native save dialog before release.

