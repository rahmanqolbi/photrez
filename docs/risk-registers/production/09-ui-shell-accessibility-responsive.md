# UI Shell, Accessibility, and Responsive Risks

Hotspots:

- `apps/desktop/src/components/editor/EditorShell.tsx`
- `apps/desktop/src/components/editor/AppTitleBar.tsx`
- `apps/desktop/src/components/editor/LeftToolRail.tsx`
- `apps/desktop/src/components/editor/OptionBar.tsx`
- `apps/desktop/src/components/editor/BottomStatusBar.tsx`
- `apps/desktop/src/components/editor/ResizeCanvasModal.tsx`
- `apps/desktop/src/components/editor/ExportDialog.tsx`
- `apps/desktop/src/components/editor/Toast.tsx`
- `apps/desktop/src/index.css`
- `docs/UI_GUIDE.md`
- `docs/reference/design-tokens.md`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-UI-001 | P1 | Option bar controls overlap or disappear at common desktop widths | Breakpoints differ between Move/Crop/Brush/Transform bars | Responsive option bar tests around 768-880px |
| PBR-UI-002 | P1 | Keyboard focus trapped in modal/menu or shortcut leaks through modal | Focus/keydown listener order inconsistent | Modal/menu keyboard lifecycle tests |
| PBR-UI-003 | P1 | Tool rail button changes visual state but not active tool | Button click updates local UI or misses `setActiveTool` | Tool rail wiring tests for every button |
| PBR-UI-004 | P1 | Window controls fail outside Tauri or during tests | Tauri window API not guarded in browser environment | Desktop guard tests and Tauri smoke |
| PBR-UI-005 | P1 | Toast hides important error or disappears before user can read it | Max stack/auto-dismiss too aggressive for error class | Toast tests for error persistence/stacking if severity added |
| PBR-UI-006 | P2 | Text/icon buttons have insufficient accessible labels | Icon-only controls lack `aria-label` or tooltip | A11y audit for toolbar, option bars, dialogs |
| PBR-UI-007 | P2 | Click targets are too small for touch/stylus/high-DPI users | Compact tool UI falls below target size | UI audit against documented ergonomic dimensions |
| PBR-UI-008 | P2 | Dark/light neutral contrast fails in panels/status text | Hard-coded color or token mismatch | Contrast scan for current theme |
| PBR-UI-009 | P2 | Empty workspace accepts drop but UI does not communicate target behavior | Drop affordance missing after global drop migration | Empty workspace/drop affordance test |
| PBR-UI-010 | P2 | Status bar shows stale mode after document close or tool switch | Status reads stale derived signal | Status bar state tests after close/switch |
| PBR-UI-011 | P2 | Dialog Escape conflicts with crop cancel or menu close | Multiple Escape handlers on window | `defaultPrevented` and modal priority tests |
| PBR-UI-012 | P3 | Tooltip system TODO leaves icon-heavy controls unclear | MVP lacks complete tooltip system | Track in UI guide and add labels where feasible |

## Production Review Checklist

- Check option bars at narrow, 1080p, and wide desktop widths.
- Check keyboard-only access for menus/dialogs/tool rail.
- Verify Escape and Ctrl+Z priority when modal or crop mode is active.
- Verify icons have labels or tooltips where meaning is not obvious.
- Verify visual design token usage after any CSS edit.

