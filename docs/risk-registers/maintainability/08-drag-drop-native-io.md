# Drag-Drop And Native IO

## MRR-DD-001: Drag-Drop Uses Multiple Event Systems

Severity: M1

Likely hard-to-maintain path:

- Cross-document layer drag uses HTML5 drag events.
- OS file drop uses Tauri native drag/drop behavior.
- Existing layer reorder uses pointer behavior.

Why this becomes painful in 6 months:

- Fixing one drag path can break another.
- Browser tests cannot prove all native file-drop behavior.
- Event state can be set by one producer and read by another path.

Recommended direction:

- Keep a single drag state machine that records source, target, event system, modifier state, and cleanup.
- Add wiring tests for each producer and consumer pair.
- Add a manual or automated Tauri-runtime smoke path for OS file drop.

## MRR-DD-002: Cross-Document Operations Use Adapter Casts

Severity: M2

Likely hard-to-maintain path:

- `crossDocLayerOps.ts` defines facades, but production integration still uses casts to bridge real workspace/engine behavior.

Why this becomes painful in 6 months:

- The facade can drift from real engine behavior.
- Tests may mock a capability that production does not provide.

Recommended direction:

- Replace casts with real adapter functions.
- Keep adapter tests close to production workspace and engine types.
- Make cross-doc operations return typed results with user-facing error codes.

## MRR-DD-003: Native File IO Is A Trust Boundary But Looks Like A Utility

Severity: M1

Likely hard-to-maintain path:

- `read_file_bytes` and `write_file_bytes` accept raw paths and base64 data.
- TypeScript wrapper exposes these as simple read/write helpers.

Why this becomes painful in 6 months:

- New file features may reuse raw IO without policy checks.
- Memory usage doubles or triples through base64 when images are large.
- Security and UX failure modes become mixed together.

Recommended direction:

- Introduce a native IO policy layer with allowed operations, size limits, and error mapping.
- Prefer streaming or Tauri/plugin-native paths for large assets when needed.
- Keep save/export behavior tied to lifecycle docs.

## MRR-DD-004: Browser E2E Can Become A False Sense Of Coverage

Severity: M2

Likely hard-to-maintain path:

- E2E simulates drag events in the browser and includes at least one placeholder assertion for file cascade behavior.

Why this becomes painful in 6 months:

- Tests can stay green while native behavior regresses.
- The team may believe file drop is covered when only helper logic is covered.

Recommended direction:

- Label browser-only coverage explicitly.
- Add a Tauri runtime verification checklist for native drop and file dialogs.
- Replace placeholder assertions with direct assertions against a real app state or remove them.

