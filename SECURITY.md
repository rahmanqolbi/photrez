# Security Policy

## Supported Scope

Security reports are accepted for:

- Desktop shell boundary (`Tauri` command bridge and file I/O boundaries).
- Core parsing/import/export paths.
- Dependency and supply-chain concerns.

## Reporting a Vulnerability

Please report vulnerabilities privately before public disclosure.

- Include reproduction steps.
- Include affected version/commit.
- Include impact assessment if known.

Response target:

- Initial acknowledgment: within 72 hours.
- Triage and severity classification: as soon as reproducible.
- Fix timeline: based on severity and release risk.

## Handling Guidelines

- Treat imported files as untrusted input.
- Prefer fail-closed behavior for parser and decode errors.
- Do not include exploit details in public issues before patch release.
