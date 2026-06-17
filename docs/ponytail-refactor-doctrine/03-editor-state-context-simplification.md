# Editor State And Context Simplification

## Current Problem

`EditorContext` is useful but too broad. It is easy for any component to read or mutate too much. Tests also mock the broad shape, so the mock shape starts becoming the real contract.

## Ponytail Decision

Do not replace Solid context with a new state library.

Do split the current context into smaller hooks only where it removes real coupling.

## What To Keep

- Solid signals.
- Provider pattern.
- `useEditor()` as a temporary compatibility facade.
- Existing workspace/render/camera concepts.

## What To Discard

- fallback objects like empty workspace/renderer/scheduler values,
- broad partial mocks in tests,
- debug global as an implicit public API,
- components reading editor-wide context when they only need one field.

## Minimum Target Contexts

```text
WorkspaceContext
  activeSession
  activeEngine
  activeHistory
  switchDocument
  open/close document operations

ViewportContext
  camera
  viewportState
  coordinate adapter
  fit/zoom/pan operations

ToolContext
  activeTool
  setActiveTool
  active tool state
  cancelActiveInteraction

NotificationContext
  showToast

NativeIOContext
  openImageDialog
  saveDialog
  readFileBytes
  writeFileBytes
```

Do not create these all at once. Extract only when a file is touched and the extraction deletes coupling.

## Minimal Implementation Pattern

Start with one split:

```ts
export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("WorkspaceContext missing");
  return ctx;
}
```

No fallback object.

Tests must mount a typed provider.

## Test Fixture Rule

Create test builders instead of broad casts:

```ts
const fixture = createEditorFixture();
render(() => (
  <WorkspaceProvider value={fixture.workspace}>
    <ViewportProvider value={fixture.viewport}>
      <Subject />
    </ViewportProvider>
  </WorkspaceProvider>
));
```

The fixture should be boring and typed. It should not be a test framework inside the app.

## What Not To Build

- Redux/Zustand/MobX migration.
- Dependency injection container.
- Generic provider composer with magic names.
- Runtime schema validation for every context field.
- Context factory that hides which state is mounted.

## Minimum Proof

Before declaring this refactor successful:

- one production component uses the narrower context,
- one test uses the typed fixture without `as any`,
- `useEditor()` still works for untouched code,
- missing provider fails loudly,
- no user-visible behavior changed.

