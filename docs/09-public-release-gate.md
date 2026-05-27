# 09 - Public Release Gate

This file defines mandatory checks before the first public repository publish.

## Name Lock Gate

Before first public publish, the project must lock:

- Final product name.
- Final subtitle/tagline.
- Public repository slug.

The working name (`Photrez`) remains valid until this gate is explicitly closed.

## Brand and Identity Checks

- Basic uniqueness search for final name in software category.
- Domain availability check for primary and fallback domains.
- Social handle availability check for primary channels.
- Confirm no direct confusion with Adobe/Photoshop naming.

## Documentation Sync Gate

After final name is locked:

- Update all docs in `docs/` to the final name.
- Update README headline and short description.
- Update any placeholder extension names if finalized.

## Legal and Policy Gate

- Confirm license statement and files are present and consistent:
`LICENSE`, `NOTICE`.
- Confirm trademark/brand policy document exists before public release (`TRADEMARKS.md`).
- Confirm contributor policy baseline is prepared:
`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- Confirm project governance baseline exists (`GOVERNANCE.md`).
- Confirm plugin policy baseline exists (`docs/plugin-policy.md`).

## Technical Gate

- Planning documents up to `03-trd.md` are internally approved.
- Milestone 1 execution checklist exists and is accepted.
- Initial architecture ADR exists (`0001` minimum).
- Agent execution docs exist and are aligned:
`AGENTS.md`, `docs/10-ai-execution-playbook.md`.
- Testing baseline policy exists (`docs/testing-policy.md`).
- Performance protocol exists and evidence is complete:
`docs/16-performance-measurement-protocol.md`.

## Exit Criteria

Public publish is allowed only when all gates above are checked complete.
