# 17 - Test Matrix by Milestone (MVP)

This matrix maps milestone scope to required test layers, owner, and exit gate.

## 1) Test Type Legend

- `Unit`: module-level functional tests in Rust core.
- `Contract`: shell-core IPC envelope/payload/error tests.
- `Renderer Smoke`: viewport/render initialization sanity.
- `Failure-Path`: malformed input, I/O errors, unsupported flows.
- `Perf`: startup, idle RAM, installer size checks.

## 2) Owner Legend

- `Core`: Rust core maintainers.
- `Shell`: Tauri/frontend bridge maintainers.
- `Renderer`: wgpu/render maintainers.
- `Build`: packaging/release maintainers.

## 3) Matrix

| Milestone | Scope Area | Required Tests | Owner | Exit Gate |
| --- | --- | --- | --- | --- |
| M1 Foundation | Shell-core-renderer skeleton + baseline bridge | Contract (`ping`, `get_contract_info`), Renderer Smoke, compile smoke | Shell + Core + Renderer | App launches, baseline bridge deterministic, no crash on smoke path |
| M2 Document + Layer Core | document model, layer CRUD/reorder/opacity | Unit (`document`, `layers`), Contract (if payload changes), Failure-Path basic validation | Core (+ Shell if contract changed) | Layer CRUD/reorder/opacity tests pass |
| M3 Selection/Transform/Crop/Resize | selection move, scale/rotate/flip, crop/resize | Unit (`selection`, `transform`), Contract (command payload/validation), Failure-Path bounds/invalid values | Core + Shell | Image-manipulation workflows pass unit/contract checks |
| M4 Brush/Eraser | stroke pipeline baseline | Unit (`brush`), Renderer Smoke (stroke draw sanity), Failure-Path (invalid stroke params) | Core + Renderer | Brush/Eraser stable on target baseline scenarios |
| M5 Export + Hardening | JPG/PNG/WebP export | Unit (`export`), Failure-Path (I/O/invalid params), Contract (export response shape) | Core + Shell | Export reliability and output checks pass |
| M6 Perf Gate + Packaging | startup/RAM/installer | Perf (per `docs/reference/performance-measurement-protocol.md`) | Core + Shell + Build | All budgets pass or explicit conditional gate approved |

## 4) Minimum Command/Test Mapping

| Command / Capability | Unit | Contract | Failure-Path | Notes |
| --- | --- | --- | --- | --- |
| `ping` | No | Yes | No | Baseline bridge health check |
| `get_contract_info` | No | Yes | No | Contract visibility + version check |
| `add_layer` / `delete_layer` / `reorder_layer` / `set_layer_opacity` | Yes | Yes | Yes | Validation + deterministic error codes |
| `move_selection` / `transform_layer` | Yes | Yes | Yes | Bounds and payload validation required |
| `crop_canvas` / `resize_canvas` | Yes | Yes | Yes | Invalid dimension and overflow checks |
| Brush/Eraser stroke commands | Yes | Optional | Yes | Contract required if exposed via shell bridge |
| `export_document` | Yes | Yes | Yes | Encoder errors must return deterministic shape |
| `undo` / `redo` | Yes | Optional | Yes | History bounds and empty-stack behavior |

## 5) Exit Evidence Template (Per Milestone)

```md
## Test Evidence - M<id>

Scope:
- <what was implemented>

Commands executed:
- <test/build/type-check command list>

Results:
- Unit: PASS/FAIL
- Contract: PASS/FAIL/NA
- Renderer Smoke: PASS/FAIL/NA
- Failure-Path: PASS/FAIL/NA
- Perf: PASS/FAIL/NA

Notes:
- Skipped tests + reason:
- Known risks:
- Follow-up owner:
```

## 6) Gate Rules

- Milestone cannot be closed if required test layer is missing without explicit exception.
- Any exception must include:
1. reason,
2. risk impact,
3. owner,
4. due milestone for closure.

## 7) References

- `docs/spec/build-plan.md`
- `docs/archive/planning/08-milestone-1-execution.md`
- `docs/testing-policy.md`
- `docs/reference/command-contract-spec.md`
- `docs/reference/performance-measurement-protocol.md`
