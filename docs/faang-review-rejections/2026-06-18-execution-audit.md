# 2026-06-18 FAANG Rejection Execution Audit

Status: partial Phase 0 closure plus follow-up typed-contract hardening with verified code changes.

## Closed In This Pass

| ID | Result | Evidence |
| --- | --- | --- |
| FRR-EXEC-001 / FRR-SHELL-001 | Runtime contract drift reduced | `docs/reference/command-contract-spec.md` now documents the actual Tauri shell runtime contract: `2.0.0`, `ping`, `get_contract_info`, `read_file_bytes`, `write_file_bytes`. |
| FRR-SHELL-002 | Contract version single source hardened | `CONTRACT_VERSION` constant drives success/error envelopes and `get_contract_info`; tests assert the exact runtime command list. |
| FRR-SHELL-004 | Panic-on-serialization removed | Response helpers now convert serialization failures into `E_INTERNAL` envelopes instead of calling `unwrap()` on normal response paths. |
| FRR-SHELL-005 | File IO resource limit added | `read_file_bytes` and `write_file_bytes` reject payloads over 256MB with `E_RESOURCE_LIMIT`. Streaming is still a future improvement. |
| FRR-STATE-001 | Production context fallback removed | `useEditor()` now throws outside `EditorProvider`; tests use explicit providers or `workspaceOverride` instead of relying on fake production context. |
| FRR-EXEC-009 / FRR-TEST-004 | Root static-analysis scripts added | Root `type-check`, `lint`, and `audit` scripts exist; desktop `type-check` and `lint` scripts exist. |
| FRR-EXEC-007 | Debug handle remains guarded | Existing `shouldExposeEditorDebugHandle()` guard remains in place and is covered by debug exposure tests. |
| FRR-STATE-002 | Active tool state typed | `ToolId` now types editor active tool state, toolbar tool IDs, viewport aliases, crop actions, and pasteboard click policy. |
| FRR-LAYER-003 / FRR-DND-003 | Cross-doc engine calls typed | `crossDocLayerOps.ts` now uses a narrow `DocumentEngine`/`WorkspaceManager`-compatible facade and production callers pass `WorkspaceManager` directly without `any` casts. |
| FRR-DND-005 | File-drop mutation moved after decode | `addFilesAsLayers` now decodes the dropped-file batch before history commit/layer creation; read/decode failure returns no created layers and leaves the target document unchanged. |
| FRR-LAYER-004 / FRR-DND-006 | Cross-doc Alt-move guarded before target mutation | Alt-move now aborts before target copy when the source document cannot delete the dragged layer because it is the source document's last layer. |
| FRR-EXEC-005 / FRR-SHELL-003 | Shell path policy added | `read_file_bytes` and `write_file_bytes` now enforce explicit image import/export extension allowlists before filesystem read/write. |
| FRR-ARCH-002 | Active runtime diagram split from historical reference | `ARCHITECTURE.md` now has a concise active MVP runtime diagram and labels the old large diagram as historical/future-target reference only. |
| FRR-RENDER-003 | Required WebGL uniforms validated | Required layer shader uniforms now use `getRequiredUniformLocation()` and throw explicit missing-uniform errors. |
| FRR-RENDER-004 | WebGL preserve-buffer default disabled | WebGL context initialization now uses `WEBGL2_CONTEXT_OPTIONS` with `preserveDrawingBuffer: false`; export does not depend on WebGL backbuffer preservation. |
| FRR-RENDER-005 | WebGL context-loss lifecycle made explicit | `WebGL2Backend` now handles context lost/restored events, pauses GPU work while lost, rebuilds GL resources on restore, and notifies the viewport to re-upload active document textures. |
| FRR-RENDER-006 | Render/export blend parity gate added | `docs/reference/render-export-parity-matrix.md` documents MVP blend-mode parity; UI/export share `BLEND_MODE_OPTIONS`, and shader-only modes are blocked from the product UI until parity proof exists. |
| FRR-STATE-005 | Tool cleanup lifecycle registry added | `EditorContext` now delegates active-tool switch cleanup to `toolLifecycle.ts`; `TOOL_CLEANUP_HANDLERS` is compile-time checked against `ToolId` and has focused regression tests. |
| FRR-BRUSH-003 | Paint transformed-layer coordinate guard added | Paint strokes now map document points through `paintStrokeCoordinates.ts` and transformed-layer mask tests cover rotate, scale, and flip behavior. |
| FRR-BRUSH-002 | Paint history budget gate added | `paintHistoryBudget.ts` estimates full-layer snapshot retention vs dirty-region undo/redo patches; `perf:paint-history` runs the focused gate and `paint-history-performance-gate.md` documents the dirty-region proposal. |
| FRR-BRUSH-001 | Paint bitmap command boundary added | `paintCommitCommand.ts` centralizes paint history snapshot, engine bitmap mutation, renderer upload, and render scheduling; brush and eraser commit paths now call the same command helper. |
| FRR-MOVE-003 | Pointer capture helper added | Canvas pointer capture/release now uses `pointerCapture.ts` from `useCanvasPointerTools.ts`, replacing local ad-hoc try/catch blocks and preserving CanvasViewport pointer regression coverage. |

