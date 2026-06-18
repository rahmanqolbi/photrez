# Editor State and Tool Wiring Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-STATE-001 | Reject | Test-only fallback in production hook hides missing providers | `useEditor()` returns a partial fake `EditorContextValue` with `workspace: {} as any`, `renderer: {} as any`, `scheduler: {} as any`. | Remove fallback from production hook; use explicit test provider/helpers in tests. |
| FRR-STATE-002 | Reject | Active tool is not a typed union | `createEditorState()` uses `createSignal("move")`; `EditorContextValue.activeTool` is `Accessor<string>`. | Define `ToolId` union and route all tool selection through it. |
| FRR-STATE-003 | Must Fix | Context value is too broad to review safely | The provider spreads `...editorState`, `...cropState`, `...modernCropState`, plus services and feature flags into one object. | Split state by domain: workspace, viewport, tool, crop, paint, shell dialogs. |
| FRR-STATE-004 | Must Fix | Global test introspection leaks into all browser windows | `EditorProvider` assigns `window.__photrezEditor` whenever `window` exists. | Guard behind `import.meta.env.DEV` or explicit test flag; remove in production bundle. |
| FRR-STATE-005 | Must Fix | Tool cleanup is centralized but manually enumerated | Active tool switch cleanup clears specific signals. New tool state can be forgotten. | Register cleanup handlers per tool or use typed tool lifecycle hooks. |
| FRR-STATE-006 | Must Fix | Multiple global keyboard listeners create priority risk | `AppTitleBar`, `LeftToolRail`, modals, crop overlay, context menu, and canvas keyboard all use window keydown listeners. | Centralize keyboard routing with modal/tool priority and tests. |
| FRR-STATE-007 | Should Fix | Tests rely heavily on `as any` mocks for editor context | Test scan shows high `as any` counts in input handler and component tests. | Create typed test builders/fakes instead of structural casts. |
| FRR-STATE-008 | Should Fix | Tool wiring depends on many separate registration points | Existing AGENTS docs already call out tool union, keyboard, pointer handler, toolbar, option bar, cursor, undo/status/context wiring. | Generate a tool registration table or use compile-time route map. |

## 2026-06-18 Execution Update

- FRR-STATE-001: mitigated. `useEditor()` now throws outside `EditorProvider`.
- Tests that previously relied on the fake fallback now use an explicit `EditorProvider` wrapper or `DragControllerProvider.workspaceOverride`.
- FRR-STATE-002 through FRR-STATE-008 remain follow-up review risks.

## Feature/Tool Impact

- New tools can pass unit tests but fail in the app if dispatcher wiring is missed.
- UI tests can overfit fake providers and stop enforcing production provider contracts.
- Global keyboard behavior can regress when modal, crop, brush, and titlebar handlers overlap.

## Merge Bar

- No production `useEditor()` fallback.
- `activeTool` uses a project-wide `ToolId` union.
- New tools register through a single typed manifest or have generated checklist tests.
- Keyboard routing has an explicit priority model.
