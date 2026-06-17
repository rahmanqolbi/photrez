# Review Checklists

Use these checklists during planning and code review.

## Ponytail Refactor Checklist

- [ ] What code does this delete?
- [ ] What file becomes smaller?
- [ ] What concept becomes unnecessary?
- [ ] Does an existing helper already solve this?
- [ ] Is this a real ownership boundary or just a neat abstraction?
- [ ] Can this be one function instead of a service?
- [ ] Is the new type narrower than the old context/object?
- [ ] Is there a production wiring test?
- [ ] Is there a rollback path?

## New Module Checklist

- [ ] Module name describes product responsibility.
- [ ] Module has one owner.
- [ ] Module input/output is typed.
- [ ] Module does not import broad editor context unless it is a provider/facade.
- [ ] Module removes duplicate logic.
- [ ] Module has at least one focused test.

Reject names like:

- `utils`
- `manager`
- `service`
- `core`
- `helpers`

Unless the responsibility is made specific, such as `textureRegistry` or `layerCommands`.

## Tool Handler Checklist

- [ ] Tool has explicit `idle` state.
- [ ] Tool has begin/update/end/cancel behavior.
- [ ] Tool cancels on tool switch.
- [ ] Tool cancels on pointer capture loss.
- [ ] Tool does not mutate engine without command/history policy.
- [ ] Tool has real pointer-chain integration test.
- [ ] Tool has keyboard modifier tests if modifiers affect behavior.

## Command Checklist

- [ ] Command validates target existence.
- [ ] Command validates layer locks if layer-related.
- [ ] Command declares history policy.
- [ ] Command commits history before mutation when needed.
- [ ] Command requests render if pixels/visible state change.
- [ ] Command returns typed success/error.
- [ ] Command has success and failure tests.

## Context Checklist

- [ ] Component reads only the context it needs.
- [ ] Missing provider fails loudly.
- [ ] Tests use typed fixture.
- [ ] No production fallback object hides missing provider.
- [ ] No new broad `as any`.

## Native IO Checklist

- [ ] Operation goes through policy wrapper.
- [ ] File type is validated where relevant.
- [ ] Size limit exists for base64 transfer.
- [ ] Error maps to user-safe code/message.
- [ ] Native behavior is verified in Tauri runtime if browser cannot prove it.

## Renderer Checklist

- [ ] Texture upload/destroy lifecycle is explicit.
- [ ] Resize path is tested.
- [ ] Export parity case exists if rendering semantics changed.
- [ ] `preserveDrawingBuffer` dependency is documented.
- [ ] No new renderer abstraction exists without a second real consumer.

## Test Checklist

- [ ] Unit tests cover pure logic.
- [ ] Wiring tests mount the production entry point.
- [ ] Tests avoid broad `as any` unless platform interop requires it.
- [ ] Placeholder assertions are not counted as coverage.
- [ ] Native-only behavior is not claimed by browser-only tests.

## Documentation Checklist

- [ ] `AI_CURRENT_TASK.md` updated before implementation.
- [ ] `AI_HISTORY.md` appended after completion.
- [ ] `FEATURES.md` updated when status changes.
- [ ] Decision log updated when a new rule is locked.
- [ ] Relevant risk/doc register is cross-linked.

