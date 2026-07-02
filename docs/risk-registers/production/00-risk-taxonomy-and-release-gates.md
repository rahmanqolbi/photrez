# Risk Taxonomy and Release Gates

This document describes the shared bug classes used by the per-feature risk files.

## Recurring Production Bug Classes

| Class | Typical symptom | Common root cause | Minimum guard |
| --- | --- | --- | --- |
| Wiring no-op | UI renders, click/drag/shortcut does nothing | Entry component, dispatcher, keyboard handler, or provider not connected | Wiring test from real entry component |
| Signal desync | Canvas/layers/status disagree | Engine mutated but Solid signal sync missed a field | Engine-signal contract test |
| Viewport drift | Pixels and overlays separate after zoom/pan/fit | Mixed coordinate source or stale camera read in render memo | Browser or integration geometry test |
| History gap | Undo skips action or restores partial state | Missing `history.commit()` before mutation | Undo/redo regression test |
| Tool state leak | Cursor/overlay/drag state survives tool switch | Transient signals not cleared on active tool change | Tool switch round-trip test |
| Listener leak | Action fires twice or after modal closes | Missing `onCleanup()` or sibling window listener conflict | Mount/unmount listener test |
| Pointer capture loss | Drag gets stuck or commits partial state incorrectly | `pointercancel`/`lostpointercapture` not handled | Pointer chain test with cancel/lost capture |
| Tauri/browser split | Works in browser test but fails in desktop | Browser-only mock misses Tauri runtime or file-system behavior | Tauri smoke/manual gate |
| Renderer parity drift | Export differs from visible canvas | Canvas 2D and WebGL paths diverge | Pixel/E2E export parity test |
| Resource pressure | Slowdown, OOM, context loss | Large bitmaps, texture leaks, base64 duplication | Memory/perf budget gate |

## Mandatory Release Gates

Run all applicable gates before marking a production-facing task complete:

```powershell
bun run --filter photrez-desktop test
bun run build
cargo test -p photrez-core
cargo test --workspace
```

For app-level or Tauri command changes:

```powershell
bun run tauri dev
```

For editor interaction changes:

```powershell
bun run --filter photrez-desktop exec playwright test
```

## Triage Order

When a production report arrives:

1. Reproduce in the real app first if the bug mentions file dialogs, OS drag/drop, save/export, window controls, or native menu behavior.
2. Classify by symptom: no-op, wrong pixels, wrong state, crash, performance, data loss.
3. Check the matching per-feature file in this folder.
4. Search `AI_HISTORY.md` for the same class before changing code.
5. Add the failing wiring/contract/integration test before the fix.
6. Update `AI_HISTORY.md` with Root Cause and Fix Rationale after the fix.

## Bug ID Convention

Use IDs in future docs/issues with this shape:

```text
PBR-AREA-###
```

Examples: `PBR-GLOBAL-001`, `PBR-CROP-004`, `PBR-EXPORT-002`.

