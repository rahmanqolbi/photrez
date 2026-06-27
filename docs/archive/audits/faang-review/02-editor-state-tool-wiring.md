# Editor State and Tool Wiring Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-STATE-001 | Mitigated | Test-only fallback in production hook hides missing providers | 2026-06-18: `useEditor()` throws outside `EditorProvider`; tests use explicit providers or `workspaceOverride`. | Keep provider-contract test coverage. |
| FRR-STATE-002 | Mitigated | Active tool is not a typed union | 2026-06-18: `ToolId` union now types `createEditorState()`, `EditorContextValue.activeTool`, `setActiveTool`, toolbar item IDs, cursor/input aliases, and pasteboard click policy. | Keep new tool additions wired through `ToolId`. |
| FRR-STATE-003 | Must Fix | Context value is too broad to review safely | The provider spreads `...editorState`, `...cropState`, `...modernCropState`, plus services and feature flags into one object. | Split state by domain: workspace, viewport, tool, crop, paint, shell dialogs. |
| FRR-STATE-004 | Mitigated | Global test introspection leaks into all browser windows | `window.__photrezEditor` is guarded by `shouldExposeEditorDebugHandle()` and tests assert production mode does not expose it. | Keep dev/test-only exposure policy explicit. |
| FRR-STATE-005 | Mitigated | Tool cleanup lifecycle now has typed registration | Tool switch cleanup now runs through `toolLifecycle.ts`, where `TOOL_CLEANUP_HANDLERS satisfies Record<ToolId, ...>` forces every typed tool to declare cleanup behavior. Runtime fallback still clears shared transient state for legacy/cast inputs. | Keep lifecycle registry tests and add tool-specific cleanup handlers when new tool state is introduced. |
| FRR-STATE-006 | Must Fix | Multiple global keyboard listeners create priority risk | `AppTitleBar`, `LeftToolRail`, modals, crop overlay, context menu, and canvas keyboard all use window keydown listeners. | Centralize keyboard routing with modal/tool priority and tests. |
| FRR-STATE-007 | Should Fix | Tests rely heavily on `as any` mocks for editor context | Test scan shows high `as any` counts in input handler and component tests. | Create typed test builders/fakes instead of structural casts. |
| FRR-STATE-008 | Should Fix | Tool wiring depends on many separate registration points | Existing AGENTS docs already call out tool union, keyboard, pointer handler, toolbar, option bar, cursor, undo/status/context wiring. | Generate a tool registration table or use compile-time route map. |

## 2026-06-18 Execution Update

- FRR-STATE-001: mitigated. `useEditor()` now throws outside `EditorProvider`.
- Tests that previously relied on the fake fallback now use an explicit `EditorProvider` wrapper or `DragControllerProvider.workspaceOverride`.
- FRR-STATE-004: mitigated. `window.__photrezEditor` is guarded and production mode is tested.
- FRR-STATE-002: mitigated. `ToolId` now guards active tool state and key call sites at compile time.
- FRR-STATE-005: mitigated. Active tool switch cleanup now uses a typed per-tool lifecycle registry instead of hardcoded cleanup directly inside `EditorContext`.
- FRR-STATE-003, FRR-STATE-006, FRR-STATE-007, and FRR-STATE-008 remain follow-up review risks.

## Feature/Tool Impact

- New tools can pass unit tests but fail in the app if dispatcher wiring is missed.
- UI tests can overfit fake providers and stop enforcing production provider contracts.
- Global keyboard behavior can regress when modal, crop, brush, and titlebar handlers overlap.

## Merge Bar

- No production `useEditor()` fallback.
- `activeTool` uses the project-wide `ToolId` union.
- New tools register through a single typed manifest or have generated checklist tests.
- Keyboard routing has an explicit priority model.
