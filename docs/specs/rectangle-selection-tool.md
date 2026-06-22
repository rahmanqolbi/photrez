# Rectangle Selection Tool — Design Spec

> **Status:** Draft
> **Created:** 2026-06-13
> **Scope:** MVP Phase 1

---

## 1. Overview

Rectangle Selection tool allows users to create rectangular selections on the canvas, move selection boundaries, rotate selection boundaries, and perform operations (cut/copy/paste/delete) on selected pixels.

### Goals
- Solve real pain points from other editors (established image editors)
- Scalable and maintainable architecture
- Isolated module — bugs in selection tool don't affect other tools
- Document-level selection (industry standard)

### Non-Goals (MVP)
- Elliptical/lasso/magic wand selection
- Multiple selections (add/subtract/intersect)
- Feathered edges
- Rotate content within selection (only rotate marquee boundary)

---

## 2. Data Model

### SelectionState (Extended)

```typescript
// apps/desktop/src/engine/types.ts
interface SelectionState {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // degrees, default 0, range [-180, 180]
}
```

### SelectionManager

```typescript
// apps/desktop/src/features/selection/SelectionManager.ts
class SelectionManager {
  private state: SelectionState | null = null;
  private history: SelectionSnapshot[] = [];
  private historyIndex: number = -1;
  
  // State access
  getState(): SelectionState | null;
  hasSelection(): boolean;
  
  // State mutations
  create(x: number, y: number, w: number, h: number, angle?: number): void;
  move(dx: number, dy: number): void;
  rotate(angle: number): void;
  clear(): void;
  
  // Operations
  deleteSelection(engine: DocumentEngine): void;
  copySelection(engine: DocumentEngine): ImageData | null;
  cutSelection(engine: DocumentEngine): ImageData | null;
  pasteSelection(engine: DocumentEngine, data: ImageData): void;
  invertSelection(engine: DocumentEngine): void;
  
  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

---

## 3. Input Handling

### Pointer Events

| Phase | Behavior |
|-------|----------|
| `handlePointerDown` | Start drawing selection, record start point |
| `handlePointerMove` | Update preview rect (with angle from option bar) |
| `handlePointerUp` | Commit selection if drag > 2px, else clear |

### Modifiers

| Modifier | Behavior |
|----------|----------|
| `Shift` | Constrain to square (1:1 ratio) |
| `Alt` | Draw from center (opposite corner anchored) |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+D` | Deselect |
| `Ctrl+I` | Invert selection |
| `Ctrl+X` | Cut |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste |
| `Delete` | Delete |
| `Escape` | Cancel drawing |

---

## 4. Rendering

### Selection Marquee

```tsx
// Rotated rect with marching ants animation
<g transform={`rotate(${angle}, ${centerX}, ${centerY})`}>
  <rect
    x={screenX}
    y={screenY}
    width={screenW}
    height={screenH}
    fill="none"
    stroke="#E15A17"
    stroke-width={1}
    stroke-dasharray="4 4"
    class="animate-dash"
    style={{ "pointer-events": "none" }}
  />
</g>
```

### Animation

- CSS `stroke-dashoffset` animation
- 4px dash, 4px gap
- Animate at 60fps

---

## 5. Option Bar

### Layout (Single Row)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [X: ___] [Y: ___]  [W: ___] [H: ___]  [Angle: ___°]  [Invert] [Deselect] │
└──────────────────────────────────────────────────────────────────────┘
```

### Controls

| Control | Type | Behavior |
|---------|------|----------|
| X, Y | Number input | Position of selection |
| W, H | Number input | Dimensions of selection |
| Angle | Number input | Rotation angle of marquee |
| Invert | Button | Invert selection |
| Deselect | Button | Clear selection |

---

## 6. File Structure

```
src/features/selection/
├── SelectionManager.ts         # Central state machine
├── SelectionTypes.ts           # TypeScript types
├── SelectionEvents.ts          # Event system
├── SelectionValidator.ts       # State validation
├── SelectionOperations.ts      # cut/copy/paste/delete
├── SelectionRenderer.tsx       # SVG marquee rendering
├── SelectionOptionBar.tsx      # UI option bar
├── SelectionErrorBoundary.tsx  # Error isolation
└── __tests__/
    ├── SelectionManager.test.ts
    ├── SelectionOperations.test.ts
    └── SelectionValidator.test.ts
