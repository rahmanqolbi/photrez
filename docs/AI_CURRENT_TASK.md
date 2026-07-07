# Current Task: Edge Auto-Scroll — Refactor: extract shared applyEdgeScroll [COMPLETE]

**Status**: COMPLETE

## Task Description
Fix code review findings for Task 2:
1. Extract duplicate edge math into shared `applyEdgeScroll(dt)` helper
2. Remove stale container ref capture in RAF closure
3. Rename `MAX_SCROLL_SPX` to `MAX_EDGE_SCROLL_PX_PER_SEC`

## Verification
- ✅ Build green (`bun run build` completed successfully)
- ✅ All 2286 frontend tests passed