## Verification

- PASS: `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/DragController.test.tsx src/components/editor/__tests__/crossDocDragDropWiring.test.tsx` (70 tests).
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (77 files, 1079 tests).
- PASS: `pnpm.cmd run type-check`.
- PASS: `pnpm.cmd run lint` (currently a TypeScript static gate).
- PASS: `pnpm.cmd run build`.
- PASS: `cargo test -p photrez-desktop` (8 tests).
- PASS: `cargo test -p photrez-core` (85 tests).
- PASS: `cargo test --workspace`.
- PASS: `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/crossDocLayerOps.test.ts src/components/editor/__tests__/crossDocLayerOps.engine.test.ts src/components/editor/__tests__/crossDocDragDropWiring.test.tsx src/components/editor/__tests__/useCanvasLayerDrag.test.tsx` (4 files, 43 tests).
- PASS: latest follow-up `pnpm.cmd --filter photrez-desktop test --run` (79 files, 1198 tests).
- PASS: latest follow-up `pnpm.cmd run build` with workspace-local temp HOME after sandboxed pnpm home access failed.
- PASS: decode-first follow-up `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/crossDocLayerOps.engine.test.ts src/components/editor/__tests__/crossDocDragDropWiring.test.tsx src/components/editor/__tests__/engine-signal-contract.test.tsx` (3 files, 44 tests).
- PASS: decode-first follow-up `pnpm.cmd --filter photrez-desktop test --run` (79 files, 1199 tests).
- PASS: Alt-move follow-up `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/crossDocLayerOps.test.ts src/components/editor/__tests__/crossDocLayerOps.engine.test.ts src/components/editor/__tests__/useCanvasLayerDrag.test.tsx` (3 files, 24 tests).
- PASS: Alt-move follow-up `pnpm.cmd --filter photrez-desktop test --run` (79 files, 1201 tests).
- PASS: shell path policy `cargo test -p photrez-desktop` (10 tests).
- PASS: shell path policy `cargo test -p photrez-core` (85 tests).
- PASS: shell path policy `cargo test --workspace` (95 tests total; WebView2Loader copy warning observed because the DLL was in use, tests still passed).
- PASS: renderer uniform validation `pnpm.cmd --filter photrez-desktop test --run src/renderer/__tests__/webgl2-layer-copy.test.ts src/renderer/__tests__/webgl2-scissor.test.ts` (2 files, 34 tests).
- PASS: renderer uniform validation `pnpm.cmd --filter photrez-desktop test --run` (79 files, 1203 tests).
- PASS: WebGL context policy `pnpm.cmd --filter photrez-desktop test --run src/renderer/__tests__/webgl2-layer-copy.test.ts src/renderer/__tests__/webgl2-scissor.test.ts` (2 files, 35 tests).
- PASS: WebGL context policy `pnpm.cmd --filter photrez-desktop test --run` (79 files, 1204 tests).
- PASS: WebGL context-loss lifecycle `pnpm.cmd --filter photrez-desktop test --run src/renderer/__tests__/webgl2-layer-copy.test.ts src/renderer/__tests__/webgl2-scissor.test.ts` (2 files, 36 tests).
- PASS: WebGL context-loss lifecycle `pnpm.cmd --filter photrez-desktop test --run` (79 files, 1205 tests).
- PASS: WebGL context-loss lifecycle `pnpm.cmd run build` with workspace-local temp HOME.
- PASS: render/export blend parity gate `pnpm.cmd --filter photrez-desktop test --run src/engine/__tests__/blendModes.test.ts src/components/editor/__tests__/exportDocument.test.ts src/components/editor/__tests__/LayersPanel.test.tsx` (3 files, 19 tests).
- PASS: render/export blend parity gate `pnpm.cmd --filter photrez-desktop test --run` (80 files, 1208 tests).
- PASS: render/export blend parity gate `pnpm.cmd run build` with workspace-local temp HOME.
- PASS: tool cleanup lifecycle registry `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/toolLifecycle.test.ts src/components/editor/__tests__/CanvasViewport.test.tsx` (2 files, 91 tests).
- PASS: tool cleanup lifecycle registry `pnpm.cmd --filter photrez-desktop test --run` (81 files, 1211 tests).
- PASS: tool cleanup lifecycle registry `pnpm.cmd run build` with workspace-local temp HOME.
- PASS: paint transformed-layer coordinate guard `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/paintStrokeCoordinates.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts src/__tests__/transform-geometry.test.ts` (3 files, 104 tests).
- PASS: paint transformed-layer coordinate guard `pnpm.cmd --filter photrez-desktop test --run` (82 files, 1214 tests).
- PASS: paint transformed-layer coordinate guard `pnpm.cmd run build` with workspace-local temp HOME.
- PASS: paint history budget gate `pnpm.cmd --filter photrez-desktop perf:paint-history` (1 file, 5 tests).
- PASS: paint history budget gate `pnpm.cmd run perf:paint-history` (1 file, 5 tests).
- PASS: paint history budget gate follow-up `pnpm.cmd --filter photrez-desktop test --run` (83 files, 1219 tests).
- PASS: paint history budget gate follow-up `pnpm.cmd run build` with workspace-local temp HOME.
- PASS: paint command boundary `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/paintCommitCommand.test.ts src/components/editor/__tests__/CanvasViewport.test.tsx src/__tests__/history-audit.test.ts` (3 files, 131 tests).
- PASS: paint command boundary `pnpm.cmd --filter photrez-desktop test --run` (84 files, 1221 tests).
- PASS: paint command boundary `pnpm.cmd run build` with workspace-local temp HOME.
- PASS: pointer capture helper `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/pointerCapture.test.ts src/components/editor/__tests__/CanvasViewport.test.tsx` (2 files, 92 tests).
- PASS: pointer capture helper `pnpm.cmd --filter photrez-desktop test --run` (85 files, 1225 tests).
- PASS: pointer capture helper `pnpm.cmd run build` with workspace-local temp HOME.

## Remaining Review Risk

- `pnpm.cmd run audit` could not complete in sandbox because `pnpm audit` needs network access to `registry.npmjs.org`; an escalated retry was stopped after it exceeded the useful wait window.
- CI workflow was added after the initial Phase 0 pass in `.github/workflows/ci.yml`; successful remote CI/audit output still needs to be captured as release evidence.
- Native Tauri smoke/release proof is still separate from browser E2E proof.
- File IO still uses base64 payloads, so the 256MB cap mitigates worst-case memory risk but does not replace a future streaming design.