```

---

## 7. Integration Points

### With DocumentEngine

- Selection state stored in `DocumentState.selection`
- Operations call engine methods (`deletePixels`, `copyPixels`, etc.)
- Undo/redo includes selection state changes

### With Existing Tools

- Selection tool registered in `tool-registry.ts`
- Shares viewport/camera infrastructure with other tools
- Does NOT import from move/crop tools (isolation)

### With UI Framework

- Uses SolidJS for rendering
- Uses existing component library (Button, Input, etc.)
- Follows existing styling patterns (CSS modules)

---

## 8. Isolation Architecture

### Code Isolation

- All selection logic in `src/features/selection/`
- No spread across existing files
- Clear module boundaries

### State Isolation

- `SelectionManager` encapsulates all selection state
- Engine only stores final state
- Validation prevents corrupt state

### Error Isolation

- `SelectionErrorBoundary` wraps selection components
- If selection crashes, app continues
- User can retry

### Testing Isolation

- Can test selection logic without rendering UI
- Can test selection operations without engine
- Can test rendering without state

---

## 9. Event System

```typescript
// Selection events
type SelectionEvent =
  | { type: 'created'; rect: SelectionRect }
  | { type: 'moved'; delta: Point }
  | { type: 'rotated'; angle: number }
  | { type: 'cleared' }
  | { type: 'operation:executed'; op: string };

// Other modules subscribe, don't directly call
selectionEvents.on('created', (e) => { ... });
```

---

## 10. Undo/Redo

### Selection State Changes

```typescript
// In SelectionManager
create(x, y, w, h, angle): void {
  this.history.commit(this.state); // ← BEFORE mutation
  this.state = { x, y, width: w, height: h, angle };
  this.notifyChange();
}
```

### History Stack

- Max 50 entries
- New mutation discards redo branch
- Selection state included in document undo/redo

---

## 11. Performance Considerations

### Rendering

- Use `requestAnimationFrame` for smooth updates
- Minimize re-renders with `React.memo` / SolidJS `Memo`
- Cache computed values

### State Updates

- Batch state updates
- Debounce option bar input changes
- Use efficient data structures

---

## 12. Testing Strategy

### Unit Tests

- `SelectionManager.test.ts` — state machine logic
- `SelectionOperations.test.ts` — cut/copy/paste/delete
- `SelectionValidator.test.ts` — state validation

### Integration Tests

- Selection tool integration with engine
- Selection tool integration with viewport
- Selection tool integration with other tools

### E2E Tests

- Full selection workflow
- Selection operations
- Undo/redo

---

## 13. Migration Notes

### From Current State

- Current `SelectionState` has no `angle` field
- Current selection has no operations
- Current selection has no option bar

### Backward Compatibility

- Default `angle` to 0 for existing selections
- Existing selection commands continue to work
- No breaking changes to engine API

---

## 14. Future Enhancements

### Phase 2

- Elliptical selection
- Lasso selection
- Magic wand selection
- Multiple selections (add/subtract/intersect)

### Phase 3

- Feathered edges
- Selection as mask
- Rotate content within selection
- Selection presets

---

## 15. References

### Design Decisions

- Document-level selection (industry standard)
- Single selection only (MVP)
- Rotate marquee boundary (not content)
- Option bar for angle input

### External References

- selection-tool references
- established image editor selection tools
- established web image editor selection tools

---

## 16. Open Questions

1. Should selection state be part of document undo/redo stack?
2. How should selection interact with crop tool?
3. Should selection be visible when switching to other tools?
4. How should selection persist across document save/load?

---

## 17. Approval

- [ ] Data Model
- [ ] Input Handling
- [ ] Rendering
- [ ] Option Bar
- [ ] File Structure
- [ ] Undo/Redo
- [ ] Isolation Architecture
- [ ] Event System
- [ ] Performance Considerations
- [ ] Testing Strategy
